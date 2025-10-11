import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Get Loyalty Program Settings for Admin
 * GET /api/admin/loyalty/settings
 */
export async function GET(request: NextRequest) {
  try {
    // Get admin session from cookie
    const sessionCookie = request.cookies.get('admin-session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const tenantId = sessionData.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get loyalty program settings
    const [settingsResult] = await db.execute(`
      SELECT 
        ls.*,
        t.name as restaurant_name,
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ts.settings_json, '$.currency')), 'GBP') as currency
      FROM loyalty_settings ls
      LEFT JOIN tenants t ON ls.tenant_id = t.id
      LEFT JOIN tenant_settings ts ON t.id = ts.tenant_id
      WHERE ls.tenant_id = ?
    `, [tenantId]);

    const settings = (settingsResult as any[])[0];

    if (!settings) {
      // Create default settings if none exist
      await db.execute(`
        INSERT INTO loyalty_settings (
          tenant_id, program_name, is_active, earn_rate_type, earn_rate_value,
          min_order_for_points, points_expire_days, welcome_bonus_points,
          birthday_bonus_points, redemption_minimum, point_value_pounds
        ) VALUES (?, 'Loyalty Program', 1, 'percentage', 1.00, 5.00, 365, 100, 200, 100, 0.01)
      `, [tenantId]);

      // Get the newly created settings
      const [newSettingsResult] = await db.execute(`
        SELECT 
          ls.*,
          t.name as restaurant_name,
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ts.settings_json, '$.currency')), 'GBP') as currency
        FROM loyalty_settings ls
        LEFT JOIN tenants t ON ls.tenant_id = t.id
        LEFT JOIN tenant_settings ts ON t.id = ts.tenant_id
        WHERE ls.tenant_id = ?
      `, [tenantId]);

      return NextResponse.json({
        success: true,
        settings: (newSettingsResult as any[])[0]
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loyalty settings'
    }, { status: 500 });
  }
}

/**
 * Update Loyalty Program Settings
 * PUT /api/admin/loyalty/settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Get admin session from cookie
    const sessionCookie = request.cookies.get('admin-session')?.value;
    
    console.log('🔍 PUT loyalty settings - checking authentication');
    console.log('Session cookie exists:', !!sessionCookie);
    
    if (!sessionCookie) {
      console.log('❌ No admin-session cookie found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
      console.log('✅ Session parsed successfully, tenantId:', sessionData.tenantId);
    } catch (error) {
      console.log('❌ Failed to parse session cookie:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const tenantId = sessionData.tenantId;

    if (!tenantId) {
      console.log('❌ No tenantId in session');
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      programName,
      isActive,
      earnRateType,
      earnRateValue,
      minOrderForPoints,
      pointsExpireDays,
      silverMinPoints,
      goldMinPoints,
      platinumMinPoints,
      diamondMinPoints,
      welcomeBonusPoints,
      birthdayBonusPoints,
      referralBonusPoints,
      redemptionMinimum,
      redemptionIncrement,
      pointValuePounds,
      maxRedeemPerOrderPercent
    } = body;

    // Validate required fields
    if (!programName || earnRateValue === undefined || minOrderForPoints === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Program name, earn rate value, and minimum order amount are required'
      }, { status: 400 });
    }

    // Update loyalty settings
    await db.execute(`
      UPDATE loyalty_settings SET
        program_name = ?,
        is_active = ?,
        earn_rate_type = ?,
        earn_rate_value = ?,
        min_order_for_points = ?,
        points_expire_days = ?,
        silver_min_points = ?,
        gold_min_points = ?,
        platinum_min_points = ?,
        diamond_min_points = ?,
        welcome_bonus_points = ?,
        birthday_bonus_points = ?,
        referral_bonus_points = ?,
        redemption_minimum = ?,
        redemption_increment = ?,
        point_value_pounds = ?,
        max_redeem_per_order_percent = ?,
        updated_at = NOW()
      WHERE tenant_id = ?
    `, [
      programName,
      isActive ? 1 : 0,
      earnRateType,
      parseFloat(earnRateValue),
      parseFloat(minOrderForPoints),
      parseInt(pointsExpireDays) || 365,
      parseInt(silverMinPoints) || 500,
      parseInt(goldMinPoints) || 1500,
      parseInt(platinumMinPoints) || 3000,
      parseInt(diamondMinPoints) || 5000,
      parseInt(welcomeBonusPoints) || 100,
      parseInt(birthdayBonusPoints) || 200,
      parseInt(referralBonusPoints) || 300,
      parseInt(redemptionMinimum) || 100,
      parseInt(redemptionIncrement) || 50,
      parseFloat(pointValuePounds) || 0.01,
      parseInt(maxRedeemPerOrderPercent) || 50,
      tenantId
    ]);

    console.log(`✅ Updated loyalty settings for tenant: ${tenantId}`);

    // Return updated settings
    const [updatedSettings] = await db.execute(`
      SELECT 
        ls.*,
        t.name as restaurant_name,
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ts.settings_json, '$.currency')), 'GBP') as currency
      FROM loyalty_settings ls
      LEFT JOIN tenants t ON ls.tenant_id = t.id
      LEFT JOIN tenant_settings ts ON t.id = ts.tenant_id
      WHERE ls.tenant_id = ?
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      message: 'Loyalty program settings updated successfully',
      settings: (updatedSettings as any[])[0]
    });

  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update loyalty settings'
    }, { status: 500 });
  }
}
