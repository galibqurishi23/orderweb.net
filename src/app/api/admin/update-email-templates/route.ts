import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Updating email templates with improved design...');

        // Get the improved gift card template
        const improvedGiftCardTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card Delivery</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, {{PRIMARY_COLOR}}, {{SECONDARY_COLOR}}); padding: 30px 20px; text-align: center; }
        .logo { max-height: 60px; margin-bottom: 15px; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 40px 30px; }
        
        .gift-card-container { 
            background: linear-gradient(135deg, {{PRIMARY_COLOR}}, {{SECONDARY_COLOR}}); 
            border-radius: 20px; 
            padding: 40px 30px; 
            text-align: center; 
            color: white; 
            margin: 30px 0; 
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
        }
        
        .gift-card-title { font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .gift-card-amount { font-size: 36px; font-weight: 700; margin: 20px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .gift-card-code { 
            background: rgba(255,255,255,0.2); 
            padding: 15px 25px; 
            border-radius: 50px; 
            font-family: 'Courier New', monospace; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 20px 0; 
            border: 2px dashed rgba(255,255,255,0.5);
            display: inline-block;
        }
        
        .personal-message { 
            background: linear-gradient(135deg, #fff8e1, #f3e5ab); 
            border-left: 4px solid {{PRIMARY_COLOR}}; 
            padding: 25px; 
            margin: 30px 0; 
            border-radius: 8px; 
            font-style: italic; 
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .instructions { 
            background-color: #f8f9fa; 
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0; 
            border: 1px solid #e9ecef;
        }
        
        .instructions h3 { color: {{PRIMARY_COLOR}}; margin-top: 0; font-size: 18px; }
        .instructions ol { padding-left: 20px; }
        .instructions li { margin: 8px 0; color: #495057; }
        
        .footer { 
            background: linear-gradient(135deg, {{SECONDARY_COLOR}}, {{PRIMARY_COLOR}}); 
            padding: 30px 20px; 
            text-align: center; 
            color: white; 
        }
        
        .social-links { margin: 20px 0; }
        .social-links a { 
            display: inline-block; 
            margin: 0 12px; 
            color: white; 
            text-decoration: none; 
            background: rgba(255,255,255,0.2); 
            padding: 10px; 
            border-radius: 50%; 
            transition: all 0.3s ease;
        }
        
        .business-name { font-size: 18px; font-weight: 600; margin: 20px 0 0 0; }
        
        @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px; }
            .gift-card-container { padding: 25px 15px; margin: 20px 0; }
            .gift-card-amount { font-size: 28px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{LOGO}}
            <h1>Gift Card Delivery</h1>
        </div>
        
        <div class="content">
            <h2 style="color: {{PRIMARY_COLOR}}; font-weight: 300; font-size: 24px;">Your Gift Card is Ready!</h2>
            
            <div class="personal-message">
                Hello {{RECIPIENT_NAME}}, Love from {{SENDER_NAME}}. {{PERSONAL_MESSAGE}}
            </div>
            
            <div class="gift-card-container">
                <div class="gift-card-title">GIFT CARD</div>
                <div class="gift-card-amount">{{GIFT_CARD_AMOUNT}}</div>
                <div style="font-size: 14px; opacity: 0.9; margin: 15px 0;">Valid until: {{EXPIRY_DATE}}</div>
                <div class="gift-card-code">{{GIFT_CARD_CODE}}</div>
            </div>
            
            <div class="instructions">
                <h3>How to Use Your Gift Card:</h3>
                <ol>
                    <li>Visit our shop online or in person</li>
                    <li>Choose your favorite items</li>
                    <li>Enter your gift card code at checkout</li>
                    <li>Enjoy your delicious meal!</li>
                </ol>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; text-align: center; margin: 30px 0;">
                This gift card was purchased on {{PURCHASE_DATE}} and is ready to use immediately.
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0;">Stay Connected</p>
            <div class="social-links">
                {{SOCIAL_LINKS}}
            </div>
            <div class="business-name">{{RESTAURANT_NAME}}</div>
        </div>
    </div>
</body>
</html>`;

        // Update all gift card templates
        await pool.execute(
            `UPDATE email_templates 
             SET html_content = ? 
             WHERE template_type = 'gift_card'`,
            [improvedGiftCardTemplate]
        );

        console.log('✅ Updated gift card templates');

        // Update default colors for all templates
        await pool.execute(
            `UPDATE email_templates 
             SET primary_color = COALESCE(NULLIF(primary_color, ''), '#059669'),
                 secondary_color = COALESCE(NULLIF(secondary_color, ''), '#047857'),
                 background_color = COALESCE(NULLIF(background_color, ''), '#f8f9fa')`
        );

        console.log('✅ Updated default template colors');

        return NextResponse.json({
            success: true,
            message: 'Email templates updated successfully with improved design'
        });

    } catch (error) {
        console.error('❌ Error updating email templates:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to update email templates',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
