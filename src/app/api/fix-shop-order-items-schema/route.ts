import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Fixing shop_order_items table schema...');

        // Check if shop_order_items table exists and get its structure
        const [columns] = await db.execute(`
            SHOW COLUMNS FROM shop_order_items
        `);

        console.log('Current shop_order_items columns:', columns);

        // Add missing columns if they don't exist
        const columnNames = (columns as any[]).map(col => col.Field);

        if (!columnNames.includes('item_type')) {
            await db.execute(`
                ALTER TABLE shop_order_items 
                ADD COLUMN item_type VARCHAR(50) DEFAULT 'food'
            `);
            console.log('✅ Added item_type column');
        }

        if (!columnNames.includes('subtotal')) {
            await db.execute(`
                ALTER TABLE shop_order_items 
                ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00
            `);
            console.log('✅ Added subtotal column');
        }

        console.log('🎉 Shop order items table schema updated successfully');

        return NextResponse.json({
            success: true,
            message: 'Shop order items table schema fixed'
        });

    } catch (error) {
        console.error('Error fixing shop order items table:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
