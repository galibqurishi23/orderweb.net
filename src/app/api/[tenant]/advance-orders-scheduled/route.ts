import { NextRequest, NextResponse } from 'next/server';
import { AdvancedOrderSchedulerService } from '@/lib/advance-order-scheduler';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    
    // Get advance orders with their schedules
    const ordersWithSchedules = await AdvancedOrderSchedulerService.getAdvanceOrdersWithSchedules(tenant);
    
    return NextResponse.json(ordersWithSchedules);
    
  } catch (error) {
    console.error('Error getting advance orders with schedules:', error);
    return NextResponse.json({ error: 'Failed to load advance orders' }, { status: 500 });
  }
}
