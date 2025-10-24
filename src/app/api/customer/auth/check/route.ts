import { NextRequest, NextResponse } from 'next/server';
import { CustomerAuthService } from '@/lib/customer-auth-service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'No authentication token found'
      });
    }

    const result = await CustomerAuthService.verifyToken(token);

    if (result.success && result.customer) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        customer: result.customer
      });
    } else {
      // Clear invalid token
      const response = NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Invalid or expired token'
      });

      response.cookies.set('customer_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      return response;
    }

  } catch (error) {
    console.error('Customer auth check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Authentication check failed'
    });
  }
}