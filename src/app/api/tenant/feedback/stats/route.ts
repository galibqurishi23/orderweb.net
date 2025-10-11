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

    // Get feedback stats
    const [statsRows] = await db.execute(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
      FROM order_feedback 
      WHERE tenant_id = ? AND rating IS NOT NULL
    `, [tenantId]);

    // Get recent feedback count (last 7 days)
    const [recentRows] = await db.execute(`
      SELECT COUNT(*) as recent_feedback
      FROM order_feedback 
      WHERE tenant_id = ? AND rating IS NOT NULL 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [tenantId]);

    const stats = (statsRows as any[])[0];
    const recent = (recentRows as any[])[0];

    return NextResponse.json({
      total_feedback: parseInt(stats.total_feedback),
      average_rating: parseFloat(stats.average_rating) || 0,
      rating_distribution: {
        1: parseInt(stats.rating_1) || 0,
        2: parseInt(stats.rating_2) || 0,
        3: parseInt(stats.rating_3) || 0,
        4: parseInt(stats.rating_4) || 0,
        5: parseInt(stats.rating_5) || 0,
      },
      recent_feedback: parseInt(recent.recent_feedback) || 0
    });

  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
