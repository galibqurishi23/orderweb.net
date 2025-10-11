import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        
        // Get tenant data including payment and delivery settings
        const [rows] = await pool.execute(
            `SELECT id, name, slug, email, phone, address, status, 
                    stripe_connect_account_id, delivery_normal_fee, delivery_express_fee 
             FROM tenants WHERE slug = ?`,
            [tenant]
        );
        
        const tenants = rows as any[];
        if (tenants.length === 0) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json(tenants[0]);
    } catch (error) {
        console.error('Error fetching tenant:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tenant data' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const body = await request.json();
        
        // Build update query dynamically based on provided fields
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        if (body.stripe_connect_account_id !== undefined) {
            updateFields.push('stripe_connect_account_id = ?');
            updateValues.push(body.stripe_connect_account_id);
        }
        
        if (body.delivery_normal_fee !== undefined) {
            updateFields.push('delivery_normal_fee = ?');
            updateValues.push(body.delivery_normal_fee);
        }
        
        if (body.delivery_express_fee !== undefined) {
            updateFields.push('delivery_express_fee = ?');
            updateValues.push(body.delivery_express_fee);
        }
        
        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }
        
        // Add updated_at timestamp
        updateFields.push('updated_at = NOW()');
        updateValues.push(tenant);
        
        const query = `UPDATE tenants SET ${updateFields.join(', ')} WHERE slug = ?`;
        
        await pool.execute(query, updateValues);
        
        return NextResponse.json({
            success: true,
            message: 'Tenant updated successfully'
        });
    } catch (error) {
        console.error('Error updating tenant:', error);
        return NextResponse.json(
            { error: 'Failed to update tenant data' },
            { status: 500 }
        );
    }
}
