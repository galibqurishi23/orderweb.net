import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get cookie from request headers
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json({
        authenticated: false,
        error: 'No cookies found'
      });
    }
    
    // Look for admin-session cookie
    const sessionMatch = cookieHeader.match(/admin-session=([^;]+)/);
    
    if (!sessionMatch) {
      return NextResponse.json({
        authenticated: false,
        error: 'No admin session cookie'
      });
    }
    
    try {
      // Decode and parse the session data
      const sessionValue = decodeURIComponent(sessionMatch[1]);
      const sessionData = JSON.parse(sessionValue);
      
      // Simple validation
      if (sessionData.userId && sessionData.email && sessionData.tenantId) {
        // Check if session is not too old (24 hours)
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
    console.error('Auth check error:', error);
    const fs = require('fs');
    fs.appendFileSync('/tmp/auth-debug.log', `${new Date().toISOString()} - Auth check error: ${error}\n`);
    return NextResponse.json({
      authenticated: false,
      error: 'Invalid session'
    });
  }
}
