import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Recreating shop order tables from scratch...');

        // Drop existing tables if they exist
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.execute('DROP TABLE IF EXISTS shop_order_items');
        await db.execute('DROP TABLE IF EXISTS shop_orders');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Dropped existing tables');

        // Create shop_orders table
        await db.execute(`
            CREATE TABLE shop_orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tenant_id INT NOT NULL,
                order_number VARCHAR(255) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50),
                order_type VARCHAR(50) DEFAULT 'collection',
                delivery_address TEXT NULL,
                delivery_city VARCHAR(100) NULL,
                delivery_postcode VARCHAR(20) NULL,
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                payment_intent_id VARCHAR(255) NULL,
                payment_status VARCHAR(50) DEFAULT 'pending',
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Created shop_orders table');

        // Create shop_order_items table
        await db.execute(`
            CREATE TABLE shop_order_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                item_id INT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'food',
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                quantity INT NOT NULL DEFAULT 1,
                subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_id (order_id),
                FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Created shop_order_items table');

        return NextResponse.json({
            success: true,
            message: 'Shop order tables recreated successfully'
        });

    } catch (error) {
        console.error('Error recreating shop order tables:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
