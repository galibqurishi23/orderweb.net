import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
    try {
        // Create email_templates table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                template_type ENUM('order_confirmation', 'gift_card') NOT NULL,
                template_name VARCHAR(255) NOT NULL,
                subject_line VARCHAR(500) NOT NULL,
                html_content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                
                -- Customization Settings
                logo_url VARCHAR(500) DEFAULT NULL,
                primary_color VARCHAR(7) DEFAULT '#3b82f6',
                secondary_color VARCHAR(7) DEFAULT '#64748b',
                background_color VARCHAR(7) DEFAULT '#ffffff',
                text_color VARCHAR(7) DEFAULT '#1f2937',
                
                -- Social Media Links
                facebook_url VARCHAR(500) DEFAULT NULL,
                instagram_url VARCHAR(500) DEFAULT NULL,
                tiktok_url VARCHAR(500) DEFAULT NULL,
                website_url VARCHAR(500) DEFAULT NULL,
                
                -- Email Settings
                from_name VARCHAR(255) DEFAULT NULL,
                from_email VARCHAR(255) DEFAULT NULL,
                reply_to_email VARCHAR(255) DEFAULT NULL,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_template (tenant_id, template_type),
                INDEX idx_tenant_type (tenant_id, template_type)
            )
        `);
        
        // Create email_logs table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                email_type ENUM('order_confirmation', 'gift_card') NOT NULL,
                recipient_email VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                status ENUM('sent', 'failed') NOT NULL,
                order_id VARCHAR(255) DEFAULT NULL,
                error_message TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_tenant (tenant_id),
                INDEX idx_order (order_id)
            )
        `);

        // Get all tenants to insert default templates
        const [tenants] = await pool.execute('SELECT id, name FROM tenants') as any[];
        
        for (const tenant of tenants) {
            // Insert default Order Confirmation Template
            await pool.execute(`
                INSERT IGNORE INTO email_templates 
                (tenant_id, template_type, template_name, subject_line, html_content) 
                VALUES (?, 'order_confirmation', 'Order Confirmation', 'Your Order Confirmation - #{ORDER_ID}', ?)
            `, [
                tenant.id,
                getDefaultOrderTemplate()
            ]);

            // Insert default Gift Card Template
            await pool.execute(`
                INSERT IGNORE INTO email_templates 
                (tenant_id, template_type, template_name, subject_line, html_content) 
                VALUES (?, 'gift_card', 'Gift Card Delivery', 'Your Gift Card is Ready! 🎁', ?)
            `, [
                tenant.id,
                getDefaultGiftCardTemplate()
            ]);
        }
        
        return NextResponse.json({ 
            success: true, 
            message: 'Email templates tables created and default templates inserted successfully',
            tenantsProcessed: tenants.length
        });

    } catch (error) {
        console.error('Error creating email templates:', error);
        return NextResponse.json(
            { 
                error: 'Failed to create email templates tables',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

function getDefaultOrderTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #{BACKGROUND_COLOR}; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #{PRIMARY_COLOR}; padding: 20px; text-align: center; }
        .logo { max-height: 60px; }
        .content { padding: 30px; }
        .order-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .personal-message { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; font-style: italic; font-size: 16px; }
        .footer { background-color: #{SECONDARY_COLOR}; padding: 20px; text-align: center; color: white; }
        .social-links a { margin: 0 10px; color: white; text-decoration: none; }
        .message-box { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            #{LOGO}
            <h1 style="color: white; margin: 10px 0 0 0;">Order Confirmation</h1>
        </div>
        
        <div class="content">
            <h2>Thank you for your order!</h2>
            <p>Hi #{CUSTOMER_NAME},</p>
            <p>We've received your order and are preparing it with care.</p>
            
            #{PERSONAL_MESSAGE}
            
            <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> #{ORDER_ID}</p>
                <p><strong>Order Date:</strong> #{ORDER_DATE}</p>
                <p><strong>Delivery Method:</strong> #{DELIVERY_METHOD}</p>
                
                <h4>Items Ordered:</h4>
                #{ORDER_ITEMS}
                
                <div style="border-top: 2px solid #{PRIMARY_COLOR}; padding-top: 10px; margin-top: 15px;">
                    <p style="font-size: 18px; font-weight: bold;">Total: #{TOTAL_AMOUNT}</p>
                </div>
            </div>
            
            #{DELIVERY_INFO}
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
        
        <div class="footer">
            <p>Follow us on:</p>
            <div class="social-links">
                #{SOCIAL_LINKS}
            </div>
            <p style="margin-top: 15px;">#{BUSINESS_NAME}</p>
        </div>
    </div>
</body>
</html>`;
}

function getDefaultGiftCardTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card Delivery</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #{BACKGROUND_COLOR}; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #{PRIMARY_COLOR}; padding: 20px; text-align: center; }
        .logo { max-height: 60px; }
        .content { padding: 30px; }
        .gift-card { background: linear-gradient(135deg, #{PRIMARY_COLOR}, #{SECONDARY_COLOR}); 
                     padding: 30px; border-radius: 15px; text-align: center; color: white; margin: 20px 0; }
        .personal-message { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%); 
                           padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; font-size: 18px; font-weight: bold; }
        .footer { background-color: #{SECONDARY_COLOR}; padding: 20px; text-align: center; color: white; }
        .social-links a { margin: 0 10px; color: white; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            #{LOGO}
            <h1 style="color: white; margin: 10px 0 0 0;">🎁 Gift Card Delivery</h1>
        </div>
        
        <div class="content">
            <h2>Your Gift Card is Ready!</h2>
            
            #{PERSONAL_MESSAGE}
            
            <div class="gift-card">
                <h2 style="margin: 0 0 10px 0;">🎉 GIFT CARD 🎉</h2>
                <p style="font-size: 24px; font-weight: bold; margin: 15px 0;">#{GIFT_CARD_AMOUNT}</p>
                <p style="margin: 5px 0;">Valid until: #{EXPIRY_DATE}</p>
                
                #{GIFT_CARD_CODE}
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>How to Use Your Gift Card:</h3>
                <ol>
                    <li>Visit our shop online or in person</li>
                    <li>Choose your favorite items</li>
                    <li>Enter your gift card code at checkout</li>
                    <li>Enjoy your delicious meal!</li>
                </ol>
            </div>
            
            <p>This gift card was purchased on #{PURCHASE_DATE} and is ready to use immediately.</p>
        </div>
        
        <div class="footer">
            <p>Follow us on:</p>
            <div class="social-links">
                #{SOCIAL_LINKS}
            </div>
            <p style="margin-top: 15px;">#{BUSINESS_NAME}</p>
        </div>
    </div>
</body>
</html>`;
}
