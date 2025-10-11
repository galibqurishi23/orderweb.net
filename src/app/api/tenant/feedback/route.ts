import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const [rows] = await db.execute(`
      SELECT 
        f.id,
        f.order_id,
        f.customer_name,
        f.customer_email,
        f.rating,
        f.review,
        f.created_at,
        o.total as order_total,
        o.items as order_items
      FROM order_feedback f
      JOIN orders o ON o.id = f.order_id
      WHERE f.tenant_id = ? AND f.rating IS NOT NULL
      ORDER BY f.created_at DESC
    `, [tenantId]);

    const feedback = (rows as any[]).map(row => ({
      ...row,
      order_total: parseFloat(row.order_total),
      order_items: JSON.parse(row.order_items || '[]')
    }));

    return NextResponse.json(feedback);

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
