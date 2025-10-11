import { NextRequest, NextResponse } from 'next/server';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';

/**
 * Kitchen Display Orders API
 * GET: Get orders for specific display
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; displayId: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantId, displayId } = params;
    
    if (!tenantId || !displayId) {
      return NextResponse.json(
        { error: 'Tenant ID and Display ID are required' },
        { status: 400 }
      );
    }

    const orders = await KitchenDisplayService.getDisplayOrders(displayId, tenantId);
    
    return NextResponse.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Error fetching display orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch display orders' },
      { status: 500 }
    );
  }
}
