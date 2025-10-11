import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const licenseId = parseInt(params.id);
    
    if (isNaN(licenseId)) {
      return NextResponse.json(
        { error: 'Invalid license ID' },
        { status: 400 }
      );
    }

    await LicenseService.deleteLicense(licenseId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting license:', error);
    return NextResponse.json(
      { error: 'Failed to delete license' },
      { status: 500 }
    );
  }
}
