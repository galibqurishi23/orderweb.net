import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/universal-email-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email service from API endpoint...');
    
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Test sending a welcome email using the same function as restaurant creation
    const testData = {
      restaurantName: 'API Test Restaurant',
      adminEmail: email,
      adminName: 'API Test Admin',
      password: 'APITest123',
      tenantSlug: 'api-test-restaurant'
    };

    console.log('📤 Sending test welcome email to:', email);
    console.log('📊 Test data:', testData);
    
    const success = await emailService.sendWelcomeEmail(testData);
    console.log('📧 Email service result:', success);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test welcome email sent successfully!'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in email test API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
