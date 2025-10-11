import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activationKey, tenantSlug } = body;

    if (!activationKey || !tenantSlug) {
      return NextResponse.json(
        { error: 'Activation key and tenant slug are required' },
        { status: 400 }
      );
    }

    const result = await LicenseService.activateLicense(activationKey, tenantSlug);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error activating license:', error);
    return NextResponse.json(
      { error: 'Failed to activate license' },
      { status: 500 }
    );
  }
}
