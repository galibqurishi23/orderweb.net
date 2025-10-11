import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Get recent SMTP failures with tenant information
    const [failures] = await db.execute(`
      SELECT 
        sfl.*,
        t.name as tenant_name
      FROM smtp_failure_logs sfl
      LEFT JOIN tenants t ON sfl.tenant_id = t.id
      ORDER BY sfl.failure_time DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      data: failures
    });

  } catch (error) {
    console.error('Error fetching SMTP failures:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch SMTP failures' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, failureId } = await request.json();

    if (action === 'resolve' && failureId) {
      await db.execute(
        'UPDATE smtp_failure_logs SET resolved_at = NOW() WHERE id = ?',
        [failureId]
      );

      return NextResponse.json({
        success: true,
        message: 'SMTP failure marked as resolved'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action or missing parameters' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating SMTP failure:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update SMTP failure' },
      { status: 500 }
    );
  }
}
