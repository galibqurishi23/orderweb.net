import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get all cookies from request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Look for admin-session cookie
    const sessionMatch = cookieHeader.match(/admin-session=([^;]+)/);
    
    if (!sessionMatch) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session cookie found' 
      });
    }

    try {
      const sessionValue = decodeURIComponent(sessionMatch[1]);
      const sessionData = JSON.parse(sessionValue);
      
      // Validate session data
      if (sessionData.userId && sessionData.tenantId && sessionData.email) {
        // Check if session is not expired (24 hours)
        const loginTime = new Date(sessionData.loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
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
          }
        });
      } else {
        return NextResponse.json({ 
          authenticated: false, 
          error: 'Invalid session data' 
        });
      }
      
    } catch (parseError) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'Could not parse session' 
      });
    }

  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}