import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const tenant = url.searchParams.get('tenant') || 'test-tenant';
        
        console.log('🧪 Testing gift card purchase flow...');
        
        // Test data for gift card purchase
        const testData = {
            card_type: 'digital',
            amount: 50,
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            recipient_name: 'Test Recipient',
            recipient_email: 'recipient@example.com',
            personal_message: 'Happy Birthday! Enjoy this gift card.'
        };

        // Call the gift card purchase API
        const purchaseResponse = await fetch(`http://localhost:9002/api/tenant/${tenant}/gift-cards/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const purchaseResult = await purchaseResponse.json();

        // Get recent gift cards to verify creation
        const [recentGiftCards] = await db.query(`
            SELECT gc.*, gco.customer_name, gco.customer_email, gco.order_date
            FROM gift_cards gc
            LEFT JOIN gift_card_orders gco ON gc.id = gco.gift_card_id
            WHERE gc.tenant_id = ?
            ORDER BY gc.created_at DESC
            LIMIT 5
        `, [tenant]) as any[];

        // Get email template info
        const [emailTemplates] = await db.query(`
            SELECT template_name, subject, 
                   LENGTH(html_content) as content_length,
                   CASE 
                       WHEN html_content LIKE '%#{GIFT_CARD_CODE}%' THEN 'Has #{} placeholders'
                       WHEN html_content LIKE '%{{GIFT_CARD_CODE}}%' THEN 'Has {{}} placeholders'
                       ELSE 'No gift card placeholders found'
                   END as placeholder_format
            FROM email_templates 
            WHERE template_name LIKE '%gift%'
        `) as any[];

        return NextResponse.json({
            success: true,
            testResults: {
                purchaseResult,
                recentGiftCards,
                emailTemplates,
                tenantUsed: tenant
            }
        });

    } catch (error) {
        console.error('❌ Error testing gift card:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
