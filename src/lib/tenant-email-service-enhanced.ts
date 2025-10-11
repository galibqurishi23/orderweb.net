import nodemailer from 'nodemailer';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface TenantSMTPSettings extends RowDataPacket {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  smtp_from_name: string;
  smtp_enabled: number;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export class TenantEmailService {
  /**
   * Get tenant ID from slug
   */
  private static async getTenantIdFromSlug(tenantSlug: string): Promise<string | null> {
    try {
      const [results] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenantSlug]
      );

      if (!results || (Array.isArray(results) && results.length === 0)) {
        return null;
      }

      const tenant = Array.isArray(results) ? results[0] : results;
      return (tenant as any).id;
    } catch (error) {
      console.error('Error fetching tenant ID:', error);
      return null;
    }
  }

  /**
   * Get tenant-specific SMTP settings
   */
  private static async getTenantSMTPSettings(tenantId: string): Promise<TenantSMTPSettings | null> {
    try {
      const [results] = await db.execute(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, 
                smtp_from, smtp_from_name, smtp_enabled 
         FROM tenants 
         WHERE id = ? AND smtp_enabled = 1`,
        [tenantId]
      );

      if (!results || (Array.isArray(results) && results.length === 0)) {
        return null;
      }

      return (Array.isArray(results) ? results[0] : results) as TenantSMTPSettings;
    } catch (error) {
      console.error('Error fetching tenant SMTP settings:', error);
      return null;
    }
  }

  /**
   * Create nodemailer transporter for tenant
   */
  private static async createTenantTransporter(tenantId: string): Promise<nodemailer.Transporter | null> {
    const smtpSettings = await this.getTenantSMTPSettings(tenantId);
    
    if (!smtpSettings) {
      return null;
    }

    try {
      const transporterConfig: any = {
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        secure: Boolean(smtpSettings.smtp_secure), // true for 465, false for other ports
      };

      if (smtpSettings.smtp_user && smtpSettings.smtp_password) {
        transporterConfig.auth = {
          user: smtpSettings.smtp_user,
          pass: smtpSettings.smtp_password,
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);
      
      // Test the connection
      await transporter.verify();
      
      return transporter;
    } catch (error) {
      console.error('Error creating tenant transporter:', error);
      return null;
    }
  }

  /**
   * Send email using tenant-specific SMTP or fallback to system default
   */
  static async sendEmail(tenantSlugOrId: string, emailOptions: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    usedTenantSMTP: boolean;
  }> {
    let usedTenantSMTP = false;
    let tenantId = tenantSlugOrId;
    
    // If it's not a UUID, assume it's a slug and convert to ID
    if (!tenantSlugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const actualTenantId = await this.getTenantIdFromSlug(tenantSlugOrId);
      if (!actualTenantId) {
        return {
          success: false,
          error: 'Tenant not found',
          usedTenantSMTP: false
        };
      }
      tenantId = actualTenantId;
    }
    
    try {
      // Try to use tenant-specific SMTP first
      const tenantTransporter = await this.createTenantTransporter(tenantId);
      const smtpSettings = await this.getTenantSMTPSettings(tenantId);
      
      if (tenantTransporter && smtpSettings) {
        console.log(`📧 Using tenant-specific SMTP for tenant: ${tenantId}`);
        
        const mailOptions = {
          from: `"${smtpSettings.smtp_from_name || 'Restaurant'}" <${smtpSettings.smtp_from || smtpSettings.smtp_user}>`,
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
          text: emailOptions.text,
          cc: emailOptions.cc,
          bcc: emailOptions.bcc,
          replyTo: emailOptions.replyTo || smtpSettings.smtp_from || smtpSettings.smtp_user,
        };

        const info = await tenantTransporter.sendMail(mailOptions);
        usedTenantSMTP = true;
        
        // Log successful send
        await this.logEmailSent(tenantId, emailOptions, info.messageId, 'tenant_smtp');
        
        return {
          success: true,
          messageId: info.messageId,
          usedTenantSMTP: true
        };
      }
      
      // Fallback to system default SMTP
      console.log(`📧 Falling back to system SMTP for tenant: ${tenantId}`);
      return await this.sendEmailWithSystemSMTP(tenantId, emailOptions);
      
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Log failed send
      await this.logEmailSent(tenantId, emailOptions, null, usedTenantSMTP ? 'tenant_smtp_failed' : 'system_smtp_failed', error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        usedTenantSMTP
      };
    }
  }

  /**
   * Send email using system default SMTP
   */
  private static async sendEmailWithSystemSMTP(tenantId: string, emailOptions: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    usedTenantSMTP: boolean;
  }> {
    try {
      // Create system transporter
      const systemTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      });

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@orderweb.com',
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        replyTo: emailOptions.replyTo,
      };

      const info = await systemTransporter.sendMail(mailOptions);
      
      // Log successful send
      await this.logEmailSent(tenantId, emailOptions, info.messageId, 'system_smtp');
      
      return {
        success: true,
        messageId: info.messageId,
        usedTenantSMTP: false
      };
      
    } catch (error) {
      console.error('System SMTP also failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        usedTenantSMTP: false
      };
    }
  }

  /**
   * Log email sending attempts
   */
  private static async logEmailSent(
    tenantId: string, 
    emailOptions: EmailOptions, 
    messageId: string | null, 
    method: string,
    error?: string
  ): Promise<void> {
    try {
      await db.execute(
        `INSERT INTO email_logs (
          id, tenant_id, recipient_email, subject, 
          status, sent_at, error_message, email_provider,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
          emailOptions.subject,
          messageId ? 'sent' : 'failed',
          messageId ? new Date() : null,
          error || null,
          method
        ]
      );
    } catch (logError) {
      console.error('Error logging email:', logError);
      // Don't fail the main operation if logging fails
    }
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(tenantId: string, orderData: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    orderTotal: string;
    orderItems: string;
    restaurantName: string;
  }): Promise<{ success: boolean; messageId?: string; usedTenantSMTP: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .order-details { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #333; margin: 0;">Order Confirmation</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Thank you for your order!</p>
          </div>
          
          <p>Dear ${orderData.customerName},</p>
          <p>We've received your order and it's being prepared. Here are the details:</p>
          
          <div class="order-details">
            <h3 style="margin-top: 0; color: #333;">Order #${orderData.orderNumber}</h3>
            <p><strong>Items:</strong> ${orderData.orderItems}</p>
            <p><strong>Total:</strong> ${orderData.orderTotal}</p>
            <p><strong>Restaurant:</strong> ${orderData.restaurantName}</p>
          </div>
          
          <p>We'll notify you once your order is ready for pickup/delivery.</p>
          
          <div class="footer">
            <p>Thank you for choosing ${orderData.restaurantName}!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(tenantId, {
      to: orderData.customerEmail,
      subject: `Order Confirmation #${orderData.orderNumber} - ${orderData.restaurantName}`,
      html
    });
  }

  /**
   * Send test email with custom SMTP settings
   */
  static async sendTestEmail({ tenantId, testEmail, smtpSettings }: {
    tenantId: string;
    testEmail: string;
    smtpSettings: {
      smtp_host: string;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_user: string;
      smtp_password: string;
      smtp_from_email: string;
      smtp_from_name: string;
    };
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Create transporter with the provided SMTP settings
      const transporterConfig: any = {
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        secure: Boolean(smtpSettings.smtp_secure), // true for 465, false for other ports
      };

      // Only add auth if both user and password are provided
      if (smtpSettings.smtp_user && smtpSettings.smtp_password) {
        transporterConfig.auth = {
          user: smtpSettings.smtp_user,
          pass: smtpSettings.smtp_password,
        };
      }

      // Add additional SMTP options for better compatibility
      transporterConfig.tls = {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      };
      
      // Set timeout options
      transporterConfig.connectionTimeout = 10000; // 10 seconds
      transporterConfig.greetingTimeout = 5000; // 5 seconds
      transporterConfig.socketTimeout = 10000; // 10 seconds

      const transporter = nodemailer.createTransport(transporterConfig);

      // Test the connection first
      try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
      } catch (verifyError) {
        console.error('❌ SMTP verification failed:', verifyError);
        throw new Error(`SMTP Connection Failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown verification error'}`);
      }

      // Get tenant name for the email
      const [tenantResults] = await db.execute(
        'SELECT name, slug FROM tenants WHERE id = ?',
        [tenantId]
      );

      const tenant = Array.isArray(tenantResults) ? tenantResults[0] : tenantResults;
      const tenantName = (tenant as any)?.name || 'Restaurant';
      const tenantSlug = (tenant as any)?.slug || 'restaurant';

      // Prepare test email content
      const subject = `🎉 Test Email SUCCESS from ${tenantName}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test Email Success</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #10b981, #059669); 
              color: white; 
              padding: 30px 20px; 
              text-align: center; 
              border-radius: 12px 12px 0 0; 
            }
            .content { 
              background: #f9fafb; 
              padding: 40px 30px; 
              border-radius: 0 0 12px 12px; 
              border: 1px solid #e5e7eb;
            }
            .success-badge { 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              border-radius: 50px; 
              font-weight: bold; 
              font-size: 18px;
              display: inline-block;
              margin: 20px 0;
            }
            .info-box { 
              background: #e0f2fe; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #0284c7;
            }
            .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
            .checkmark { color: #10b981; font-size: 24px; }
            .footer { 
              background: #374151; 
              color: #d1d5db; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px; 
              margin-top: 20px; 
              font-size: 14px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="celebration">🎉✨🎊</div>
              <h1>EMAIL TEST SUCCESSFUL!</h1>
              <p style="font-size: 18px; margin: 0;">Your SMTP configuration is working perfectly!</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <div class="success-badge">
                  ✅ TEST PASSED
                </div>
              </div>
              
              <p><strong>Congratulations!</strong> 🎊</p>
              
              <p>Your email system is now <strong>fully operational</strong> and ready to send customer notifications automatically.</p>
              
              <div class="info-box">
                <p><strong>📧 Email Configuration Details:</strong></p>
                <p><span class="checkmark">✓</span> <strong>Restaurant:</strong> ${tenantName}</p>
                <p><span class="checkmark">✓</span> <strong>From:</strong> ${smtpSettings.smtp_from_name} &lt;${smtpSettings.smtp_from_email}&gt;</p>
                <p><span class="checkmark">✓</span> <strong>SMTP Server:</strong> ${smtpSettings.smtp_host}:${smtpSettings.smtp_port}</p>
                <p><span class="checkmark">✓</span> <strong>Security:</strong> ${smtpSettings.smtp_secure ? 'SSL/TLS Enabled' : 'Standard Connection'}</p>
                <p><span class="checkmark">✓</span> <strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <h3>🚀 What happens next?</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p><span class="checkmark">✓</span> <strong>Order Confirmations:</strong> Customers will automatically receive email confirmations</p>
                <p><span class="checkmark">✓</span> <strong>Status Updates:</strong> Order status changes will be emailed to customers</p>
                <p><span class="checkmark">✓</span> <strong>Custom Templates:</strong> You can customize email templates in the admin panel</p>
                <p><span class="checkmark">✓</span> <strong>Email Logging:</strong> All emails are logged for your reference and troubleshooting</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 20px; color: #10b981; font-weight: bold;">
                  🎯 Your restaurant is ready to serve customers digitally! 🎯
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>OrderWeb Email System</strong></p>
              <p>This test email confirms your SMTP configuration is working correctly.</p>
              <p>If you received this email unexpectedly, please contact your restaurant administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send the test email
      const info = await transporter.sendMail({
        from: `"${smtpSettings.smtp_from_name}" <${smtpSettings.smtp_from_email}>`,
        to: testEmail,
        subject: subject,
        html: html,
      });

      // Log the email sent
      await this.logEmailSent(
        tenantId, 
        {
          to: testEmail,
          subject: subject,
          html: html
        },
        info.messageId,
        'test_email'
      );

      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}`
      };

    } catch (error) {
      console.error('❌ Error sending test email:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('client host rejected') || errorMsg.includes('access denied')) {
          errorMessage = `SMTP Server Access Denied: Your server's IP address (${smtpSettings.smtp_host}) is blocking connections. This usually means:
          
• Your SMTP provider requires IP whitelisting - contact your email provider to whitelist your server IP
• The SMTP server has geographic restrictions
• You need to enable "Less secure app access" or use App Passwords (for Gmail/Yahoo)
• Your hosting provider may be blocking SMTP connections on this port

Suggested Solutions:
1. Contact your email provider to whitelist your server IP
2. Try using port 587 instead of 465 or 25
3. Enable 2FA and use App Passwords instead of regular passwords
4. Consider using email services like SendGrid, Mailgun, or AWS SES`;
        } else if (errorMsg.includes('authentication') || errorMsg.includes('login') || errorMsg.includes('username') || errorMsg.includes('password')) {
          errorMessage = `Authentication Failed: Please check your email credentials:
          
• Verify your email username and password are correct
• For Gmail: Use App Passwords instead of your regular password
• For Outlook/Hotmail: Enable 2FA and use App Passwords
• Some providers require you to enable "Less secure app access"`;
        } else if (errorMsg.includes('timeout') || errorMsg.includes('connection')) {
          errorMessage = `Connection Timeout: Unable to connect to SMTP server:
          
• Check if the SMTP host and port are correct
• Verify your firewall allows outbound connections on this port
• Try different ports: 587 (STARTTLS), 465 (SSL), or 25 (plain)
• Your hosting provider might be blocking SMTP connections`;
        } else if (errorMsg.includes('certificate') || errorMsg.includes('ssl') || errorMsg.includes('tls')) {
          errorMessage = `SSL/TLS Certificate Error: 
          
• Try disabling SSL/TLS security temporarily to test
• Check if your SMTP provider supports the security method you selected
• Some providers require specific SSL/TLS configurations`;
        } else {
          errorMessage = `SMTP Error: ${error.message}
          
Common solutions:
• Double-check all SMTP settings (host, port, username, password)
• Try using App Passwords for Gmail/Yahoo/Outlook
• Contact your email provider for SMTP configuration help
• Consider using dedicated email services like SendGrid or Mailgun`;
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Test tenant SMTP connection
   */
  static async testConnection(tenantSlugOrId: string): Promise<{ success: boolean; message: string }> {
    try {
      let tenantId = tenantSlugOrId;
      
      // If it's not a UUID, assume it's a slug and convert to ID
      if (!tenantSlugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const actualTenantId = await this.getTenantIdFromSlug(tenantSlugOrId);
        if (!actualTenantId) {
          return { success: false, message: 'Tenant not found' };
        }
        tenantId = actualTenantId;
      }
      
      const transporter = await this.createTenantTransporter(tenantId);
      
      if (!transporter) {
        return { success: false, message: 'No tenant SMTP configuration found or SMTP disabled' };
      }

      await transporter.verify();
      return { success: true, message: 'SMTP connection successful' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Legacy method for backward compatibility
  async sendEmailForTenant(tenantSlugOrId: string, emailOptions: EmailOptions): Promise<{success: boolean; messageId?: string; error?: string}> {
    const result = await TenantEmailService.sendEmail(tenantSlugOrId, emailOptions);
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error
    };
  }
}

export const tenantEmailService = new TenantEmailService();
export default TenantEmailService;
