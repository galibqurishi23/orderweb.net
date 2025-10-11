import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant-service';
import pool from '@/lib/db';
import { getDemoRestaurantSettings } from '@/lib/demo-settings';
import { tenantCache, CacheKeys, cacheAside } from '@/lib/cache-service';
import { API_CACHE } from '@/lib/performance-config';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantSlug } = params;

    // Special handling for demo tenant
    if (tenantSlug === 'demo') {
      const demoSettings = getDemoRestaurantSettings();
      return NextResponse.json({
        id: 'demo-tenant-id',
        name: 'Demo Restaurant',
        slug: 'demo',
        status: 'active',
        plan: 'demo',
        email: 'demo@restaurant.com',
        phone: '+1234567890',
        address: '123 Demo Street, Demo City, DC 12345',
        description: 'This is a demo restaurant for testing purposes.',
        logo_url: '',
        settings: demoSettings
      });
    }

    // Use cache-aside pattern for tenant info
    const cacheKey = CacheKeys.tenantBySlug(tenantSlug);
    const tenantInfo = await cacheAside(
      cacheKey,
      async () => {
        const tenantData = await getTenantBySlug(tenantSlug);

        if (!tenantData) {
          throw new Error('Tenant not found');
        }

        // Get tenant settings from tenant_settings table
        let settings = {};
        try {
          const [settingsRows] = await pool.execute(
            'SELECT settings_json FROM tenant_settings WHERE tenant_id = ?',
            [tenantData.id]
          );
          if (settingsRows && (settingsRows as any[]).length > 0) {
            const settingsData = (settingsRows as any[])[0].settings_json;
            settings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;
          }
        } catch (error) {
          console.error('Error fetching tenant settings:', error);
          // Continue with empty settings if there's an error
        }

        return {
          id: tenantData.id,
          name: (settings as any)?.name || tenantData.name,
          slug: tenantData.slug,
          status: tenantData.status,
          plan: tenantData.subscription_plan || 'basic',
          email: (settings as any)?.email || tenantData.email,
          phone: (settings as any)?.phone || tenantData.phone,
          address: (settings as any)?.address || tenantData.address,
          description: (settings as any)?.description || '',
          logo_url: (settings as any)?.logo || '',
          settings: settings
        };
      },
      tenantCache,
      API_CACHE.TENANT_INFO
    );

    return NextResponse.json(tenantInfo);

  } catch (error) {
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    console.error('Error fetching tenant info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
