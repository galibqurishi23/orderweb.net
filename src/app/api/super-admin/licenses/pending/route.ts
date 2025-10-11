import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function GET() {
  try {
    const pendingActivations = await LicenseService.getPendingActivations();
    return NextResponse.json(pendingActivations);
  } catch (error) {
    console.error('Error fetching pending activations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending activations' },
      { status: 500 }
    );
  }
}
