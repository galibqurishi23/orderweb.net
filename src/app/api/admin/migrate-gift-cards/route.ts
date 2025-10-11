import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Migrating gift card tables to correct schema...');

        // Check if old gift cards table exists with wrong schema
        const [oldTables] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'gift_cards' 
            AND COLUMN_NAME IN ('code', 'initial_amount', 'current_balance')
        `) as any[];

        if (oldTables.length > 0) {
            console.log('Found old gift cards schema, migrating...');
            
            // Backup old data if exists
            const [oldCards] = await db.query('SELECT * FROM gift_cards LIMIT 1') as any[];
            
            if (oldCards.length > 0) {
                // Create backup table
                await db.execute(`
                    CREATE TABLE IF NOT EXISTS gift_cards_backup AS 
                    SELECT * FROM gift_cards
                `);
                console.log('Created backup of old gift cards data');
            }
            
            // Drop old table
            await db.execute('DROP TABLE IF EXISTS gift_cards');
            console.log('Dropped old gift cards table');
        }

        // Check if gift_card_orders table exists
        const [orderTables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'gift_card_orders'
        `) as any[];

        // Check if gift_card_settings table exists
        const [settingsTables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'gift_card_settings'
        `) as any[];

        // Create correct gift cards table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_cards (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
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
        console.log('✅ Created gift_cards table with correct schema');

        // Create gift_card_orders table if missing
        if (orderTables.length === 0) {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS gift_card_orders (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    gift_card_id VARCHAR(255) NOT NULL,
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
            console.log('✅ Created gift_card_orders table');
        }

        // Update gift_card_transactions table schema
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gift_card_transactions_new (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                gift_card_id VARCHAR(255) NOT NULL,
                transaction_type ENUM('purchase', 'redemption', 'refund', 'adjustment') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                remaining_balance DECIMAL(10,2) NOT NULL,
                description TEXT,
                reference_order_id VARCHAR(255),
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_gift_card_id (gift_card_id),
                INDEX idx_transaction_type (transaction_type)
            )
        `);

        // Check if old transactions exist and migrate
        const [oldTransactions] = await db.query(`
            SELECT COUNT(*) as count 
            FROM gift_card_transactions
        `) as any[];

        if (oldTransactions[0]?.count > 0) {
            // Check what columns exist in old transactions table
            const [oldColumns] = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'gift_card_transactions'
                AND COLUMN_NAME IN ('balance_after', 'remaining_balance')
            `) as any[];
            
            const hasBalanceAfter = oldColumns.some((col: any) => col.COLUMN_NAME === 'balance_after');
            const hasRemainingBalance = oldColumns.some((col: any) => col.COLUMN_NAME === 'remaining_balance');
            
            // Build select statement based on available columns
            let balanceSelect = '0';
            if (hasRemainingBalance) {
                balanceSelect = 'remaining_balance';
            } else if (hasBalanceAfter) {
                balanceSelect = 'balance_after';
            }
            
            // Migrate old transactions to new schema (if structure allows)
            await db.execute(`
                INSERT IGNORE INTO gift_card_transactions_new 
                (id, tenant_id, gift_card_id, transaction_type, amount, remaining_balance, description, created_at)
                SELECT 
                    id,
                    tenant_id,
                    gift_card_id,
                    transaction_type,
                    amount,
                    ${balanceSelect} as remaining_balance,
                    description,
                    created_at
                FROM gift_card_transactions
            `);
        }

        // Replace old transactions table
        await db.execute('DROP TABLE IF EXISTS gift_card_transactions');
        await db.execute('RENAME TABLE gift_card_transactions_new TO gift_card_transactions');
        console.log('✅ Updated gift_card_transactions table');

        // Create gift_card_settings table if missing
        if (settingsTables.length === 0) {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS gift_card_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(255) UNIQUE NOT NULL,
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
                    display_name VARCHAR(255),
                    cover_image_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id)
                )
            `);
            console.log('✅ Created gift_card_settings table');

            // Insert default settings for existing tenants
            const [tenants] = await db.query('SELECT id FROM tenants') as any[];
            for (const tenant of tenants) {
                await db.execute(`
                    INSERT IGNORE INTO gift_card_settings 
                    (id, tenant_id, fixed_amounts, digital_card_template, physical_card_instructions, terms_and_conditions) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(),
                    tenant.id,
                    JSON.stringify(["25", "50", "100", "200"]),
                    'Thank you for your gift card purchase! Your digital gift card details are below.',
                    'Please allow 3-5 business days for physical gift card delivery.',
                    'Gift cards are valid for 12 months from purchase date. Cannot be exchanged for cash.'
                ]);
            }
            console.log('✅ Created default gift card settings for existing tenants');
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Gift card tables migrated successfully!',
            details: [
                'Updated gift_cards table schema',
                'Created gift_card_orders table',
                'Updated gift_card_transactions table',
                'Created gift_card_settings table',
                'Added default settings for existing tenants'
            ]
        });
    } catch (error) {
        console.error('Error migrating gift card tables:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to migrate gift card tables',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
