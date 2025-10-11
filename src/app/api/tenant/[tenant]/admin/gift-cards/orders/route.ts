import { NextRequest, NextResponse } from 'next/server';
import { getTenantGiftCardOrders, updateOrderStatus } from '@/lib/gift-card-service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const orders = await getTenantGiftCardOrders(tenant);
        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching gift card orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
