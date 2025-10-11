import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/universal-email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content } = body;

    // Validate required fields
    if (!to || !subject || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('🚀 Super Admin Manual Email Send Request:', {
      to,
      subject,
      contentLength: content.length
    });

    // Create HTML content from plain text
    const htmlContent = content.replace(/\n/g, '<br>');

    // Send the email using the universal email service
    const result = await emailService.sendEmail(to, subject, htmlContent);

    if (result.success) {
      console.log('✅ Manual email sent successfully to:', to);
      
      return NextResponse.json({
        success: true,
        message: `Email sent successfully to ${to}`,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Failed to send manual email to:', to);
      
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in manual email send:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
