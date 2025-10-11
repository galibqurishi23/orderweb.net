import { NextRequest, NextResponse } from 'next/server';
import PhoneLoyaltyService from '@/lib/phone-loyalty-service';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * Get current customer's loyalty data
 * GET /api/customer/loyalty
 */
export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    // Get customer data including phone number
    const [customerResult] = await db.execute(
      'SELECT phone, name, email FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    const customer = (customerResult as any[])[0];
    if (!customer || !customer.phone) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found or no phone number registered',
        needsPhone: !customer?.phone
      }, { status: 404 });
    }

    // Get loyalty data by phone
    const loyaltyCustomer = await PhoneLoyaltyService.lookupByPhone(customer.phone, tenantId);

    if (!loyaltyCustomer) {
      // Customer exists but not in loyalty program
      return NextResponse.json({
        success: false,
        error: 'Not enrolled in loyalty program',
        canJoin: true,
        phone: customer.phone,
        customerName: customer.name
      }, { status: 404 });
    }

    // Get recent transaction history
    const recentTransactions = await PhoneLoyaltyService.getTransactionHistory(
      customer.phone,
      tenantId,
      10
    );

    // Get loyalty program settings
    const loyaltySettings = await PhoneLoyaltyService.getLoyaltySettings(tenantId);

    return NextResponse.json({
      success: true,
      loyalty: {
        phone: loyaltyCustomer.phone,
        displayPhone: loyaltyCustomer.displayPhone,
        loyaltyCardNumber: loyaltyCustomer.loyaltyCardNumber,
        pointsBalance: loyaltyCustomer.pointsBalance,
        totalPointsEarned: loyaltyCustomer.totalPointsEarned,
        totalPointsRedeemed: loyaltyCustomer.totalPointsRedeemed,
        tierLevel: loyaltyCustomer.tierLevel,
        nextTierPoints: loyaltyCustomer.nextTierPoints,
        totalOrders: loyaltyCustomer.totalOrders,
        totalSpent: loyaltyCustomer.totalSpent,
        joinedDate: loyaltyCustomer.joinedDate,
        lastOrderDate: loyaltyCustomer.lastOrderDate
      },
      recentTransactions,
      settings: loyaltySettings
    });

  } catch (error) {
    console.error('Error fetching customer loyalty data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loyalty data'
    }, { status: 500 });
  }
}

/**
 * Join loyalty program
 * POST /api/customer/loyalty
 */
export async function POST(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    // Get customer data
    const [customerResult] = await db.execute(
      'SELECT phone, name, email FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    const customer = (customerResult as any[])[0];
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    if (!customer.phone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number required to join loyalty program',
        needsPhone: true
      }, { status: 400 });
    }

    // Check if already enrolled
    const existingLoyalty = await PhoneLoyaltyService.lookupByPhone(customer.phone, tenantId);
    if (existingLoyalty) {
      return NextResponse.json({
        success: false,
        error: 'Already enrolled in loyalty program',
        loyalty: existingLoyalty
      }, { status: 409 });
    }

    // Create loyalty membership
    const newLoyaltyCustomer = await PhoneLoyaltyService.createLoyaltyMember(
      customer.phone,
      tenantId,
      customer.name,
      customerId
    );

    if (!newLoyaltyCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Failed to join loyalty program'
      }, { status: 500 });
    }

    console.log(`🎉 Customer ${customer.name} joined loyalty program with card: ${newLoyaltyCustomer.loyaltyCardNumber}`);

    return NextResponse.json({
      success: true,
      message: `Welcome to our loyalty program! You've earned ${newLoyaltyCustomer.pointsBalance} welcome bonus points.`,
      loyalty: newLoyaltyCustomer
    }, { status: 201 });

  } catch (error) {
    console.error('Error joining loyalty program:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join loyalty program'
    }, { status: 500 });
  }
}
