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

    // Get active templates
    const [rows] = await db.execute(`
      SELECT template_type, id, name, active
      FROM email_templates
      WHERE tenant_id = ? AND active = 1
      ORDER BY template_type
    `, [tenantId]);

    const activeTemplates = rows as any[];

    // Group templates by type
    const templateStatus = {
      order_confirmation: activeTemplates.find(t => t.template_type === 'order_confirmation'),
      order_complete: activeTemplates.find(t => t.template_type === 'order_complete'),
      restaurant_notification: activeTemplates.find(t => t.template_type === 'restaurant_notification')
    };

    // Get SMTP status
    const [smtpRows] = await db.execute(`
      SELECT 
        CASE 
          WHEN smtp_host IS NOT NULL 
          AND smtp_port IS NOT NULL 
          AND smtp_user IS NOT NULL 
          AND smtp_password IS NOT NULL 
          AND smtp_from IS NOT NULL 
          THEN TRUE 
          ELSE FALSE 
        END as smtp_configured,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_from
      FROM tenants
      WHERE id = ?
    `, [tenantId]);

    const smtpStatus = (smtpRows as any[])[0];

    return NextResponse.json({
      templateStatus,
      smtpStatus: {
        configured: smtpStatus?.smtp_configured || false,
        host: smtpStatus?.smtp_host,
        port: smtpStatus?.smtp_port,
        secure: smtpStatus?.smtp_secure === 1,
        from: smtpStatus?.smtp_from
      }
    });

  } catch (error) {
    console.error('Error fetching active templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
