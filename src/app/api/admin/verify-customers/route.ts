import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Customer extends RowDataPacket {
  id: string;
  name: string;
  email?: string;
  created_at?: string;
}

export async function GET() {
  try {
    // Get all customers to verify demo data is gone
    const allCustomersResult = await db.query<Customer[]>(
      'SELECT id, name, email, created_at FROM customers ORDER BY created_at DESC LIMIT 20'
    );
    
    return NextResponse.json({
      success: true,
      totalCustomers: allCustomersResult[0].length,
      customers: allCustomersResult[0],
      message: 'Current customers in database'
    });
    
  } catch (error) {
    console.error('Error checking customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check customers',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
