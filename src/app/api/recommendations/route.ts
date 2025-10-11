import { AIRecommendationService } from '@/lib/ai-recommendation-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      customerId, 
      tenantId, 
      currentCartItems = [], 
      maxRecommendations = 5 
    } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await AIRecommendationService.getPersonalizedRecommendations(
      customerId,
      tenantId,
      currentCartItems,
      maxRecommendations
    );

    return NextResponse.json({
      success: true,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('Get recommendations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
