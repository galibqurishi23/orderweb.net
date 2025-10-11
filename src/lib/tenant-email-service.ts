import pool from "@/lib/db";
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TenantEmailService {
  async sendEmailForTenant(tenantSlug: string, emailOptions: EmailOptions): Promise<SendEmailResponse> {
    try {
      console.log(`📧 [TENANT-EMAIL] Sending email for tenant: ${tenantSlug}`);
      
      // Get tenant SMTP settings
      const [rows] = await pool.execute(
        "SELECT name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from FROM tenants WHERE slug = ?",
        [tenantSlug]
      );

      const tenants = rows as any[];
      
      if (tenants.length === 0) {
        console.error(`❌ [TENANT-EMAIL] Tenant not found: ${tenantSlug}`);
        return { success: false, error: "Tenant not found" };
      }

      const tenant = tenants[0];
      
      // Check if SMTP settings are configured
      if (!tenant.smtp_host || !tenant.smtp_user || !tenant.smtp_password) {
        const missingFields = [];
        if (!tenant.smtp_host) missingFields.push('host');
        if (!tenant.smtp_user) missingFields.push('username');
        if (!tenant.smtp_password) missingFields.push('password');
        
        console.error(`❌ [TENANT-EMAIL] Missing SMTP settings for ${tenantSlug}:`, missingFields);
        return { 
          success: false, 
          error: `SMTP settings not configured. Missing: ${missingFields.join(', ')}` 
        };
      }

      // Create nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: tenant.smtp_host,
        port: tenant.smtp_port,
        secure: Boolean(tenant.smtp_secure),
        auth: {
          user: tenant.smtp_user,
          pass: tenant.smtp_password,
        },
      });

      // Send email
      const mailOptions = {
        from: tenant.smtp_from || tenant.smtp_user,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text || emailOptions.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      console.log(`📧 [TENANT-EMAIL] Sending email to: ${emailOptions.to}`);
      const result = await transporter.sendMail(mailOptions);
      
      // Log to database
      try {
        await pool.execute(
          `INSERT INTO email_logs (tenant_slug, email_type, recipient, subject, status, message_id, sent_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [tenantSlug, 'order_confirmation', emailOptions.to, emailOptions.subject, 'sent', result.messageId]
        );
      } catch (logError) {
        console.error('❌ [TENANT-EMAIL] Failed to log email:', logError);
      }

      console.log(`✅ [TENANT-EMAIL] Email sent successfully. Message ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`❌ [TENANT-EMAIL] Error sending email for tenant ${tenantSlug}:`, error);
      
      // Log failed email to database
      try {
        await pool.execute(
          `INSERT INTO email_logs (tenant_slug, email_type, recipient, subject, status, error_message, sent_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [tenantSlug, 'order_confirmation', emailOptions.to, emailOptions.subject, 'failed', (error as Error).message]
        );
      } catch (logError) {
        console.error('❌ [TENANT-EMAIL] Failed to log email error:', logError);
      }

      return { success: false, error: (error as Error).message };
    }
  }
}

export const tenantEmailService = new TenantEmailService();