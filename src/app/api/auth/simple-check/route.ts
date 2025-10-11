import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies from request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Look for admin-session cookie
    const sessionMatch = cookieHeader.match(/admin-session=([^;]+)/);
    
    if (!sessionMatch) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session found',
        cookies: cookieHeader 
      });
    }

    try {
      const sessionValue = decodeURIComponent(sessionMatch[1]);
      const sessionData = JSON.parse(sessionValue);
      
      // Simple validation - check if we have required fields
      if (sessionData.userId && sessionData.tenantId && sessionData.email) {
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
          }
        });
      } else {
        return NextResponse.json({ 
          authenticated: false, 
          error: 'Invalid session data',
          sessionData 
        });
      }
      
    } catch (parseError) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'Session parse error',
        rawValue: sessionMatch[1]
      });
    }

  } catch (error) {
    console.error('Simple auth check error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}