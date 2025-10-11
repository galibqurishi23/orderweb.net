import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Auth check API called');
    
    // Get cookie from request headers directly instead of using Next.js cookies API
    const cookieHeader = request.headers.get('cookie');
    console.log('🍪 Raw cookie header:', cookieHeader);
    
    if (!cookieHeader) {
      console.log('❌ No cookie header found');
      return NextResponse.json({
        authenticated: false,
        error: 'No cookies in request'
      });
    }
    
    // Parse cookies manually
    const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        acc[name] = decodeURIComponent(value);
      }
      return acc;
    }, {});
    
    console.log('🍪 Parsed cookies:', Object.keys(cookies));
    
    const sessionCookieValue = cookies['admin-session'];
    
    if (!sessionCookieValue) {
      console.log('❌ No admin-session cookie found');
      return NextResponse.json({
        authenticated: false,
        error: 'No session found'
      });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookieValue);
      console.log('✅ Parsed session data successfully');
    } catch (parseError) {
      console.log('❌ Failed to parse session data:', parseError);
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session data'
      });
    }

    // Validate session data structure
    if (!sessionData.userId || !sessionData.tenantId || !sessionData.loginTime) {
      console.log('❌ Invalid session structure');
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
      console.log('❌ Session expired');
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
      },
      tenant: {
        id: sessionData.tenantId,
        slug: sessionData.tenantSlug
      },
      tenantSlug: sessionData.tenantSlug
    });

  } catch (error) {
    console.error('Auth check error:', error);
    const fs = require('fs');
    fs.appendFileSync('/tmp/auth-debug.log', `${new Date().toISOString()} - Auth check error: ${error}\n`);
    return NextResponse.json({
      authenticated: false,
      error: 'Invalid session'
    });
  }
}
