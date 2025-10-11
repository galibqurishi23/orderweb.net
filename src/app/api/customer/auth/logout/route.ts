import { NextRequest, NextResponse } from 'next/server';
import { CustomerAuthService } from '@/lib/customer-auth-service';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No active session'
      }, { status: 401 });
    }

    await CustomerAuthService.logout(token);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the cookie
    response.cookies.set('customer_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Customer logout API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

    const result = await CustomerAuthService.verifyToken(token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        customer: result.customer
      });
    } else {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

  } catch (error) {
    console.error('Customer auth check API error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false
    });
  }
}
