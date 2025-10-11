import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get cookie from request headers directly
    const cookieHeader = request.headers.get('cookie');
    console.log('Raw cookie header:', cookieHeader);
    
    if (!cookieHeader) {
      return NextResponse.json({
        authenticated: false,
        error: 'No cookies in request',
        debug: { cookieHeader }
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
    
    console.log('Parsed cookies:', Object.keys(cookies));
    
    const sessionCookie = cookies['admin-session'];
    
    if (!sessionCookie) {
      return NextResponse.json({
        authenticated: false,
        error: 'No admin-session cookie found',
        debug: { availableCookies: Object.keys(cookies) }
      });
    }
    
    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (parseError) {
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session data',
        debug: { parseError: parseError instanceof Error ? parseError.message : 'Unknown' }
      });
    }
    
    // Validate session structure
    if (!sessionData.userId || !sessionData.tenantId || !sessionData.loginTime) {
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session structure',
        debug: { sessionKeys: Object.keys(sessionData) }
      });
    }
    
    // Check if session is still valid (24 hours)
    const loginTime = new Date(sessionData.loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return NextResponse.json({
        authenticated: false,
        error: 'Session expired',
        debug: { hoursDiff }
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
      tenantSlug: sessionData.tenantSlug,
      debug: { sessionValid: true, hoursDiff }
    });

  } catch (error) {
    console.error('Simple auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Invalid session',
      debug: { error: error instanceof Error ? error.message : 'Unknown' }
    });
  }
}