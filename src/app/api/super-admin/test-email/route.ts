import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { host, port, secure, user, password, from, testEmail } = await request.json();

    // Validate required fields
    if (!host || !port || !user || !password || !from || !testEmail) {
      return NextResponse.json(
        { error: 'Missing required SMTP configuration fields' },
        { status: 400 }
      );
    }

    // Create transporter with the provided settings
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true, // true for 465, false for other ports
      auth: {
        user,
        pass: password,
      },
      // Add some timeout and connection options
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
    });

    // Test the connection first
    await transporter.verify();

    // Send test email
    const mailOptions = {
      from: from,
      to: testEmail,
      subject: 'SMTP Configuration Test - OrderWeb',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">✅ SMTP Test Successful!</h2>
          
          <p>Congratulations! Your SMTP configuration is working correctly.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
            <ul style="color: #6b7280; margin: 10px 0;">
              <li><strong>SMTP Host:</strong> ${host}</li>
              <li><strong>Port:</strong> ${port}</li>
              <li><strong>Security:</strong> ${secure ? 'SSL/TLS Enabled' : 'No SSL/TLS'}</li>
              <li><strong>From Address:</strong> ${from}</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This test email was sent from OrderWeb Super Admin Settings at ${new Date().toLocaleString()}.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            OrderWeb Restaurant Management System
          </p>
        </div>
      `,
      text: `
SMTP Test Successful!

Your SMTP configuration is working correctly.

Configuration Details:
- SMTP Host: ${host}
- Port: ${port}
- Security: ${secure ? 'SSL/TLS Enabled' : 'No SSL/TLS'}
- From Address: ${from}

This test email was sent from OrderWeb Super Admin Settings at ${new Date().toLocaleString()}.

OrderWeb Restaurant Management System
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`
    });

  } catch (error: any) {
    console.error('SMTP test error:', error);
    
    let errorMessage = 'Failed to send test email';
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your SMTP host and port.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Socket error. Please check your network connection and SMTP settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please check your SMTP host and port.';
    } else if (error.message?.includes('self signed certificate')) {
      errorMessage = 'SSL certificate error. Try disabling SSL or contact your email provider.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: {
          code: error.code,
          command: error.command,
          response: error.response
        }
      },
      { status: 500 }
    );
  }
}
