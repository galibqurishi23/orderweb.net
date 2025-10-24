import { NextRequest, NextResponse } from 'next/server';
import { CustomerAuthService } from '@/lib/customer-auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Get client IP for security logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const result = await CustomerAuthService.login(email, password, tenantId, ipAddress);

    console.log('[LOGIN] Login result:', { success: result.success, hasToken: !!result.token });

    if (result.success && result.token) {
      console.log('[LOGIN] Setting customer_token cookie');
      
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        customer: result.customer
      });

      // Set secure HTTP-only cookie
      response.cookies.set('customer_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      console.log('[LOGIN] ✅ Cookie set successfully');
      return response;
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Invalid credentials'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Customer login API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Login failed. Please try again.'
    }, { status: 500 });
  }
}