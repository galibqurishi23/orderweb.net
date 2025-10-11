import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Support both GET and POST requests
export async function GET(request: NextRequest) {
  return checkToken(request);
}

export async function POST(request: NextRequest) {
  return checkToken(request);
}

async function checkToken(request: NextRequest) {
  try {
    let token = '';
    
    // Try to get token from multiple sources
    const cookieHeader = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    
    // First try cookie
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
    
    // Then try Authorization header
    if (!token && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Finally try request body (for POST)
    if (!token && request.method === 'POST') {
      try {
        const body = await request.json();
        token = body.token;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        error: 'No token provided'
      });
    }

    // Get session with user and tenant data
    const [sessionRows] = await db.execute(
      `SELECT s.*, u.email, u.name, u.role, u.tenant_id,
              t.slug as tenant_slug, t.name as tenant_name 
       FROM admin_sessions s 
       JOIN tenant_users u ON s.user_id = u.id 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE s.token = ? AND s.expires_at > NOW()`,
      [token]
    );

    const sessions = sessionRows as any[];
    if (sessions.length === 0) {
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid or expired token'
      });
    }

    const session = sessions[0];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role
      },
      tenant: {
        id: session.tenant_id,
        name: session.tenant_name,
        slug: session.tenant_slug
      }
    });

  } catch (error) {
    console.error('Token auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Invalid session'
    });
  }
}