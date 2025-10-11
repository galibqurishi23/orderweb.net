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
    const phone = params.phone;
    const apiKey = request.headers.get('x-api-key');
    const tenantHeader = request.headers.get('x-tenant-id');

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
    const { points, orderId, orderAmount, reason } = body;

    if (!points || points <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid points amount'
      }, { status: 400 });
    }

    // Connect to tenant database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `dinedesk_${tenant}`
    });

    // Start transaction
    await connection.beginTransaction();

    try {
      // Fetch customer with lock
      const [customers] = await connection.execute(`
        SELECT 
          id,
          name,
          phone,
          loyaltyPoints
        FROM customers
        WHERE phone = ?
        FOR UPDATE
      `, [phone]);

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
      const currentPoints = parseInt(customer.loyaltyPoints) || 0;
      const newPoints = currentPoints + points;

      // Update customer loyalty points
      await connection.execute(`
        UPDATE customers
        SET loyaltyPoints = ?,
            updatedAt = NOW()
        WHERE id = ?
      `, [newPoints, customer.id]);

      // Log transaction in pos_loyalty_transactions table
      await connection.execute(`
        INSERT INTO pos_loyalty_transactions 
        (tenant_id, customer_phone, customer_name, transaction_type, points_earned, points_redeemed, order_id, order_amount, reason, created_at)
        VALUES (
          (SELECT id FROM tenants WHERE slug = ? LIMIT 1),
          ?, ?, 'earned', ?, 0, ?, ?, ?, NOW()
        )
      `, [tenant, phone, customer.name, points, orderId || null, orderAmount || null, reason || 'POS purchase']);

      // Commit transaction
      await connection.commit();
      await connection.end();

      // WebSocket broadcast for real-time POS notification
      try {
        await broadcastLoyaltyUpdate(tenant, {
          customerId: customer.id,
          customerPhone: phone,
          pointsChange: points,
          newBalance: newPoints,
          transactionType: 'add',
          reason: reason || 'POS purchase'
        });
        console.log('✅ WebSocket broadcast sent for loyalty points addition:', phone);
      } catch (wsError) {
        console.error('⚠️ Error broadcasting loyalty update via WebSocket:', wsError);
      }

      return NextResponse.json({
        success: true,
        data: {
          phone: phone,
          customerName: customer.name,
          pointsAdded: points,
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
    console.error('Loyalty add points error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add loyalty points'
    }, { status: 500 });
  }
}
