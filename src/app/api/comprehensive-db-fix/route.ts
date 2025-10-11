import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Comprehensive database fix for shop orders...');

        // First, ensure both tables exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS shop_orders (
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
                total_amount DECIMAL(10,2) NOT NULL,
                payment_intent_id VARCHAR(255) NULL,
                payment_status VARCHAR(50) DEFAULT 'pending',
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS shop_order_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                item_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'food',
                price DECIMAL(10,2) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_id (order_id)
            )
        `);

        console.log('✅ Shop orders tables created/verified');

        // Test the insert with a dummy record to verify it works
        try {
            const testOrderNumber = `TEST-${Date.now()}`;
            
            const [orderResult] = await db.execute(`
                INSERT INTO shop_orders (
                    tenant_id, order_number, customer_name, customer_email, customer_phone,
                    order_type, total_amount, payment_intent_id, payment_status, order_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                1, testOrderNumber, 'Test Customer', 'test@example.com', '1234567890',
                'collection', 10.00, 'test_payment', 'paid', 'pending'
            ]);

            const testOrderId = (orderResult as any).insertId;

            await db.execute(`
                INSERT INTO shop_order_items (
                    order_id, item_id, item_name, item_type, price, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                testOrderId, 1, 'Test Item', 'food', 10.00, 1, 10.00
            ]);

            // Clean up test data
            await db.execute('DELETE FROM shop_orders WHERE order_number = ?', [testOrderNumber]);

            console.log('✅ Database insert test passed');

        } catch (testError) {
            console.error('❌ Database insert test failed:', testError);
            throw testError;
        }

        return NextResponse.json({
            success: true,
            message: 'Database schema completely fixed and tested'
        });

    } catch (error) {
        console.error('Error in comprehensive database fix:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
