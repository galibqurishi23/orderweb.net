import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant-service';
import pool from '@/lib/db';
import { getDemoRestaurantSettings } from '@/lib/demo-settings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    // Use file-based settings for 'restaurant' tenant 
    if (slug === 'restaurant') {
      const demoSettings = getDemoRestaurantSettings();
      
      return NextResponse.json({
        id: 'restaurant-demo-id',
        name: 'Demo Restaurant',
        slug: 'restaurant',
        status: 'active',
        plan: 'basic',
        settings: {
          logo: '',
          primaryColor: '#2563eb',
          currency: 'GBP',
          timezone: 'UTC',
          paymentSettings: demoSettings.paymentSettings
        }
      });
    }

    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get tenant settings from tenant_settings table
    let settings = {};
    try {
      const [settingsRows] = await pool.execute(
        'SELECT settings_json FROM tenant_settings WHERE tenant_id = ?',
        [tenant.id]
      );
      if (settingsRows && (settingsRows as any[]).length > 0) {
        const settingsData = (settingsRows as any[])[0].settings_json;
        settings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;
      }
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
    }

    // Return tenant data in the format expected by TenantContext
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.subscription_plan || 'basic',
      settings: settings
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
