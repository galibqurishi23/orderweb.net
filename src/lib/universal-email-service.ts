import nodemailer from 'nodemailer';

interface WelcomeEmailData {
  restaurantName: string;
  adminEmail: string;
  adminName: string;
  password: string;
  tenantSlug: string;
}

class UniversalEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Use environment variables for email configuration
      // Check if SMTP is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️ SMTP not configured - email sending will be disabled');
        this.transporter = null;
        return;
      }

      console.log('🔧 Initializing email transporter with:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM
      });

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD, // Fixed: was SMTP_PASS, now SMTP_PASSWORD
        },
        // Add proper email headers to improve deliverability
        name: 'orderweb.co.uk', // Sets proper hostname in email headers
        tls: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
      });

      console.log('✅ Email transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  // Method to reinitialize transporter (useful after SMTP settings change)
  public async reinitialize() {
    console.log('🔄 Reinitializing email transporter...');
    await this.initializeTransporter();
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      console.log('🔍 DEBUG: sendWelcomeEmail called with data:', {
        restaurantName: data.restaurantName,
        adminEmail: data.adminEmail,
        adminName: data.adminName,
        tenantSlug: data.tenantSlug,
        hasPassword: !!data.password
      });

      if (!this.transporter) {
        console.log('❌ Email transporter not available, skipping welcome email');
        console.log('🔍 DEBUG: Transporter state:', this.transporter);
        console.log('🔍 DEBUG: SMTP_HOST:', process.env.SMTP_HOST);
        console.log('🔍 DEBUG: SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
        return false;
      }

      console.log('✅ Email transporter is available');

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM || 'Order Web POS',
          address: process.env.SMTP_USER || 'noreply@orderweb.com'
        },
        to: data.adminEmail,
        replyTo: process.env.SMTP_USER,
        subject: `Welcome to OrderWeb - ${data.restaurantName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to OrderWeb!</h2>
            <p>Hello ${data.adminName},</p>
            <p>Your restaurant "<strong>${data.restaurantName}</strong>" has been successfully set up on OrderWeb.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Your Login Details:</h3>
              <p><strong>Email:</strong> ${data.adminEmail}</p>
              <p><strong>Password:</strong> ${data.password}</p>
              <p><strong>Admin URL:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/${data.tenantSlug}/admin">${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/${data.tenantSlug}/admin</a></p>
            </div>
            
            <p>Please log in and change your password as soon as possible.</p>
            
            <p>Thank you for choosing OrderWeb!</p>
            <p>Best regards,<br>The OrderWeb Team</p>
          </div>
        `,
      };

      console.log('📧 Mail options prepared:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      console.log('📤 Attempting to send email via SMTP...');
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', data.adminEmail);
      console.log('📧 SMTP Result:', result.messageId);
      
      // Write success to log file
      const fs = require('fs');
      const logMessage = `${new Date().toISOString()} - SUCCESS: Welcome email sent to ${data.adminEmail}, MessageID: ${result.messageId}\n`;
      fs.appendFileSync('./email-debug.log', logMessage);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      
      // Write error to log file
      const fs = require('fs');
      const logMessage = `${new Date().toISOString()} - ERROR: Failed to send welcome email to ${data.adminEmail}: ${error}\n`;
      fs.appendFileSync('./email-debug.log', logMessage);
      
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      console.log('🔍 DEBUG: sendEmail called with:', {
        to,
        subject,
        htmlLength: html.length
      });

      if (!this.transporter) {
        console.log('❌ Email transporter not available, skipping email');
        console.log('🔍 DEBUG: Transporter state:', this.transporter);
        console.log('🔍 DEBUG: SMTP_HOST:', process.env.SMTP_HOST);
        console.log('🔍 DEBUG: SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
        return { success: false };
      }

      console.log('✅ Email transporter is available');

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM || 'Order Web POS',
          address: process.env.SMTP_USER || 'noreply@orderweb.com'
        },
        to,
        replyTo: process.env.SMTP_USER,
        subject,
        html,
      };

      console.log('📧 Mail options prepared:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        htmlLength: html.length
      });

      console.log('📤 Attempting to send email via SMTP...');
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', to);
      console.log('📧 SMTP Result:', result.messageId);
      
      // Write success to log file
      const fs = require('fs');
      const logMessage = `${new Date().toISOString()} - SUCCESS: Manual email sent to ${to}, Subject: "${subject}", MessageID: ${result.messageId}\n`;
      fs.appendFileSync('./email-debug.log', logMessage);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Write error to log file
      const fs = require('fs');
      const logMessage = `${new Date().toISOString()} - ERROR: Failed to send manual email to ${to}: ${error}\n`;
      fs.appendFileSync('./email-debug.log', logMessage);
      
      return { success: false };
    }
  }
}

// Export singleton instance
export const emailService = new UniversalEmailService();
