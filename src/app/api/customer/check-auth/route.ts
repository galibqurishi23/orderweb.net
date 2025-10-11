import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        authenticated: false,
        customer: null 
      });
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    } catch (jwtError) {
      return NextResponse.json({ 
        authenticated: false,
        customer: null 
      });
    }
    
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
