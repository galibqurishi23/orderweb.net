import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Pull Loyalty API - Allows POS system to fetch loyalty transactions on demand
 * This matches the gift card and order pull pattern
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    const limit = parseInt(searchParams.get('limit') || '100');
    const since = searchParams.get('since'); // ISO date string
    const phone = searchParams.get('phone'); // Optional: filter by customer phone
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Pull Loyalty API called:', { tenantSlug, limit, since, phone });
    
    // Verify tenant and API key
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenantSlug, apiKey]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tenant or API key' },
        { status: 401 }
      );
    }

    const tenant = tenantRows[0] as any;
    console.log('✅ Tenant verified:', tenant.name);

    // Build query conditions
    let whereConditions = 'WHERE plt.tenant_id = ?';
    let queryParams: any[] = [tenant.id];
    
    // Add time filter if provided
    if (since) {
      whereConditions += ' AND plt.created_at >= ?';
      queryParams.push(since);
    } else {
      // Default to last 7 days if no since parameter
      whereConditions += ' AND plt.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // Add phone filter if provided
    if (phone) {
      whereConditions += ' AND plt.phone = ?';
      queryParams.push(phone);
    }

    // Get loyalty transactions from phone_loyalty_transactions table
    const [transactionRows] = await db.execute(
      `SELECT 
        plt.id,
        plt.phone as customer_phone,
        plt.operation_type as transaction_type,
        plt.points_amount,
        plt.staff_member,
        plt.pos_terminal,
        plt.transaction_reference,
        plt.operation_details,
        plt.created_at,
        clp.points_balance as current_balance,
        clp.total_points_earned,
        clp.total_points_redeemed,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email
      FROM phone_loyalty_transactions plt
      LEFT JOIN customers c ON plt.customer_id = c.id
      LEFT JOIN customer_loyalty_points clp 
        ON plt.customer_id = clp.customer_id 
        AND plt.tenant_id = clp.tenant_id
      ${whereConditions}
      ORDER BY plt.created_at DESC
      LIMIT ?`,
      [...queryParams, limit]
    );

    const transactions = transactionRows as any[];
    console.log(`💎 Found ${transactions.length} loyalty transactions`);

    // Get loyalty settings for context
    const [settingsRows] = await db.execute(
      `SELECT 
        points_per_pound,
        redemption_rate,
        redemption_minimum,
        redemption_increment,
        enabled
      FROM loyalty_settings
      WHERE tenant_id = ?
      LIMIT 1`,
      [tenant.id]
    );

    const settings = (settingsRows as any[])[0] || {
      points_per_pound: 1,
      redemption_rate: 0.01,
      redemption_minimum: 100,
      redemption_increment: 10,
      enabled: true
    };

    // Get unique customer summary
    const uniqueCustomers = [...new Set(transactions.map(t => t.customer_phone))];
    
    // Calculate totals based on operation type
    const totalPointsEarned = transactions.reduce((sum, t) => 
      (t.transaction_type === 'add_points' ? sum + (t.points_amount || 0) : sum), 0);
    const totalPointsRedeemed = transactions.reduce((sum, t) => 
      (t.transaction_type === 'redeem_points' ? sum + (t.points_amount || 0) : sum), 0);
    
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      transactions: transactions,
      summary: {
        total_transactions: transactions.length,
        unique_customers: uniqueCustomers.length,
        total_points_earned: totalPointsEarned,
        total_points_redeemed: totalPointsRedeemed
      },
      settings: settings,
      filters: { since, phone, limit },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Pull Loyalty API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loyalty transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Mark loyalty transactions as synced by POS
 * This allows POS to acknowledge receipt of transactions
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    const body = await request.json();
    const { transaction_ids } = body;

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    if (!transaction_ids || !Array.isArray(transaction_ids)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid transaction_ids array' },
        { status: 400 }
      );
    }

    // Verify tenant and API key
    const [tenantRows] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenantSlug, apiKey]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tenant or API key' },
        { status: 401 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Mark transactions as synced
    const placeholders = transaction_ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE pos_loyalty_transactions 
       SET synced_to_pos = TRUE, 
           synced_at = NOW()
       WHERE id IN (${placeholders}) 
       AND tenant_id = ?`,
      [...transaction_ids, tenant.id]
    );

    console.log(`✅ Marked ${transaction_ids.length} loyalty transactions as synced`);

    return NextResponse.json({
      success: true,
      synced_count: transaction_ids.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Loyalty sync acknowledgment error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to acknowledge loyalty sync'
    }, { status: 500 });
  }
}
