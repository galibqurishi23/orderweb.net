import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Tenant extends RowDataPacket {
  id: string;
  slug: string;
  name: string;
}

interface Customer extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
}

export async function GET() {
  try {
    // Check tenants
    const tenantsResult = await db.query<Tenant[]>('SELECT id, slug, name FROM tenants LIMIT 5');
    const tenants = tenantsResult[0] || [];
    
    // Check customers
    const customersResult = await db.query<Customer[]>('SELECT id, name, email, tenant_id FROM customers LIMIT 5');
    const customers = customersResult[0] || [];
    
    return NextResponse.json({
      success: true,
      tenants: tenants,
      customers: customers
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check data',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
