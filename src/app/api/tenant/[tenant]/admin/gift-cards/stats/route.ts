import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;

        // Get gift card statistics
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total_cards,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cards,
                SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) as redeemed_cards,
                SUM(remaining_balance) as total_value,
                SUM(amount) as total_issued_value
            FROM gift_cards 
            WHERE tenant_id = ?
        `, [tenant]) as any;

        // Get order statistics
        const [orderStatsRows] = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(order_amount) as total_revenue,
                SUM(CASE WHEN payment_status = 'completed' THEN order_amount ELSE 0 END) as confirmed_revenue
            FROM gift_card_orders 
            WHERE tenant_id = ?
        `, [tenant]) as any;

        const stats = statsRows[0];
        const orderStats = orderStatsRows[0];

        return NextResponse.json({
            total_cards: stats.total_cards || 0,
            active_cards: stats.active_cards || 0,
            redeemed_cards: stats.redeemed_cards || 0,
            total_value: parseFloat(stats.total_value || 0),
            total_issued_value: parseFloat(stats.total_issued_value || 0),
            total_orders: orderStats.total_orders || 0,
            total_revenue: parseFloat(orderStats.total_revenue || 0),
            confirmed_revenue: parseFloat(orderStats.confirmed_revenue || 0)
        });
    } catch (error) {
        console.error('Error fetching gift card stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
