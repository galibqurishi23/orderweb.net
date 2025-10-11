import { GroupCodeService } from '@/lib/group-code-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const restaurants = await GroupCodeService.getGroupRestaurants(tenantId);

    return NextResponse.json({
      success: true,
      restaurants: restaurants
    });

  } catch (error) {
    console.error('Get group restaurants API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
