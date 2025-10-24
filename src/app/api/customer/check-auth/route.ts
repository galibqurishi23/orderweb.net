import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[CHECK-AUTH] Starting authentication check...');
    
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    console.log('[CHECK-AUTH] Token present:', !!token);
    console.log('[CHECK-AUTH] Token length:', token?.length || 0);
    
    if (!token) {
      console.log('[CHECK-AUTH] ❌ No token found in cookies');
      return NextResponse.json({ 
        authenticated: false,
        customer: null 
      });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const secret = process.env.NEXTAUTH_SECRET || 'customer-secret-key';
      console.log('[CHECK-AUTH] Using JWT secret length:', secret.length);
      decoded = jwt.verify(token, secret) as any;
      console.log('[CHECK-AUTH] ✅ Token decoded successfully:', { 
        customerId: decoded.customerId,
        email: decoded.email,
        tenantId: decoded.tenantId
      });
    } catch (jwtError: any) {
      console.error('[CHECK-AUTH] ❌ JWT verification failed:', jwtError.message);
      return NextResponse.json({ 
        authenticated: false,
        customer: null 
      });
    }
    
    console.log('[CHECK-AUTH] ✅ Returning authenticated user');
    return NextResponse.json({
      authenticated: true,
      customer: {
        id: decoded.customerId,
        email: decoded.email,
        tenantId: decoded.tenantId
      }
    });

  } catch (error) {
    console.error('❌ Error checking customer auth:', error);
    return NextResponse.json({ 
      authenticated: false,
      customer: null 
    });
  }
}
