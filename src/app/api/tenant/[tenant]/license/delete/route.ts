import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenantSlug = params.tenant;

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    const result = await LicenseService.deleteTenantLicense(tenantSlug);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error('Error deleting tenant license:', error);
    return NextResponse.json(
      { error: 'Failed to delete license' },
      { status: 500 }
    );
  }
}
