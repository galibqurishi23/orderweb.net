import { NextRequest, NextResponse } from 'next/server';
import { getAllTenants, createTenant } from '@/lib/tenant-service';

export async function GET() {
  try {
    // Get all tenants
    const tenants = await getAllTenants();
    
    return NextResponse.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, email, phone, address, ownerEmail, ownerPassword } = body;

    // Validate required fields
    if (!name || !slug || !email || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format for admin credentials' },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const result = await createTenant({
      name,
      slug,
      email,
      phone,
      address,
      adminName: 'Admin', // Default admin name
      adminEmail: ownerEmail, // Use email as login credential
      adminPassword: ownerPassword
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Restaurant created successfully'
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Handle duplicate key errors
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('slug')) {
        return NextResponse.json(
          { success: false, error: 'This restaurant URL already exists' },
          { status: 409 }
        );
      }
      if (error.message.includes('email')) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
