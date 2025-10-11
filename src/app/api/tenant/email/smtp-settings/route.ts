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
      SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from
      FROM tenants
      WHERE id = ?
    `, [tenantId]);

    const tenant = (rows as any[])[0];

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      host: tenant.smtp_host || '',
      port: tenant.smtp_port || 587,
      secure: tenant.smtp_secure === 1,
      user: tenant.smtp_user || '',
      password: tenant.smtp_password || '',
      from: tenant.smtp_from || ''
    });

  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { host, port, secure, user, password, from } = await request.json();

    await db.execute(`
      UPDATE tenants
      SET smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, smtp_password = ?, smtp_from = ?
      WHERE id = ?
    `, [host, port, secure ? 1 : 0, user, password, from, tenantId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
