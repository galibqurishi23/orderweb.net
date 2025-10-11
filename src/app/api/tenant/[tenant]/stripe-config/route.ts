import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant parameter is required' }, { status: 400 });
    }

    // First, get the tenant ID from the slug
    const [tenantRows] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenant]
    );

    if (!tenantRows || (tenantRows as any[]).length === 0) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantId = (tenantRows as any[])[0].id;
    
    // Get Stripe configuration for the tenant using tenant ID
    const [rows] = await db.execute(`
      SELECT stripe_publishable_key, stripe_mode
      FROM tenant_settings 
      WHERE tenant_id = ?
    `, [tenantId]);
    
    const result = rows as any[];
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Tenant settings not found' }, { status: 404 });
    }

    const settings = result[0];
    
    if (!settings.stripe_publishable_key) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 404 });
    }

    return NextResponse.json({
      publishableKey: settings.stripe_publishable_key,
      mode: settings.stripe_mode || 'test'
    });

  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
