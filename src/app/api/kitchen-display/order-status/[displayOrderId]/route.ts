import { NextRequest, NextResponse } from 'next/server';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';
import { WebSocketService } from '@/lib/websocket-service';

/**
 * Kitchen Display Order Status API
 * PUT: Update order status on display
 */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; displayOrderId: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantId, displayOrderId } = params;
    const body = await request.json();
    
    if (!tenantId || !displayOrderId) {
      return NextResponse.json(
        { error: 'Tenant ID and Display Order ID are required' },
        { status: 400 }
      );
    }

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['new', 'preparing', 'ready', 'completed'] as const;
    if (!validStatuses.includes(body.status as any)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    await KitchenDisplayService.updateOrderStatus(
      displayOrderId,
      tenantId,
      body.status as 'new' | 'preparing' | 'ready' | 'completed',
      body.userId
    );

    // Broadcast update to all connected displays
    WebSocketService.broadcastToTenant(tenantId, 'order-status-updated', {
      displayOrderId,
      newStatus: body.status,
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
