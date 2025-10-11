import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        console.log('🔍 Checking and creating gift card tables...');

        // Create gift_cards table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_cards (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                card_number VARCHAR(20) UNIQUE NOT NULL,
                card_type ENUM('digital', 'physical') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                remaining_balance DECIMAL(10,2) NOT NULL,
                status ENUM('active', 'redeemed', 'expired', 'cancelled') DEFAULT 'active',
                expiry_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_card_number (card_number),
                INDEX idx_status (status)
            )
        `);
        console.log('✅ gift_cards table ready');

        // Create gift_card_orders table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_orders (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                gift_card_id VARCHAR(36) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50),
                recipient_name VARCHAR(255),
                recipient_email VARCHAR(255),
                recipient_address TEXT,
                personal_message TEXT,
                order_amount DECIMAL(10,2) NOT NULL,
                payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                payment_transaction_id VARCHAR(255),
                delivery_status ENUM('pending', 'sent', 'delivered') DEFAULT 'pending',
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_date TIMESTAMP NULL,
                delivered_date TIMESTAMP NULL,
                FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_gift_card_id (gift_card_id),
                INDEX idx_customer_email (customer_email)
            )
        `);
        console.log('✅ gift_card_orders table ready');

        // Create gift_card_transactions table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_transactions (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                gift_card_id VARCHAR(36) NOT NULL,
                transaction_type ENUM('purchase', 'redemption', 'refund', 'adjustment') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                remaining_balance DECIMAL(10,2) NOT NULL,
                description TEXT,
                reference_order_id VARCHAR(36),
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_gift_card_id (gift_card_id),
                INDEX idx_transaction_type (transaction_type)
            )
        `);
        console.log('✅ gift_card_transactions table ready');

        // Create gift card settings table if it doesn't exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_settings (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL UNIQUE,
                enabled BOOLEAN DEFAULT TRUE,
                min_custom_amount DECIMAL(10,2) DEFAULT 10.00,
                max_custom_amount DECIMAL(10,2) DEFAULT 500.00,
                default_expiry_months INT DEFAULT 12,
                allow_custom_amounts BOOLEAN DEFAULT TRUE,
                physical_delivery_enabled BOOLEAN DEFAULT FALSE,
                digital_delivery_enabled BOOLEAN DEFAULT TRUE,
                terms_and_conditions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id)
            )
        `);
        console.log('✅ gift_card_settings table ready');

        // Check for existing tenants and insert default settings
        try {
            const [tenants] = await db.query('SELECT DISTINCT tenant FROM menu_items LIMIT 5') as any[];
            for (const tenant of tenants) {
                const tenantId = tenant.tenant;
                await db.execute(`
                    INSERT IGNORE INTO gift_card_settings (id, tenant_id) 
                    VALUES (?, ?)
                `, [uuidv4(), tenantId]);
            }
            console.log('✅ Default settings created for existing tenants');
        } catch (error) {
            console.log('⚠️ Could not create default settings:', (error as Error).message);
        }

        // Check existing data
        const [giftCards] = await db.query(`SELECT COUNT(*) as count FROM gift_cards`) as any[];
        const [orders] = await db.query(`SELECT COUNT(*) as count FROM gift_card_orders`) as any[];
        
        // Check email templates with proper column names
        let templates: any[] = [];
        try {
            const [templateResult] = await db.query(`
                SELECT template_name, subject, html_content 
                FROM email_templates 
                WHERE template_name LIKE '%gift%' OR subject LIKE '%gift%'
                LIMIT 5
            `) as any[];
            templates = templateResult;
        } catch (templateError) {
            console.log('⚠️ Could not fetch email templates:', (templateError as Error).message);
            // Try alternative query
            try {
                const [altTemplateResult] = await db.query(`SHOW COLUMNS FROM email_templates`) as any[];
                console.log('📋 Email templates table columns:', altTemplateResult);
            } catch (showError) {
                console.log('⚠️ Could not show email template columns:', (showError as Error).message);
            }
        }

        const results = {
            success: true,
            message: 'Gift card tables setup complete!',
            data: {
                totalGiftCards: giftCards[0].count,
                totalOrders: orders[0].count,
                emailTemplates: templates,
                tablesCreated: ['gift_cards', 'gift_card_orders', 'gift_card_transactions', 'gift_card_settings']
            }
        };

        console.log('🎉 Setup results:', results);
        return NextResponse.json(results);
        
    } catch (error) {
        console.error('❌ Error setting up gift card tables:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
