import { NextRequest, NextResponse } from 'next/server';
import { getTenantOrderStats, getTenantBySlug } from '@/lib/tenant-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const tenantSlug = searchParams.get('tenant');

    let actualTenantId = tenantId;

    // If tenant slug is provided instead of ID, look up the tenant ID
    if (!tenantId && tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      actualTenantId = tenant.id;
    }

    if (!actualTenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID or slug is required' },
        { status: 400 }
      );
    }

    const stats = await getTenantOrderStats(actualTenantId);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching tenant stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
