import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const { email, tenantId } = await request.json();

        if (!email || !tenantId) {
            return NextResponse.json({
                success: false,
                error: 'Email and tenant ID are required'
            }, { status: 400 });
        }

        console.log('🔐 Password reset request for email:', email, 'tenant:', tenantId);

        // Check if customer exists for this tenant
        const [customerRows] = await db.execute(
            'SELECT id, name, email FROM customers WHERE email = ? AND tenant_id = ?',
            [email, tenantId]
        );

        if (!Array.isArray(customerRows) || customerRows.length === 0) {
            // For security, return success even if email doesn't exist
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        const customer = customerRows[0] as any;

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

        // Store reset token in database
        await db.execute(
            'UPDATE customers SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetToken, resetTokenExpiry.toISOString(), customer.id]
        );

        // Get tenant settings for email configuration
        const [tenantRows] = await db.execute(
            'SELECT name, slug, smtp_settings FROM tenants WHERE id = ?',
            [tenantId]
        );

        const tenant = (tenantRows as any[])[0] as any;
        const tenantName = tenant?.name || 'Restaurant';
        const tenantSlug = tenant?.slug || 'restaurant';

        // Create reset URL
        const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/${tenantSlug}/customer/reset-password?token=${resetToken}`;

        // Configure email transporter
        let transporter;
        
        try {
            const smtpSettings = tenant?.smtp_settings ? JSON.parse(tenant.smtp_settings) : null;
            
            if (smtpSettings?.enabled && smtpSettings.host) {
                // Use tenant's SMTP settings
                transporter = nodemailer.createTransport({
                    host: smtpSettings.host,
                    port: smtpSettings.port || 587,
                    secure: smtpSettings.secure || false,
                    auth: {
                        user: smtpSettings.username,
                        pass: smtpSettings.password,
                    },
                });
            } else {
                // Use default Gmail SMTP (fallback)
                transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
            }

            // Email content
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset - ${tenantName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4F46E5; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background-color: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
                        .security-note { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                            <p>Reset your password for ${tenantName}</p>
                        </div>
                        <div class="content">
                            <p>Hello ${customer.name},</p>
                            
                            <p>We received a request to reset your password for your ${tenantName} account. If you made this request, click the button below to reset your password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset My Password</a>
                            </div>
                            
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
                                ${resetUrl}
                            </p>
                            
                            <div class="security-note">
                                <h4>🛡️ Security Information:</h4>
                                <ul>
                                    <li>This link will expire in <strong>1 hour</strong></li>
                                    <li>If you didn't request this reset, please ignore this email</li>
                                    <li>Your password won't change until you click the link and create a new one</li>
                                </ul>
                            </div>
                            
                            <p>If you continue to have problems, please contact us at ${tenantName}.</p>
                            
                            <p>Best regards,<br>The ${tenantName} Team</p>
                        </div>
                        <div class="footer">
                            <p>This email was sent to ${email} because a password reset was requested for your ${tenantName} account.</p>
                            <p>© ${new Date().getFullYear()} ${tenantName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Send email
            await transporter.sendMail({
                from: smtpSettings?.from_email || process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: email,
                subject: `🔐 Password Reset - ${tenantName}`,
                html: emailHtml,
                text: `Hello ${customer.name},\n\nWe received a request to reset your password for your ${tenantName} account.\n\nClick here to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this reset, please ignore this email.\n\nBest regards,\nThe ${tenantName} Team`
            });

            console.log('✅ Password reset email sent successfully to:', email);

        } catch (emailError) {
            console.error('❌ Failed to send password reset email:', emailError);
            
            // Clean up the reset token since email failed
            await db.execute(
                'UPDATE customers SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
                [customer.id]
            );
            
            return NextResponse.json({
                success: false,
                error: 'Failed to send password reset email. Please try again later.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Password reset link has been sent to your email address.'
        });

    } catch (error) {
        console.error('❌ Password reset request error:', error);
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred. Please try again later.'
        }, { status: 500 });
    }
}
