import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        // Get list of tenants
        const [tenants] = await db.query(`
            SELECT DISTINCT tenant_id FROM gift_card_settings 
            UNION 
            SELECT DISTINCT tenant FROM menu_items 
            LIMIT 10
        `) as any[];

        // Get recent gift cards with details
        const [recentGiftCards] = await db.query(`
            SELECT 
                gc.tenant_id,
                gc.card_number,
                gc.amount,
                gc.status,
                gc.created_at,
                gco.customer_name,
                gco.customer_email,
                gco.payment_status
            FROM gift_cards gc
            LEFT JOIN gift_card_orders gco ON gc.id = gco.gift_card_id
            ORDER BY gc.created_at DESC
            LIMIT 10
        `) as any[];

        // Check email templates
        const [emailTemplates] = await db.query(`
            SELECT 
                template_name, 
                subject,
                CASE 
                    WHEN html_content LIKE '%#{GIFT_CARD_CODE}%' THEN 'Uses #{} format'
                    WHEN html_content LIKE '%{{GIFT_CARD_CODE}}%' THEN 'Uses {{}} format'
                    ELSE 'No placeholders'
                END as placeholder_format
            FROM email_templates 
            WHERE template_name LIKE '%gift%' OR subject LIKE '%gift%'
        `) as any[];

        return NextResponse.json({
            success: true,
            data: {
                availableTenants: tenants,
                recentGiftCards,
                emailTemplates,
                summary: {
                    totalTenants: tenants.length,
                    recentGiftCardsCount: recentGiftCards.length,
                    emailTemplatesCount: emailTemplates.length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error checking gift card data:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
