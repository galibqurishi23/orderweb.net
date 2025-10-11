// Phone-based Loyalty API Routes
// Complete API endpoints for phone number-based loyalty operations

import { NextRequest, NextResponse } from 'next/server';
import PhoneLoyaltyService from '../../../../lib/phone-loyalty-service';

/**
 * Phone Lookup - Get customer loyalty profile by phone number
 * GET /api/loyalty/phone-lookup?phone=07890123456&tenantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const tenantId = searchParams.get('tenantId');

    if (!phone || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and tenant ID are required'
      }, { status: 400 });
    }

    console.log(`🔍 Loyalty lookup for phone: ${phone}, tenant: ${tenantId}`);

    // Look up customer by phone
    const customer = await PhoneLoyaltyService.lookupByPhone(phone, tenantId);

    if (!customer) {
      // Check if this phone belongs to an existing customer who hasn't joined loyalty yet
      return NextResponse.json({
        success: false,
        error: 'Phone number not found in loyalty program',
        canJoin: true,
        phone: phone,
        formattedPhone: PhoneLoyaltyService.formatPhoneForDisplay(phone)
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: {
        phone: customer.phone,
        displayPhone: customer.displayPhone,
        loyaltyCardNumber: customer.loyaltyCardNumber,
        customerName: customer.customerName,
        email: customer.email,
        pointsBalance: customer.pointsBalance,
        totalPointsEarned: customer.totalPointsEarned,
        totalPointsRedeemed: customer.totalPointsRedeemed,
        tierLevel: customer.tierLevel,
        nextTierPoints: customer.nextTierPoints,
        isActive: customer.isActive,
        joinedDate: customer.joinedDate,
        lastOrderDate: customer.lastOrderDate,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent
      }
    });

  } catch (error) {
    console.error('Phone lookup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to lookup phone number'
    }, { status: 500 });
  }
}

/**
 * Create New Loyalty Member - Register phone number for loyalty program
 * POST /api/loyalty/phone-lookup
 * Body: { phone: string, tenantId: string, customerName?: string, customerId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, tenantId, customerName, customerId } = body;

    if (!phone || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and tenant ID are required'
      }, { status: 400 });
    }

    console.log(`🆕 Creating new loyalty member: ${phone} for tenant: ${tenantId}`);

    // Check if phone already exists
    const existingCustomer = await PhoneLoyaltyService.lookupByPhone(phone, tenantId);
    if (existingCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Phone number already registered in loyalty program',
        customer: existingCustomer
      }, { status: 409 });
    }

    // Create new loyalty member
    const newCustomer = await PhoneLoyaltyService.createLoyaltyMember(
      phone,
      tenantId,
      customerName || 'Loyalty Member',
      customerId
    );

    if (!newCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create loyalty member'
      }, { status: 500 });
    }

    console.log(`✅ Created loyalty member: ${newCustomer.loyaltyCardNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Welcome to our loyalty program!',
      customer: newCustomer
    }, { status: 201 });

  } catch (error) {
    console.error('Create loyalty member error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create loyalty member'
    }, { status: 500 });
  }
}

/**
 * Add/Redeem Points - Manage loyalty points
 * PUT /api/loyalty/phone-lookup
 * Body: { 
 *   phone: string, 
 *   tenantId: string, 
 *   action: 'add' | 'redeem',
 *   points: number,
 *   reason: string,
 *   orderId?: string,
 *   orderTotal?: number
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, tenantId, action, points, reason, orderId, orderTotal } = body;

    if (!phone || !tenantId || !action || !points || !reason) {
      return NextResponse.json({
        success: false,
        error: 'Phone, tenantId, action, points, and reason are required'
      }, { status: 400 });
    }

    if (action === 'add') {
      const success = await PhoneLoyaltyService.addPoints(
        phone,
        tenantId,
        points,
        reason,
        'earn',
        undefined,
        orderId,
        orderTotal
      );

      if (success) {
        const customer = await PhoneLoyaltyService.lookupByPhone(phone, tenantId);
        return NextResponse.json({
          success: true,
          message: `Added ${points} points`,
          customer
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to add points'
        }, { status: 500 });
      }

    } else if (action === 'redeem') {
      const result = await PhoneLoyaltyService.redeemPoints(
        phone,
        tenantId,
        points,
        reason,
        orderId
      );

      if (result.success) {
        const customer = await PhoneLoyaltyService.lookupByPhone(phone, tenantId);
        return NextResponse.json({
          success: true,
          message: result.message,
          customer
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.message
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "add" or "redeem"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Points management error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to manage points'
    }, { status: 500 });
  }
}
