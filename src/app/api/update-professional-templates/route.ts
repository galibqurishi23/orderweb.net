import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔄 Updating email templates to remove emojis and improve professionalism...');

        // Professional Gift Card Template without emojis
        const professionalGiftCardTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card Delivery</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            background-color: #f8f9fa;
            color: #333;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #{PRIMARY_COLOR} 0%, #{SECONDARY_COLOR} 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .header .logo {
            #{LOGO}
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 300;
            margin-top: 20px;
            letter-spacing: 1px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .gift-card-container {
            background: linear-gradient(135deg, #{PRIMARY_COLOR} 0%, #{SECONDARY_COLOR} 100%);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            color: white;
            margin: 30px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }
        
        .gift-card-container::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.05) 10px,
                rgba(255,255,255,0.05) 20px
            );
            pointer-events: none;
        }
        
        .gift-card-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .gift-card-amount {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .gift-card-code {
            background-color: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 8px;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 3px;
            margin-top: 20px;
            border: 2px dashed rgba(255,255,255,0.5);
        }
        
        .expiry-info {
            font-size: 14px;
            opacity: 0.9;
            margin: 15px 0;
        }
        
        .personal-message {
            background-color: #f8f9fa;
            border-left: 4px solid #{PRIMARY_COLOR};
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .personal-message h3 {
            color: #{PRIMARY_COLOR};
            margin-bottom: 10px;
            font-size: 18px;
        }
        
        .personal-message p {
            font-style: italic;
            color: #666;
            font-size: 16px;
        }
        
        .instructions {
            background-color: #ffffff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .instructions h3 {
            color: #{PRIMARY_COLOR};
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .instructions ol {
            margin-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 8px;
            color: #666;
        }
        
        .purchase-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
            border-top: 3px solid #{PRIMARY_COLOR};
        }
        
        .purchase-details p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        
        .footer {
            background-color: #{PRIMARY_COLOR};
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer h4 {
            margin-bottom: 15px;
            font-weight: 300;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: white;
            text-decoration: none;
            background: rgba(255,255,255,0.2);
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 14px;
            transition: background-color 0.3s ease;
        }
        
        .social-links a:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .business-name {
            font-size: 18px;
            font-weight: 600;
            margin-top: 20px;
            letter-spacing: 1px;
        }
        
        .divider {
            height: 2px;
            background: linear-gradient(to right, transparent, #{PRIMARY_COLOR}, transparent);
            margin: 30px 0;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .gift-card-container {
                margin: 20px 0;
                padding: 20px;
            }
            
            .gift-card-amount {
                font-size: 36px;
            }
            
            .gift-card-code {
                font-size: 16px;
                letter-spacing: 2px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">#{LOGO}</div>
            <h1>Gift Card Delivery</h1>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 20px; color: #666;">Dear <strong>#{RECIPIENT_NAME}</strong>,</p>
            
            <p style="margin-bottom: 30px; color: #666;">
                We're delighted to inform you that <strong>#{CUSTOMER_NAME}</strong> has purchased a gift card for you. 
                This gift card is ready to use and can be redeemed at any time.
            </p>
            
            <div class="gift-card-container">
                <div class="gift-card-title">Digital Gift Card</div>
                <div class="gift-card-amount">#{GIFT_CARD_AMOUNT}</div>
                <div class="expiry-info">Valid until: #{EXPIRY_DATE}</div>
                <div class="gift-card-code">#{GIFT_CARD_CODE}</div>
            </div>
            
            <div class="personal-message">
                <h3>Personal Message</h3>
                <p>"#{PERSONAL_MESSAGE}"</p>
                <p style="text-align: right; margin-top: 10px; color: #888;">— #{CUSTOMER_NAME}</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="instructions">
                <h3>How to Redeem Your Gift Card</h3>
                <ol>
                    <li>Visit our restaurant or browse our online menu</li>
                    <li>Select your favorite dishes and add them to your cart</li>
                    <li>During checkout, enter your gift card code above</li>
                    <li>The gift card amount will be applied to your order</li>
                    <li>Enjoy your delicious meal!</li>
                </ol>
            </div>
            
            <div class="purchase-details">
                <p><strong>Purchase Details</strong></p>
                <p>Gift card purchased on #{PURCHASE_DATE}</p>
                <p>This gift card is active and ready to use immediately</p>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; line-height: 1.5;">
                Please keep this email safe as it contains your unique gift card code. 
                If you have any questions, please don't hesitate to contact us.
            </p>
        </div>
        
        <div class="footer">
            <h4>Stay Connected</h4>
            <div class="social-links">
                #{SOCIAL_LINKS}
            </div>
            <div class="business-name">#{RESTAURANT_NAME}</div>
        </div>
    </div>
</body>
</html>`;

        // Update gift card templates - remove emojis from subject and update HTML
        await db.execute(`
            UPDATE email_templates 
            SET subject = REPLACE(REPLACE(REPLACE(REPLACE(subject, '🎁', ''), '🎉', ''), '✨', ''), '💝', ''),
                html_content = ?
            WHERE template_name LIKE '%gift%' OR template_type = 'gift_card'
        `, [professionalGiftCardTemplate]);

        // Update all subjects to professional versions
        await db.execute(`
            UPDATE email_templates 
            SET subject = CASE 
                WHEN template_type = 'gift_card' THEN 'Your Digital Gift Card from #{RESTAURANT_NAME}'
                WHEN template_type = 'order_confirmation' THEN 'Order Confirmation - #{ORDER_ID}'
                ELSE subject
            END
            WHERE template_type IN ('gift_card', 'order_confirmation')
        `);

        console.log('✅ Email templates updated successfully');

        // Get updated templates to verify
        const [updatedTemplates] = await db.query(`
            SELECT template_name, subject, LENGTH(html_content) as content_length
            FROM email_templates 
            WHERE template_name LIKE '%gift%' OR template_type = 'gift_card'
        `) as any[];

        return NextResponse.json({
            success: true,
            message: 'Email templates updated to professional style without emojis',
            updatedTemplates: updatedTemplates
        });

    } catch (error) {
        console.error('❌ Error updating email templates:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
