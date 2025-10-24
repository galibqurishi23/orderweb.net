import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    const body = await request.json();
    const { pointsToRedeem, orderTotal } = body;

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid points amount'
      }, { status: 400 });
    }

    if (!orderTotal || orderTotal <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid order total'
      }, { status: 400 });
    }

    // Get customer's current loyalty balance using the correct table structure
    const [loyaltyResult] = await db.execute(`
      SELECT clp.points_balance 
      FROM customer_loyalty_points clp
      JOIN loyalty_phone_lookup lpl ON clp.customer_id = lpl.customer_id
      WHERE lpl.customer_id = ? AND clp.tenant_id = ?
    `, [customerId, tenantId]);

    const loyaltyData = (loyaltyResult as any[])[0];
    
    if (!loyaltyData) {
      return NextResponse.json({
        success: false,
        error: 'Loyalty account not found'
      }, { status: 404 });
    }

    const currentBalance = loyaltyData.points_balance;

    // Get loyalty settings for validation rules
    const [settingsResult] = await db.execute(`
      SELECT 
        redemption_minimum,
        redemption_increment,
        point_value_pounds,
        max_redeem_per_order_percent
      FROM loyalty_settings 
      WHERE tenant_id = ?
    `, [tenantId]);

    const settings = (settingsResult as any[])[0];
    
    // Use settings or fallback to defaults
    const minRedemption = settings?.redemption_minimum || 100;
    const redemptionIncrement = settings?.redemption_increment || 50;
    const pointValue = settings?.point_value_pounds || 0.01;
    const maxRedemptionPercent = settings?.max_redeem_per_order_percent || 50;

    if (pointsToRedeem < minRedemption) {
      return NextResponse.json({
        success: false,
        error: `Minimum redemption is ${minRedemption} points (£${(minRedemption * pointValue).toFixed(2)})`
      }, { status: 400 });
    }

    if (pointsToRedeem % redemptionIncrement !== 0) {
      return NextResponse.json({
        success: false,
        error: `Points must be redeemed in multiples of ${redemptionIncrement}`
      }, { status: 400 });
    }

    if (pointsToRedeem > currentBalance) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient points balance'
      }, { status: 400 });
    }

    const discountAmount = pointsToRedeem * pointValue;
    const maxDiscount = orderTotal * (maxRedemptionPercent / 100);

    if (discountAmount > maxDiscount) {
      return NextResponse.json({
        success: false,
        error: `Maximum discount allowed is ${maxRedemptionPercent}% of order total (£${maxDiscount.toFixed(2)})`
      }, { status: 400 });
    }

    // Calculate final totals
    const finalOrderTotal = Math.max(0, orderTotal - discountAmount);

    return NextResponse.json({
      success: true,
      redemption: {
        pointsToRedeem,
        discountAmount: discountAmount.toFixed(2),
        finalOrderTotal: finalOrderTotal.toFixed(2),
        remainingBalance: currentBalance - pointsToRedeem
      }
    });

  } catch (error) {
    console.error('❌ Error validating point redemption:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate point redemption'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    const body = await request.json();
    const { pointsToRedeem, orderId, orderNumber } = body;

    if (!pointsToRedeem || !orderId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Get customer phone number for loyalty lookup
    const [customerResult] = await db.execute(`
      SELECT phone FROM customers WHERE id = ? AND tenant_id = ?
    `, [customerId, tenantId]);

    const customer = (customerResult as any[])[0];
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // Deduct points from loyalty balance using the phone loyalty service
    const { PhoneLoyaltyService } = require('@/lib/phone-loyalty-service');
    
    const redemptionResult = await PhoneLoyaltyService.redeemPoints(
      customer.phone,
      tenantId,
      pointsToRedeem,
      `Points redeemed for order ${orderNumber || orderId}`,
      orderId
    );

    if (!redemptionResult.success) {
      return NextResponse.json({
        success: false,
        error: redemptionResult.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Points redeemed successfully'
    });

  } catch (error) {
    console.error('❌ Error processing point redemption:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process point redemption'
    }, { status: 500 });
  }
}
