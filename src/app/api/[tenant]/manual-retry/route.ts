import { NextRequest, NextResponse } from 'next/server';
import { AdvancedOrderSchedulerService } from '@/lib/advance-order-scheduler';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Attempt manual retry
    const success = await AdvancedOrderSchedulerService.manualRetry(tenant, orderId);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to retry order' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in manual retry:', error);
    return NextResponse.json({ error: 'Failed to retry order' }, { status: 500 });
  }
}
