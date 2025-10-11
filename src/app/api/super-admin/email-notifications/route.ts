import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // 'smtp_failure', 'email_health', 'system_alert'
    const unreadOnly = searchParams.get('unread') === 'true';
    
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (type) {
      whereClause += ' WHERE type = ?';
      queryParams.push(type);
    }
    
    if (unreadOnly) {
      whereClause += (type ? ' AND' : ' WHERE') + ' is_read = FALSE';
    }
    
    // Get notifications with tenant information
    const [notifications] = await pool.execute(
      `SELECT 
        n.*,
        t.name as tenant_name,
        t.business_name,
        t.email as tenant_email
       FROM super_admin_notifications n
       LEFT JOIN tenants t ON n.tenant_id = t.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    ) as [any[], any];

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM super_admin_notifications n ${whereClause}`,
      queryParams
    ) as [any[], any];

    const total = countResult[0].total;

    // Get SMTP failure statistics
    const [failureStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_failures,
        COUNT(DISTINCT tenant_id) as affected_restaurants,
        DATE(failure_time) as failure_date,
        COUNT(*) as daily_failures
       FROM smtp_failure_logs 
       WHERE failure_time >= DATE_SUB(NOW(), INTERVAL 7 DAYS)
       GROUP BY DATE(failure_time)
       ORDER BY failure_date DESC`
    ) as [any[], any];

    // Get recent SMTP failures by restaurant
    const [recentFailures] = await pool.execute(
      `SELECT 
        s.*,
        t.name as tenant_name,
        t.business_name
       FROM smtp_failure_logs s
       LEFT JOIN tenants t ON s.tenant_id = t.id
       WHERE s.failure_time >= DATE_SUB(NOW(), INTERVAL 24 HOURS)
       ORDER BY s.failure_time DESC
       LIMIT 10`
    ) as [any[], any];

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          failureStats,
          recentFailures
        }
      }
    });

  } catch (error) {
    console.error('Error getting email notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get email notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationIds, markAsRead, action, notificationId } = await request.json();
    
    // Handle single notification operations
    if (action === 'mark_read' && notificationId) {
      await pool.execute(
        'UPDATE super_admin_notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
        [notificationId]
      );

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    }
    
    // Handle bulk operations
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Notification IDs are required for bulk operations' },
        { status: 400 }
      );
    }

    const placeholders = notificationIds.map(() => '?').join(',');
    
    if (markAsRead) {
      await pool.execute(
        `UPDATE super_admin_notifications 
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders})`,
        notificationIds
      );
    } else {
      await pool.execute(
        `UPDATE super_admin_notifications 
         SET is_read = FALSE, read_at = NULL 
         WHERE id IN (${placeholders})`,
        notificationIds
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notifications marked as ${markAsRead ? 'read' : 'unread'}`,
      updatedCount: notificationIds.length
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { notificationIds } = await request.json();
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Notification IDs are required' },
        { status: 400 }
      );
    }

    const placeholders = notificationIds.map(() => '?').join(',');
    
    await pool.execute(
      `DELETE FROM super_admin_notifications WHERE id IN (${placeholders})`,
      notificationIds
    );

    return NextResponse.json({
      success: true,
      message: 'Notifications deleted successfully',
      deletedCount: notificationIds.length
    });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
