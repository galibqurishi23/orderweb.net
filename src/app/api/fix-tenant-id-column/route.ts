import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Fixing tenant_id column type...');

        // Fix the tenant_id column to match the UUID format from tenants table
        await db.execute('ALTER TABLE shop_orders MODIFY tenant_id VARCHAR(36) NOT NULL');
        console.log('✅ Changed tenant_id to VARCHAR(36) to match UUID format');

        return NextResponse.json({
            success: true,
            message: 'Tenant ID column type fixed'
        });

    } catch (error) {
        console.error('Error fixing tenant_id column:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message
        }, { status: 500 });
    }
}
