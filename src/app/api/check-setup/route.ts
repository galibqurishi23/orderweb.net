import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        console.log('🔍 Checking tenants and shop orders setup...');

        // Check tenants
        const [tenants] = await db.execute('SELECT id, slug, name FROM tenants');
        console.log('Available tenants:', tenants);

        // Check if kitchen tenant exists, if not create it
        const kitchenTenant = (tenants as any[]).find(t => t.slug === 'kitchen');
        
        if (!kitchenTenant) {
            console.log('Creating kitchen tenant...');
            await db.execute(`
                INSERT INTO tenants (slug, name, created_at) 
                VALUES ('kitchen', 'Kitchen Restaurant', NOW())
            `);
            console.log('✅ Kitchen tenant created');
        } else {
            console.log('✅ Kitchen tenant exists:', kitchenTenant);
        }

        // Check shop_orders table structure
        const [shopOrdersStructure] = await db.execute('DESCRIBE shop_orders');
        console.log('Shop orders table structure:', shopOrdersStructure);

        // Check existing shop orders
        const [orders] = await db.execute('SELECT * FROM shop_orders LIMIT 5');
        console.log('Recent shop orders:', orders);

        return NextResponse.json({
            success: true,
            tenants,
            shopOrdersStructure,
            orders
        });

    } catch (error) {
        console.error('Error checking setup:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
