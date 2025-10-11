import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  console.log("🧪 [TEST-EMAIL] Starting test email process...");
  
  try {
    const body = await request.json();
    const { email, tenant: tenantSlug } = body;

    console.log("📝 [TEST-EMAIL] Request data:", { email, tenantSlug });

    if (!tenantSlug) {
      console.error("❌ [TEST-EMAIL] Missing tenant slug");
      return NextResponse.json({ error: "Tenant is required" }, { status: 400 });
    }

    if (!email) {
      console.error("❌ [TEST-EMAIL] Missing email address");
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    console.log("🔍 [TEST-EMAIL] Fetching tenant SMTP settings...");
    
    // Get tenant SMTP settings
    const [rows] = await pool.execute(
      "SELECT name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from FROM tenants WHERE slug = ?",
      [tenantSlug]
    );

    const tenants = rows as any[];
    console.log("🔍 [TEST-EMAIL] Tenant query result:", { foundCount: tenants.length });
    
    if (tenants.length === 0) {
      console.error("❌ [TEST-EMAIL] Tenant not found:", tenantSlug);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenant = tenants[0];
    console.log("✅ [TEST-EMAIL] Found tenant:", { 
      name: tenant.name, 
      smtp_host: tenant.smtp_host,
      smtp_port: tenant.smtp_port,
      smtp_secure: tenant.smtp_secure,
      smtp_user: tenant.smtp_user,
      smtp_from: tenant.smtp_from,
      hasPassword: !!tenant.smtp_password
    });

    // Check if SMTP settings are configured
    if (!tenant.smtp_host || !tenant.smtp_user || !tenant.smtp_password) {
      const missingFields = [];
      if (!tenant.smtp_host) missingFields.push('host');
      if (!tenant.smtp_user) missingFields.push('username');
      if (!tenant.smtp_password) missingFields.push('password');
      
      console.error("❌ [TEST-EMAIL] Missing SMTP settings:", missingFields);
      return NextResponse.json({ 
        error: `SMTP settings are not configured. Missing: ${missingFields.join(', ')}. Please configure your email settings first.` 
      }, { status: 400 });
    }

    console.log("🔧 [TEST-EMAIL] Creating nodemailer transporter...");
    
    // Create nodemailer transporter
    const transporterConfig = {
      host: tenant.smtp_host,
      port: tenant.smtp_port,
      secure: Boolean(tenant.smtp_secure), // true for 465, false for other ports
      auth: {
        user: tenant.smtp_user,
        pass: tenant.smtp_password,
      },
    };
    
    console.log("🔧 [TEST-EMAIL] Transporter config:", {
      ...transporterConfig,
      auth: { ...transporterConfig.auth, pass: "***" }
    });
    
    const transporter = nodemailer.createTransport(transporterConfig);

    console.log("📧 [TEST-EMAIL] Sending test email...");
    
    // Send test email
    const emailContent = {
      from: tenant.smtp_from || tenant.smtp_user,
      to: email,
      subject: `Test Email from ${tenant.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Configuration Test</h2>
          <p>This is a test email from <strong>${tenant.name}</strong> to verify your SMTP configuration.</p>
          <p>If you received this email, your email settings are working correctly!</p>
          <hr style="margin: 20px 0; border: none; height: 1px; background-color: #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from your OrderWeb restaurant management system.<br>
            Time: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
        Email Configuration Test
        
        This is a test email from ${tenant.name} to verify your SMTP configuration.
        
        If you received this email, your email settings are working correctly!
        
        This email was sent from your OrderWeb restaurant management system.
        Time: ${new Date().toLocaleString()}
      `
    };
    
    console.log("📧 [TEST-EMAIL] Email content:", {
      from: emailContent.from,
      to: emailContent.to,
      subject: emailContent.subject
    });
    
    const info = await transporter.sendMail(emailContent);

    console.log("✅ [TEST-EMAIL] Email sent successfully:", { messageId: info.messageId, response: info.response });

    return NextResponse.json({ 
      success: true, 
      message: "Test email sent successfully",
      messageId: info.messageId,
      response: info.response
    });
  } catch (error) {
    console.error("💥 [TEST-EMAIL] Error sending test email:", error);
    
    // Handle specific SMTP errors
    let errorMessage = "Failed to send test email. Please check your settings.";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorDetails = error.message;
      console.error("💥 [TEST-EMAIL] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message.includes("authentication failed") || error.message.includes("Invalid login")) {
        errorMessage = "Authentication failed. Please check your username and password.";
      } else if (error.message.includes("connect ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        errorMessage = "Cannot connect to SMTP server. Please check your host and port settings.";
      } else if (error.message.includes("certificate") || error.message.includes("SSL") || error.message.includes("TLS")) {
        errorMessage = "SSL/TLS certificate error. Please check your security settings.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Connection timeout. Please check your network and SMTP server settings.";
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}
