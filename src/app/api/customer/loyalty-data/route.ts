import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Get customer loyalty data from the database-based loyalty system
 * GET /api/customer/loyalty-data?customerId=123&tenantId=tikka
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const tenantId = url.searchParams.get('tenantId');

    if (!customerId || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing customerId or tenantId'
      }, { status: 400 });
    }

    // Check if customer exists
    const [customerResult] = await db.execute(
      'SELECT id, name, email, phone FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    const customer = (customerResult as any[])[0];
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // Get or create loyalty data
    let [loyaltyResult] = await db.execute(
      'SELECT * FROM customer_loyalty WHERE customer_id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    let loyaltyData = (loyaltyResult as any[])[0];

    // If no loyalty data exists, create it
    if (!loyaltyData) {
      await db.execute(`
        INSERT INTO customer_loyalty (
          customer_id, tenant_id, points_balance, tier_level, 
          total_points_earned, total_points_redeemed, created_at, updated_at
        ) VALUES (?, ?, 0, 'bronze', 0, 0, NOW(), NOW())
      `, [customerId, tenantId]);

      // Fetch the newly created record
      [loyaltyResult] = await db.execute(
        'SELECT * FROM customer_loyalty WHERE customer_id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );
      loyaltyData = (loyaltyResult as any[])[0];
    }

    // Calculate tier thresholds and next tier points
    const tierThresholds = {
      bronze: 0,
      silver: 500,
      gold: 1500,
      platinum: 3000
    };

    const currentTier = loyaltyData.tier_level;
    let nextTierPoints = 0;

    switch (currentTier) {
      case 'bronze':
        nextTierPoints = tierThresholds.silver;
        break;
      case 'silver':
        nextTierPoints = tierThresholds.gold;
        break;
      case 'gold':
        nextTierPoints = tierThresholds.platinum;
        break;
      case 'platinum':
        nextTierPoints = loyaltyData.total_points_earned; // Already at max tier
        break;
    }

    return NextResponse.json({
      success: true,
      loyalty: {
        points_balance: loyaltyData.points_balance,
        tier_level: loyaltyData.tier_level,
        total_points_earned: loyaltyData.total_points_earned,
        total_points_redeemed: loyaltyData.total_points_redeemed,
        next_tier_points: nextTierPoints
      }
    });

  } catch (error) {
    console.error('Error fetching customer loyalty data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loyalty data'
    }, { status: 500 });
  }
}
