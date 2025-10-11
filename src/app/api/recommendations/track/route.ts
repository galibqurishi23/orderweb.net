import { AIRecommendationService } from '@/lib/ai-recommendation-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      customerId, 
      tenantId, 
      recommendedItemId, 
      action 
    } = await request.json();

    if (!tenantId || !recommendedItemId || !action) {
      return NextResponse.json(
        { error: 'Tenant ID, item ID, and action are required' },
        { status: 400 }
      );
    }

    if (!['viewed', 'clicked', 'added', 'dismissed'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: viewed, clicked, added, or dismissed' },
        { status: 400 }
      );
    }

    await AIRecommendationService.trackRecommendationInteraction(
      customerId,
      tenantId,
      recommendedItemId,
      action
    );

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Track recommendation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
