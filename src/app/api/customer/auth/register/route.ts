import { NextRequest, NextResponse } from 'next/server';
import { CustomerAuthService } from '@/lib/customer-auth-service';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, tenantId } = await request.json();

    console.log('Registration attempt:', { name, email, phone, tenantId });

    if (!name || !email || !password || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Name, email, password, and restaurant are required'
      }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 });
    }

    // Password strength validation
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Use the CustomerAuthService for registration
    const result = await CustomerAuthService.register(
      name,
      email,
      password,
      phone || '',
      tenantId
    );

    if (result.success && result.customer && result.token) {
      console.log('Registration successful for:', email);

      const response = NextResponse.json({
        success: true,
        message: 'Account created successfully! You have received 100 loyalty points as a welcome bonus.',
        customer: {
          id: result.customer.id,
          name: result.customer.name,
          email: result.customer.email,
          phone: result.customer.phone
        }
      });

      // Set the authentication cookie
      response.cookies.set('customer_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return response;
    } else {
      console.error('Registration failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Registration failed. Please try again.'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed. Please try again.'
    }, { status: 500 });
  }
}
