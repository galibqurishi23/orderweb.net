import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const { orderId } = await params;

    try {
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // First, delete related order items (using camelCase column name)
        await db.execute(
            'DELETE FROM order_items WHERE orderId = ?',
            [orderId]
        );

        // Then delete the order
        const [result] = await db.execute(
            'DELETE FROM orders WHERE id = ? AND tenant_id = ?',
            [orderId, tenantId]
        );

        if ((result as any).affectedRows === 0) {
            return NextResponse.json({ error: 'Order not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            orderId: orderId,
            tenantId: tenantId
        });
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
