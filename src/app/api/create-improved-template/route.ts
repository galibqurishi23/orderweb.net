import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('Creating improved conditional template...');

        // Template with better conditional structure
        const improvedTemplate = `
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.5;
            background-color: {{BACKGROUND_COLOR}};
            color: {{TEXT_COLOR}};
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        /* HEADER SECTION */
        .header {
            background: linear-gradient(135deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .logo img {
            max-height: 50px;
            max-width: 180px;
            margin-bottom: 25px;
            object-fit: contain;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 600;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }
        
        .header .subtitle {
            font-size: 16px;
            font-weight: 400;
            opacity: 0.9;
            margin: 0;
        }
        
        /* BODY SECTION */
        .body {
            padding: 40px 30px;
            background-color: #ffffff;
        }
        
        .greeting {
            font-size: 20px;
            font-weight: 500;
            color: {{TEXT_COLOR}};
            margin-bottom: 25px;
        }
        
        .greeting .name {
            color: {{PRIMARY_COLOR}};
            font-weight: 600;
        }
        
        .main-text {
            font-size: 16px;
            color: {{TEXT_COLOR}};
            line-height: 1.6;
            margin-bottom: 35px;
        }
        
        .main-text strong {
            font-weight: 600;
            color: {{TEXT_COLOR}};
        }
        
        /* GIFT CARD */
        .gift-card {
            background: linear-gradient(135deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 100%);
            border-radius: 16px;
            padding: 35px 30px;
            text-align: center;
            color: white;
            margin: 35px 0;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            position: relative;
        }
        
        .gift-card-label {
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 20px;
            opacity: 0.9;
        }
        
        .gift-card-amount {
            font-size: 48px;
            font-weight: 700;
            margin: 20px 0 25px 0;
            letter-spacing: -1px;
        }
        
        .gift-card-expiry {
            font-size: 14px;
            margin-bottom: 20px;
            opacity: 0.9;
        }
        
        .gift-card-code {
            background: rgba(255, 255, 255, 0.2);
            border: 2px dashed rgba(255, 255, 255, 0.4);
            border-radius: 8px;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: 600;
            letter-spacing: 1px;
            margin-top: 5px;
        }
        
        /* PERSONAL MESSAGE - Conditional Section */
        .personal-message {
            background: linear-gradient(to right, rgba(74, 144, 226, 0.08), rgba(74, 144, 226, 0.03));
            border-left: 4px solid {{PRIMARY_COLOR}};
            border-radius: 0 8px 8px 0;
            padding: 25px;
            margin: 35px 0;
        }
        
        .personal-message h3 {
            font-size: 16px;
            font-weight: 600;
            color: {{PRIMARY_COLOR}};
            margin-bottom: 15px;
        }
        
        .personal-message .message-text {
            font-style: italic;
            color: {{TEXT_COLOR}};
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        
        .personal-message .from {
            text-align: right;
            font-size: 14px;
            font-weight: 500;
            color: {{PRIMARY_COLOR}};
        }
        
        /* DIVIDER LINE */
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, {{PRIMARY_COLOR}}, transparent);
            margin: 35px 0;
            opacity: 0.3;
        }
        
        /* INSTRUCTIONS SECTION */
        .instructions {
            background: #f8f9fb;
            border: 1px solid #e9ecf1;
            border-radius: 12px;
            padding: 30px;
            margin: 35px 0;
        }
        
        .instructions h3 {
            font-size: 18px;
            font-weight: 600;
            color: {{PRIMARY_COLOR}};
            margin-bottom: 20px;
        }
        
        .instructions ol {
            margin: 0;
            padding-left: 20px;
            color: {{TEXT_COLOR}};
        }
        
        .instructions li {
            font-size: 15px;
            margin-bottom: 10px;
            line-height: 1.5;
        }
        
        /* PURCHASE INFO */
        .purchase-info {
            background: #f8f9fb;
            border-top: 2px solid {{PRIMARY_COLOR}};
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 35px 0;
        }
        
        .purchase-info p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        
        .purchase-info .date {
            font-weight: 600;
            color: {{TEXT_COLOR}};
        }
        
        /* CLEAN FOOTER SECTION */
        .footer {
            background: linear-gradient(135deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        /* Add subtle pattern overlay */
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100%" height="100%" fill="url(%23dots)"/></svg>');
            opacity: 0.3;
            pointer-events: none;
        }
        
        .footer-content {
            position: relative;
            z-index: 1;
        }
        
        .footer h4 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 25px;
            letter-spacing: 0.5px;
        }
        
        /* CLEAN SOCIAL BUTTONS - NO COLORFUL EFFECTS */
        .social-section {
            margin: 30px 0;
        }
        
        .social-buttons {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .social-btn {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            text-decoration: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }
        
        .social-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            color: white;
        }
        
        .social-caption {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 10px;
            font-style: italic;
        }
        
        /* RESTAURANT NAME */
        .restaurant-name {
            font-size: 28px;
            font-weight: 700;
            margin: 35px 0 20px 0;
            letter-spacing: 1px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* FOOTER MESSAGE */
        .footer-message {
            font-size: 15px;
            line-height: 1.6;
            opacity: 0.9;
            max-width: 400px;
            margin: 0 auto;
        }
        
        .footer-divider {
            width: 60px;
            height: 2px;
            background: rgba(255, 255, 255, 0.3);
            margin: 25px auto;
            border-radius: 1px;
        }
        
        /* MOBILE RESPONSIVE */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .email-container {
                border-radius: 8px;
            }
            
            .header, .body, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 26px;
            }
            
            .gift-card {
                margin: 25px 0;
                padding: 25px 20px;
            }
            
            .gift-card-amount {
                font-size: 38px;
            }
            
            .social-buttons {
                gap: 12px;
            }
            
            .social-btn {
                width: 45px;
                height: 45px;
                font-size: 13px;
            }
            
            .restaurant-name {
                font-size: 22px;
            }
            
            .footer-message {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- HEADER -->
        <div class="header">
            <div class="logo">
                {{LOGO}}
            </div>
            <h1>Gift Card Delivery</h1>
            <div class="subtitle">Digital Gift Card</div>
        </div>
        
        <!-- BODY -->
        <div class="body">
            <div class="greeting">
                Dear <span class="name">{{RECIPIENT_NAME}}</span>,
            </div>
            
            <div class="main-text">
                We're pleased to inform you that <strong>{{CUSTOMER_NAME}}</strong> has purchased a digital 
                gift card for you. This gift card is ready to use immediately and can be 
                redeemed at our restaurant or for online orders.
            </div>
            
            <!-- GIFT CARD -->
            <div class="gift-card">
                <div class="gift-card-label">Digital Gift Card</div>
                <div class="gift-card-amount">{{GIFT_CARD_AMOUNT}}</div>
                <div class="gift-card-expiry">Valid until: {{EXPIRY_DATE}}</div>
                <div class="gift-card-code">{{GIFT_CARD_CODE}}</div>
            </div>
            
            <!-- CONDITIONAL PERSONAL MESSAGE SECTION -->
            <div class="personal-message" id="personal-message-section">
                <h3>Personal Message</h3>
                <div class="message-text">{{PERSONAL_MESSAGE}}</div>
                <div class="from">— {{CUSTOMER_NAME}}</div>
            </div>
            
            <div class="divider"></div>
            
            <!-- INSTRUCTIONS -->
            <div class="instructions">
                <h3>How to Use Your Gift Card</h3>
                <ol>
                    <li>Visit our restaurant or browse our online menu</li>
                    <li>Select your favorite items and add to cart</li>
                    <li>Enter the gift card code during checkout</li>
                    <li>The amount will be applied to your order</li>
                    <li>Enjoy your delicious meal!</li>
                </ol>
            </div>
            
            <div class="purchase-info">
                <p><strong>Purchase Date:</strong> <span class="date">{{PURCHASE_DATE}}</span></p>
                <p>This gift card is active and ready to use</p>
            </div>
        </div>
        
        <!-- CLEAN FOOTER -->
        <div class="footer">
            <div class="footer-content">
                <h4>Stay Connected</h4>
                
                <div class="social-section">
                    <div class="social-buttons">
                        {{SOCIAL_LINKS}}
                    </div>
                    <div class="social-caption">
                        Follow us for updates, special offers & delicious content
                    </div>
                </div>
                
                <div class="footer-divider"></div>
                
                <div class="restaurant-name">{{RESTAURANT_NAME}}</div>
                
                <div class="footer-message">
                    Thank you for choosing us. We look forward to serving you an unforgettable dining experience!
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

        // Update the template
        await db.execute(`
            UPDATE email_templates 
            SET html_content = ?
            WHERE template_name LIKE '%gift%' OR template_type = 'gift_card'
        `, [improvedTemplate]);

        console.log('Improved conditional template created');

        return NextResponse.json({
            success: true,
            message: 'Template updated with improved conditional personal message handling'
        });

    } catch (error) {
        console.error('Error creating improved template:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
