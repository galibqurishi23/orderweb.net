import { NextRequest, NextResponse } from 'next/server';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';

/**
 * Kitchen Display Stats API
 * GET: Get statistics for kitchen displays
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantId } = await params;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const stats = await KitchenDisplayService.getDisplayStats(tenantId);
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching kitchen display stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen display stats' },
      { status: 500 }
    );
  }
}
