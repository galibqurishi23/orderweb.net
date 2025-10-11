import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    
    // Get failed orders (orders that failed to print after all retry attempts)
    const [rows] = await pool.execute(`
      SELECT 
        o.id,
        o.order_number as orderNumber,
        o.customer_name as customerName,
        o.total,
        o.status,
        aos.retry_count as retryCount,
        aos.last_retry_at as lastRetryAt,
        aos.fire_time as fireTime,
        aos.customer_desired_time as customerDesiredTime
      FROM orders o
      LEFT JOIN advance_order_schedules aos ON o.id = aos.order_id
      WHERE o.tenant_id = ? 
      AND (
        (aos.status = 'FAILED' AND aos.retry_count >= 3) OR
        (o.printed = FALSE AND o.created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
      )
      ORDER BY o.created_at DESC
    `, [tenant]);
    
    const failedOrders = (rows as any[]).map(row => ({
      id: row.id,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      total: row.total,
      status: row.status,
      retryCount: row.retryCount || 0,
      lastRetryAt: row.lastRetryAt ? new Date(row.lastRetryAt) : null,
      fireSchedule: row.fireTime ? {
        fireTime: new Date(row.fireTime),
        customerDesiredTime: new Date(row.customerDesiredTime),
        status: 'FAILED'
      } : null
    }));
    
    return NextResponse.json(failedOrders);
    
  } catch (error) {
    console.error('Error getting failed orders:', error);
    return NextResponse.json({ error: 'Failed to load failed orders' }, { status: 500 });
  }
}
