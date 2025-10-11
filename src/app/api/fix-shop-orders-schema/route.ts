import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Fixing shop_orders table schema...');

        // Check if shop_orders table exists and get its structure
        const [columns] = await db.execute(`
            SHOW COLUMNS FROM shop_orders
        `);

        console.log('Current shop_orders columns:', columns);

        // Add missing columns if they don't exist
        const columnNames = (columns as any[]).map(col => col.Field);

        if (!columnNames.includes('order_type')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN order_type VARCHAR(50) DEFAULT 'collection'
            `);
            console.log('✅ Added order_type column');
        }

        if (!columnNames.includes('delivery_address')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN delivery_address TEXT NULL
            `);
            console.log('✅ Added delivery_address column');
        }

        if (!columnNames.includes('delivery_city')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN delivery_city VARCHAR(100) NULL
            `);
            console.log('✅ Added delivery_city column');
        }

        if (!columnNames.includes('delivery_postcode')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN delivery_postcode VARCHAR(20) NULL
            `);
            console.log('✅ Added delivery_postcode column');
        }

        if (!columnNames.includes('payment_intent_id')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN payment_intent_id VARCHAR(255) NULL
            `);
            console.log('✅ Added payment_intent_id column');
        }

        if (!columnNames.includes('payment_status')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending'
            `);
            console.log('✅ Added payment_status column');
        }

        if (!columnNames.includes('order_status')) {
            await db.execute(`
                ALTER TABLE shop_orders 
                ADD COLUMN order_status VARCHAR(50) DEFAULT 'pending'
            `);
            console.log('✅ Added order_status column');
        }

        console.log('🎉 Shop orders table schema updated successfully');

        return NextResponse.json({
            success: true,
            message: 'Shop orders table schema fixed'
        });

    } catch (error) {
        console.error('Error fixing shop orders table:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
