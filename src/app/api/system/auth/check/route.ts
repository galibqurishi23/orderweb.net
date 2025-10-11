import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 System auth check API called');
    
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
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});
    
    console.log('🍪 Parsed cookies:', Object.keys(cookies));
    
    const adminSession = cookies['admin-session'];
    
    if (!adminSession) {
      console.log('❌ No admin-session cookie found');
      return NextResponse.json({
        authenticated: false,
        error: 'No admin session cookie'
      });
    }
    
    console.log('✅ Admin session found:', adminSession.substring(0, 20) + '...');
    
    try {
      const sessionData = JSON.parse(adminSession);
      console.log('📝 Session data:', {
        email: sessionData.email,
        role: sessionData.role,
        expiresAt: sessionData.expiresAt
      });
      
      // Check if session has expired
      if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
        console.log('⏰ Session expired');
        return NextResponse.json({
          authenticated: false,
          error: 'Session expired'
        });
      }
      
      // Validate that this is actually an admin session
      if (sessionData.role !== 'admin') {
        console.log('🚫 Not an admin role:', sessionData.role);
        return NextResponse.json({
          authenticated: false,
          error: 'Not an admin user'
        });
      }
      
      console.log('✅ Admin authentication confirmed');
      return NextResponse.json({
        authenticated: true,
        user: {
          email: sessionData.email,
          role: sessionData.role
        }
      });
      
    } catch (parseError) {
      console.error('❌ Failed to parse session:', parseError);
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid session format'
      });
    }
    
  } catch (error) {
    console.error('❌ System auth check error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'System auth check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}