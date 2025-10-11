import { NextRequest, NextResponse } from 'next/server';
import { getAllSuperAdminUsers, createSuperAdminUser } from '@/lib/tenant-service';

export async function GET() {
  try {
    const users = await getAllSuperAdminUsers();
    
    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching super admin users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check current user count (max 3 users)
    const currentUsers = await getAllSuperAdminUsers();
    if (currentUsers.length >= 3) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 3 super admin users allowed' },
        { status: 400 }
      );
    }

    // Always create as super_admin role
    const user = await createSuperAdminUser({
      name,
      email,
      password,
      role: 'super_admin'
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: 'Super admin user created successfully'
    });
  } catch (error: any) {
    console.error('Error creating super admin user:', error);
    
    // Handle duplicate email errors
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('email')) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
