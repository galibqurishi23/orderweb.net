import { AIRecommendationService } from '@/lib/ai-recommendation-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const dateRange = parseInt(searchParams.get('dateRange') || '30');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const analytics = await AIRecommendationService.getRecommendationAnalytics(
      tenantId,
      dateRange
    );

    return NextResponse.json({
      success: true,
      analytics: analytics
    });

  } catch (error) {
    console.error('Get recommendation analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
