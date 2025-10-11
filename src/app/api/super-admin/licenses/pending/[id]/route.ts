import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activationId = parseInt(params.id);

    if (isNaN(activationId)) {
      return NextResponse.json(
        { error: 'Invalid activation ID' },
        { status: 400 }
      );
    }

    await LicenseService.deletePendingActivation(activationId);

    return NextResponse.json(
      { message: 'Activation key deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting activation key:', error);
    
    if (error instanceof Error && error.message === 'Activation key not found') {
      return NextResponse.json(
        { error: 'Activation key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete activation key' },
      { status: 500 }
    );
  }
}
