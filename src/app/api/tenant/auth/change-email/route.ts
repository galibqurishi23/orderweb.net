import { NextRequest, NextResponse } from 'next/server';
import { changeTenantAdminEmail } from '@/lib/tenant-service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newEmail, currentPassword } = body;

    // Validate required fields
    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { success: false, error: 'New email and current password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Change email
    await changeTenantAdminEmail(tenantId, newEmail, currentPassword);

    return NextResponse.json({
      success: true,
      message: 'Email changed successfully'
    });
  } catch (error) {
    console.error('Error changing tenant admin email:', error);
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('Invalid current password')) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Email already exists')) {
      return NextResponse.json(
        { success: false, error: 'This email is already in use' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to change email' },
      { status: 500 }
    );
  }
}
