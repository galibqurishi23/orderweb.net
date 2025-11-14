import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Loyalty Lookup API - Quick customer loyalty balance check for POS
 * Similar to gift card balance lookup
 * GET /api/pos/loyalty-lookup?tenant=kitchen&phone=07306506797
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    const phone = searchParams.get('phone');
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    
    if (!tenantSlug || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant or phone parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Loyalty Lookup API called:', { tenantSlug, phone });
    
    // Normalize phone number - handle both UK formats
    // +447306506797 -> 07306506797
    // 07306506797 -> 07306506797
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('+44')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    }
    
    // Also try with +44 prefix for database search
    const phoneWithPrefix = normalizedPhone.startsWith('0') 
      ? '+44' + normalizedPhone.substring(1) 
      : '+44' + normalizedPhone;
    
    console.log('📞 Phone normalization:', { 
      original: phone, 
      normalized: normalizedPhone, 
      withPrefix: phoneWithPrefix 
    });
    
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

    // Get customer loyalty data - search both phone formats
    const [loyaltyRows] = await db.execute(
      `SELECT 
        clp.customer_id,
        clp.points_balance,
        clp.total_points_earned,
        clp.total_points_redeemed,
        clp.created_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM customer_loyalty_points clp
      LEFT JOIN customers c ON clp.customer_id = c.id
      WHERE (c.phone = ? OR c.phone = ?)
      AND clp.tenant_id = ?
      LIMIT 1`,
      [normalizedPhone, phoneWithPrefix, tenant.id]
    );

    if (!Array.isArray(loyaltyRows) || loyaltyRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found or no loyalty account',
        customer_exists: false
      }, { status: 404 });
    }

    const loyalty = loyaltyRows[0] as any;

    // Get last transaction date from transactions table (source of truth)
    const [lastTransRows] = await db.execute(
      `SELECT MAX(created_at) as last_transaction_date
      FROM loyalty_transactions
      WHERE customer_id = ? 
      AND tenant_id = ?`,
      [loyalty.customer_id, tenant.id]
    );
    
    const lastTransactionDate = (lastTransRows as any[])[0]?.last_transaction_date || null;

    // Get loyalty settings to calculate redemption value
    const [settingsRows] = await db.execute(
      `SELECT 
        earn_rate_value as points_per_pound,
        point_value_pounds as redemption_rate,
        redemption_minimum,
        redemption_increment,
        is_active as enabled
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

    // Calculate how much money the points are worth
    const pointsBalance = loyalty.points_balance || 0;
    const moneyValue = pointsBalance * settings.redemption_rate;
    const canRedeem = pointsBalance >= settings.redemption_minimum;

    // Get recent transactions (last 5)
    const [recentTransactions] = await db.execute(
      `SELECT 
        transaction_type,
        points_amount,
        order_id,
        description as reason,
        created_at
      FROM loyalty_transactions
      WHERE customer_id = ? 
      AND tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 5`,
      [loyalty.customer_id, tenant.id]
    );

    console.log(`✅ Loyalty lookup successful: ${phone} has ${pointsBalance} points (£${moneyValue.toFixed(2)})`);

    return NextResponse.json({
      success: true,
      customer_exists: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      customer: {
        id: loyalty.customer_id,
        name: loyalty.customer_name,
        email: loyalty.customer_email,
        phone: loyalty.customer_phone
      },
      loyalty: {
        points_balance: pointsBalance,
        money_value: parseFloat(moneyValue.toFixed(2)),
        can_redeem: canRedeem,
        total_earned: loyalty.total_points_earned || 0,
        total_redeemed: loyalty.total_points_redeemed || 0,
        last_transaction: lastTransactionDate,
        member_since: loyalty.created_at
      },
      settings: {
        points_per_pound: settings.points_per_pound,
        redemption_rate: settings.redemption_rate,
        minimum_redeem: settings.redemption_minimum,
        increment: settings.redemption_increment,
        enabled: settings.enabled
      },
      recent_transactions: recentTransactions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Loyalty Lookup API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to lookup loyalty balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
