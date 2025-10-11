import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface LoyaltyTransaction extends RowDataPacket {
  id: number;
  transaction_type: string;
  points: number;
  reason: string;
  admin_action: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const tenantId = searchParams.get('tenantId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!customerId || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and tenant ID are required' },
        { status: 400 }
      );
    }

    // Verify customer belongs to the tenant
    const customerResult = await db.query(
      'SELECT id FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    if (customerResult[0] && (customerResult[0] as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get loyalty transactions
    let transactions: LoyaltyTransaction[] = [];
    
    try {
      const transactionsResult = await db.query<LoyaltyTransaction[]>(
        `SELECT 
          transaction_type, 
          points, 
          reason, 
          admin_action, 
          created_at 
        FROM loyalty_transactions 
        WHERE customer_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?`,
        [customerId, limit]
      );
      
      transactions = transactionsResult[0] || [];
    } catch (error) {
      // If loyalty_transactions table doesn't exist, return empty array
      console.log('Loyalty transactions table may not exist');
    }

    return NextResponse.json({
      success: true,
      transactions: transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error fetching loyalty transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty transactions',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
