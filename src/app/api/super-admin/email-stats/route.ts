import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Get email statistics
    const [notificationStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications,
        COUNT(CASE WHEN severity = 'critical' AND is_read = FALSE THEN 1 END) as critical_alerts
      FROM super_admin_notifications
    `);

    const [smtpFailureStats] = await db.execute(`
      SELECT COUNT(*) as smtp_failures_today
      FROM smtp_failure_logs 
      WHERE DATE(failure_time) = CURDATE()
    `);

    const [emailQueueStats] = await db.execute(`
      SELECT COUNT(*) as total_emails_sent_today
      FROM email_queue 
      WHERE DATE(created_at) = CURDATE() AND status = 'sent'
    `);

    const [fallbackStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN used_system_fallback = TRUE THEN 1 END) as fallback_emails
      FROM smtp_failure_logs 
      WHERE DATE(failure_time) = CURDATE()
    `);

    const [tenantSmtpHealth] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN tes.is_active = TRUE AND tes.failure_count = 0 THEN 1 END) as healthy,
        COUNT(CASE WHEN tes.is_active = TRUE AND tes.failure_count > 0 THEN 1 END) as failing,
        COUNT(CASE WHEN tes.id IS NULL THEN 1 END) as not_configured
      FROM tenants t
      LEFT JOIN tenant_email_settings tes ON t.id = tes.tenant_id
    `);

    const stats = (notificationStats as any[])[0];
    const smtpStats = (smtpFailureStats as any[])[0];
    const emailStats = (emailQueueStats as any[])[0];
    const fallbackStatsResult = (fallbackStats as any[])[0];
    const healthStats = (tenantSmtpHealth as any[])[0];

    const systemFallbackPercentage = fallbackStatsResult.total_emails > 0 
      ? Math.round((fallbackStatsResult.fallback_emails / fallbackStatsResult.total_emails) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        total_notifications: stats.total_notifications,
        unread_notifications: stats.unread_notifications,
        critical_alerts: stats.critical_alerts,
        smtp_failures_today: smtpStats.smtp_failures_today,
        total_emails_sent_today: emailStats.total_emails_sent_today,
        system_fallback_usage: systemFallbackPercentage,
        tenant_smtp_health: {
          healthy: healthStats.healthy,
          failing: healthStats.failing,
          not_configured: healthStats.not_configured
        }
      }
    });

  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch email statistics' },
      { status: 500 }
    );
  }
}
