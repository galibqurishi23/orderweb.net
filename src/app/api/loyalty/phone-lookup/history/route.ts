// Loyalty Transaction History API
// Get transaction history for a phone number

import { NextRequest, NextResponse } from 'next/server';
import PhoneLoyaltyService from '../../../../../lib/phone-loyalty-service';

/**
 * Get Loyalty Transaction History
 * GET /api/loyalty/phone-lookup/history?phone=07890123456&tenantId=xxx&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const tenantId = searchParams.get('tenantId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!phone || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and tenant ID are required'
      }, { status: 400 });
    }

    console.log(`📜 Getting transaction history for phone: ${phone}`);

    // Get transaction history
    const transactions = await PhoneLoyaltyService.getTransactionHistory(
      phone, 
      tenantId, 
      limit
    );

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get transaction history'
    }, { status: 500 });
  }
}
