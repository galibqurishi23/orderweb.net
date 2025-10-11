import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/universal-email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    // Validate required fields
    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('🧪 SMTP Test Request for:', testEmail);

    const timestamp = new Date().toISOString();
    const testSubject = 'OrderWeb SMTP Test Email';
    const testContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🧪 SMTP Test Email</h2>
        <p>This is a test email from the OrderWeb SMTP service.</p>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3>✅ SMTP Configuration Status: Working</h3>
          <p><strong>Test Time:</strong> ${timestamp}</p>
          <p><strong>SMTP Server:</strong> ${process.env.SMTP_HOST || 'Not configured'}</p>
          <p><strong>From Email:</strong> ${process.env.FROM_EMAIL || 'Not configured'}</p>
        </div>
        
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
        <p style="color: #666; font-size: 12px;">
          This is an automated test email from OrderWeb Email Management System.<br>
          Please do not reply to this email.
        </p>
      </div>
    `;

    // Send the test email
    const success = await emailService.sendEmail(testEmail, testSubject, testContent);

    if (success) {
      console.log('✅ SMTP test email sent successfully to:', testEmail);
      
      return NextResponse.json({
        success: true,
        message: `SMTP test email sent successfully to ${testEmail}. Please check your inbox.`,
        timestamp
      });
    } else {
      console.error('❌ SMTP test failed for:', testEmail);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMTP test failed. Please check your SMTP configuration.',
          message: 'The SMTP server may be unreachable or your credentials may be incorrect.'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in SMTP test:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'SMTP test failed',
        message: 'An error occurred while testing the SMTP connection.' 
      },
      { status: 500 }
    );
  }
}
