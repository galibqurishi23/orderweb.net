import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('super-admin-session');

    if (!sessionCookie) {
      return NextResponse.json({
        authenticated: false,
        error: 'No session found'
      });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch (parseError) {
      // Invalid session data, clear cookie
      cookieStore.delete('super-admin-session');
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session data'
      });
    }

    // Validate session data structure
    if (!sessionData.userId || !sessionData.email || !sessionData.loginTime) {
      cookieStore.delete('super-admin-session');
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session structure'
      });
    }
    
    // Check if session is still valid (24 hours)
    const loginTime = new Date(sessionData.loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      // Session expired, clear cookie
      cookieStore.delete('super-admin-session');
      return NextResponse.json({
        authenticated: false,
        error: 'Session expired'
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        role: sessionData.role
      }
    });

  } catch (error) {
    console.error('Super admin auth check error:', error);
    const cookieStore = await cookies();
    cookieStore.delete('super-admin-session');
    return NextResponse.json({
      authenticated: false,
      error: 'Invalid session'
    });
  }
}
