import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { broadcastLoyaltyUpdate } from '@/lib/websocket-broadcaster';

// Helper function to validate API key
async function validateApiKey(tenant: string, apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'dinedesk_db'
    });

    const [rows] = await connection.execute(
      'SELECT id FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenant, apiKey]
    );

    await connection.end();
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string; phone: string } }
) {
  try {
    const tenant = params.tenant;
    const rawPhone = params.phone;
    const apiKey = request.headers.get('x-api-key');
    const tenantHeader = request.headers.get('x-tenant-id');

    // Normalize phone number - handle both UK formats
    let normalizedPhone = rawPhone.trim();
    if (normalizedPhone.startsWith('+44')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    }
    
    const phoneWithPrefix = normalizedPhone.startsWith('0') 
      ? '+44' + normalizedPhone.substring(1) 
      : '+44' + normalizedPhone;
    
    console.log('📞 Redeem points - Phone normalization:', { 
      original: rawPhone, 
      normalized: normalizedPhone, 
      withPrefix: phoneWithPrefix 
    });

    // Validate headers
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing X-API-Key header'
      }, { status: 401 });
    }

    if (tenantHeader !== tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID mismatch'
      }, { status: 403 });
    }

    // Validate API key
    const isValid = await validateApiKey(tenant, apiKey);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { points, orderId, discountAmount, reason } = body;

    if (!points || points <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid points amount'
      }, { status: 400 });
    }

    // Connect to main database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'dinedesk_db'
    });

    // Start transaction
    await connection.beginTransaction();

    try {
      // Get tenant ID
      const [tenantRows] = await connection.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenant]
      );
      
      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({
          success: false,
          error: 'Tenant not found'
        }, { status: 404 });
      }
      
      const tenantId = (tenantRows[0] as any).id;

      // Fetch customer with lock - search both phone formats
      const [customers] = await connection.execute(`
        SELECT 
          id,
          name,
          phone
        FROM customers
        WHERE (phone = ? OR phone = ?)
        AND tenant_id = ?
        FOR UPDATE
      `, [normalizedPhone, phoneWithPrefix, tenantId]);

      const customerArray = customers as any[];
      
      if (customerArray.length === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({
          success: false,
          error: 'Customer not found'
        }, { status: 404 });
      }

      const customer = customerArray[0];

      // Get customer loyalty points
      const [loyaltyRows] = await connection.execute(`
        SELECT points_balance, total_points_earned, total_points_redeemed
        FROM customer_loyalty_points
        WHERE customer_id = ? AND tenant_id = ?
        FOR UPDATE
      `, [customer.id, tenantId]);

      if (!Array.isArray(loyaltyRows) || loyaltyRows.length === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({
          success: false,
          error: 'Customer has no loyalty account'
        }, { status: 404 });
      }

      const loyalty = (loyaltyRows as any[])[0];
      const currentPoints = parseInt(loyalty.points_balance) || 0;
      const totalRedeemed = parseInt(loyalty.total_points_redeemed) || 0;

      // Check if enough points
      if (currentPoints < points) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json({
          success: false,
          error: 'Insufficient loyalty points',
          currentPoints: currentPoints,
          requestedPoints: points
        }, { status: 400 });
      }

      const newPoints = currentPoints - points;
      const newTotalRedeemed = totalRedeemed + points;

      // Calculate discount amount (if not provided)
      let calculatedDiscount = discountAmount;
      if (!calculatedDiscount) {
        // Get redemption rate from settings
        const [settingsRows] = await connection.execute(
          'SELECT redemption_rate FROM loyalty_settings WHERE tenant_id = ? LIMIT 1',
          [tenantId]
        );
        const redemptionRate = (settingsRows as any[])[0]?.redemption_rate || 0.01;
        calculatedDiscount = points * redemptionRate;
      }

      // Update customer loyalty points
      await connection.execute(`
        UPDATE customer_loyalty_points
        SET points_balance = ?,
            total_points_redeemed = ?,
            updated_at = NOW()
        WHERE customer_id = ? AND tenant_id = ?
      `, [newPoints, newTotalRedeemed, customer.id, tenantId]);

      // Log transaction in loyalty_transactions table
      await connection.execute(`
        INSERT INTO loyalty_transactions 
        (customer_id, tenant_id, transaction_type, points_amount, order_id, order_total, description, created_at)
        VALUES (?, ?, 'redeemed', ?, ?, ?, ?, NOW())
      `, [customer.id, tenantId, -points, orderId || null, calculatedDiscount, reason || 'POS redemption']);

      // Commit transaction
      await connection.commit();
      await connection.end();

      // WebSocket broadcast for real-time POS notification
      try {
        await broadcastLoyaltyUpdate(tenant, {
          customerId: customer.id,
          customerPhone: customer.phone,
          customerName: customer.name,
          pointsChange: -points, // Negative for redemption
          newBalance: newPoints,
          totalPointsRedeemed: newTotalRedeemed,
          transactionType: 'redeemed',
          reason: reason || 'POS redemption',
          discountAmount: calculatedDiscount,
          orderId: orderId || null
        });
        console.log('✅ WebSocket broadcast sent for loyalty points redemption:', customer.phone);
      } catch (wsError) {
        console.error('⚠️ Error broadcasting loyalty redemption via WebSocket:', wsError);
      }

      return NextResponse.json({
        success: true,
        data: {
          phone: customer.phone,
          customerName: customer.name,
          pointsRedeemed: points,
          discountAmount: calculatedDiscount,
          previousPoints: currentPoints,
          newPoints: newPoints,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      await connection.rollback();
      await connection.end();
      throw error;
    }

  } catch (error) {
    console.error('Loyalty redeem points error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to redeem loyalty points'
    }, { status: 500 });
  }
}
