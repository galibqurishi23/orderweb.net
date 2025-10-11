import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Creating gift card tables...');

        // Gift Cards Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_cards (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL,
                card_number VARCHAR(20) UNIQUE NOT NULL,
                card_type ENUM('digital', 'physical') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                remaining_balance DECIMAL(10,2) NOT NULL,
                status ENUM('active', 'redeemed', 'expired', 'cancelled') DEFAULT 'active',
                expiry_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_card_number (card_number),
                INDEX idx_status (status)
            )
        `);

        // Gift Card Orders Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_orders (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL,
                gift_card_id VARCHAR(36) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(20),
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
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_gift_card_id (gift_card_id),
                INDEX idx_payment_status (payment_status),
                INDEX idx_delivery_status (delivery_status)
            )
        `);

        // Gift Card Transactions Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_transactions (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL,
                gift_card_id VARCHAR(36) NOT NULL,
                transaction_type ENUM('purchase', 'redemption', 'refund', 'adjustment') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                remaining_balance DECIMAL(10,2) NOT NULL,
                description TEXT,
                reference_order_id VARCHAR(36),
                created_by VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_gift_card_id (gift_card_id),
                INDEX idx_transaction_type (transaction_type)
            )
        `);

        // Gift Card Settings Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_settings (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) UNIQUE NOT NULL,
                fixed_amounts JSON,
                allow_custom_amount BOOLEAN DEFAULT TRUE,
                min_custom_amount DECIMAL(10,2) DEFAULT 10.00,
                max_custom_amount DECIMAL(10,2) DEFAULT 500.00,
                default_expiry_months INT DEFAULT 12,
                auto_cleanup_expired BOOLEAN DEFAULT TRUE,
                auto_cleanup_zero_balance BOOLEAN DEFAULT TRUE,
                digital_card_template TEXT,
                physical_card_instructions TEXT,
                terms_and_conditions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id)
            )
        `);

        // Insert default settings for existing tenants
        const [tenants] = await db.query('SELECT slug FROM tenants') as any;
        for (const tenant of tenants) {
            await db.execute(`
                INSERT IGNORE INTO gift_card_settings 
                (id, tenant_id, fixed_amounts, digital_card_template, physical_card_instructions, terms_and_conditions) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(),
                tenant.slug,
                JSON.stringify(["25", "50", "100", "200"]),
                'Thank you for your gift card purchase! Your digital gift card details are below.',
                'Please allow 3-5 business days for physical gift card delivery.',
                'Gift cards are valid for 12 months from purchase date. Cannot be exchanged for cash.'
            ]);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Gift card tables created successfully!' 
        });
    } catch (error) {
        console.error('Error creating gift card tables:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create gift card tables' },
            { status: 500 }
        );
    }
}
