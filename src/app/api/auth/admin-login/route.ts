import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getTenantBySlug } from '@/lib/tenant-service';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantSlug } = await request.json();

    if (!email || !password || !tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and tenant are required' },
        { status: 400 }
      );
    }

    // Get tenant by slug
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Find user in tenant_users table using email OR username (owner is the admin role)
    const [userRows] = await db.execute(
      'SELECT id, email, username, password, name, role, active FROM tenant_users WHERE (email = ? OR username = ?) AND tenant_id = ? AND role = "owner"',
      [email, email, tenant.id]
    );

    const users = userRows as any[];
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session data
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      loginTime: new Date().toISOString()
    };

    // Also create a simple token for alternative auth
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store session in database
    try {
      await db.execute(
        'INSERT INTO admin_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [Date.now().toString(), user.id, sessionToken, expiresAt]
      );
    } catch (dbError) {
      console.log('Session creation error:', dbError);
      // Continue without token for now
    }

    // Set HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      token: sessionToken, // Add token for client-side storage
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      // Add session data for immediate use
      sessionData: sessionData
    });

    // Set multiple cookies for different auth methods
    response.cookies.set('admin-session', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });
    
    // Also set a simple auth token cookie
    response.cookies.set('auth-token', sessionToken, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });
    
    console.log('✅ Cookies set, returning response');

    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
