import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { broadcastLoyaltyUpdate } from '@/lib/websocket-broadcaster';
import PhoneLoyaltyService from '@/lib/phone-loyalty-service';

/**
 * FRESH LOYALTY REDEMPTION API
 * This endpoint handles customer loyalty point redemption with proper authentication
 * and prevents logout/stuck issues by maintaining session integrity.
 */

interface RedemptionValidation {
  isValid: boolean;
  error?: string;
  discountAmount?: number;
  remainingBalance?: number;
}

// Validate redemption request
async function validateRedemption(
  customerId: string,
  tenantId: string,
  pointsToRedeem: number,
  orderTotal: number
): Promise<RedemptionValidation> {
  try {
    // 1. Get current loyalty balance
    const [balanceRows] = await db.execute(`
      SELECT points_balance, total_points_redeemed
      FROM customer_loyalty_points
      WHERE customer_id = ? AND tenant_id = ?
    `, [customerId, tenantId]);

    const balanceData = (balanceRows as any[])[0];
    
    if (!balanceData) {
      return {
        isValid: false,
        error: 'Loyalty account not found. Please contact support.'
      };
    }

    const currentBalance = balanceData.points_balance || 0;

    // 2. Get loyalty settings
    const [settingsRows] = await db.execute(`
      SELECT 
        redemption_minimum,
        redemption_increment,
        point_value_pounds,
        max_redeem_per_order_percent
      FROM loyalty_settings
      WHERE tenant_id = ?
    `, [tenantId]);

    const settings = (settingsRows as any[])[0];
    const minPoints = settings?.redemption_minimum || 100;
    const increment = settings?.redemption_increment || 50;
    const pointValue = settings?.point_value_pounds || 0.01;
    const maxPercent = settings?.max_redeem_per_order_percent || 50;

    // 3. Validate points amount
    if (pointsToRedeem < minPoints) {
      return {
        isValid: false,
        error: `Minimum redemption is ${minPoints} points`
      };
    }

    if (pointsToRedeem % increment !== 0) {
      return {
        isValid: false,
        error: `Points must be in multiples of ${increment}`
      };
    }

    if (pointsToRedeem > currentBalance) {
      return {
        isValid: false,
        error: `Insufficient balance. You have ${currentBalance} points available.`
      };
    }

    // 4. Calculate discount
    const discountAmount = parseFloat((pointsToRedeem * pointValue).toFixed(2));
    const maxDiscount = parseFloat((orderTotal * (maxPercent / 100)).toFixed(2));

    if (discountAmount > maxDiscount) {
      return {
        isValid: false,
        error: `Maximum discount is ${maxPercent}% of order (£${maxDiscount})`
      };
    }

    if (discountAmount > orderTotal) {
      return {
        isValid: false,
        error: `Discount cannot exceed order total`
      };
    }

    return {
      isValid: true,
      discountAmount,
      remainingBalance: currentBalance - pointsToRedeem
    };

  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      error: 'System error during validation'
    };
  }
}

/**
 * POST: Validate redemption (preview mode - no actual deduction)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate customer
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    let decoded: any;
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key';
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session. Please login again.'
      }, { status: 401 });
    }

    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    // 2. Parse request
    const body = await request.json();
    const { pointsToRedeem, orderTotal } = body;

    if (!pointsToRedeem || !orderTotal) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // 3. Validate redemption
    const validation = await validateRedemption(
      customerId,
      tenantId,
      parseInt(pointsToRedeem),
      parseFloat(orderTotal)
    );

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    // 4. Return preview (no deduction yet)
    return NextResponse.json({
      success: true,
      redemption: {
        pointsToRedeem: parseInt(pointsToRedeem),
        discountAmount: validation.discountAmount!.toFixed(2),
        finalOrderTotal: (parseFloat(orderTotal) - validation.discountAmount!).toFixed(2),
        remainingBalance: validation.remainingBalance
      }
    });

  } catch (error) {
    console.error('❌ Redemption preview error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unable to process request'
    }, { status: 500 });
  }
}

/**
 * PUT: Execute redemption (actual point deduction after order placed)
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Authenticate customer
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    let decoded: any;
    try {
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key';
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }

    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    // 2. Parse request
    const body = await request.json();
    const { pointsToRedeem, orderId, orderNumber, discountAmount } = body;

    if (!pointsToRedeem || !orderId || !discountAmount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    try {
      // 3. Get customer phone for redemption
      const [customerRows] = await db.execute(`
        SELECT c.phone, c.name
        FROM customers c
        WHERE c.id = ? AND c.tenant_id = ?
      `, [customerId, tenantId]);

      const customer = (customerRows as any[])[0];
      
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.phone) {
        throw new Error('Customer must have a phone number to use loyalty program');
      }

      // 4. Use PhoneLoyaltyService to redeem points (handles all database operations)
      const redemptionResult = await PhoneLoyaltyService.redeemPoints(
        customer.phone,
        tenantId,
        pointsToRedeem,
        `Redeemed for order #${orderNumber || orderId}`,
        orderId
      );

      if (!redemptionResult.success) {
        throw new Error(redemptionResult.message);
      }

      const newBalance = redemptionResult.newBalance || 0;

      console.log(`✅ Redemption successful: ${pointsToRedeem} points redeemed for customer ${customerId}`);

      // 5. Get updated loyalty data for broadcast
      const loyaltyData = await PhoneLoyaltyService.lookupByPhone(customer.phone, tenantId);

      // 6. Broadcast loyalty update to all connected clients (live sync)
      await broadcastLoyaltyUpdate(tenantId, {
        customerId: customerId,
        customerPhone: customer.phone,
        customerName: customer.name,
        pointsChange: -pointsToRedeem,
        newBalance: newBalance,
        totalPointsEarned: loyaltyData?.totalPointsEarned || 0,
        totalPointsRedeemed: loyaltyData?.totalPointsRedeemed || 0,
        transactionType: 'redeem',
        reason: `Redeemed for order #${orderNumber || orderId}`,
        orderId: orderId,
        discountAmount: parseFloat(discountAmount)
      });

      return NextResponse.json({
        success: true,
        data: {
          pointsRedeemed: pointsToRedeem,
          discountApplied: parseFloat(discountAmount),
          newBalance: newBalance,
          orderId: orderId
        }
      });

    } catch (txError) {
      throw txError;
    }

  } catch (error: any) {
    console.error('❌ Redemption execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to redeem points'
    }, { status: 500 });
  }
}
