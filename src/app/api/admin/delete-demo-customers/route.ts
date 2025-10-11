import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Customer extends RowDataPacket {
  id: string;
  name: string;
  email?: string;
  created_at?: string;
}

const DEMO_CUSTOMER_NAMES = [
  'David Miller',
  'Rachel Green', 
  'Tom Davis',
  'Lisa White',
  'Alex Johnson',
  'Emma Brown',
  'Mike Wilson',
  'Sarah Johnson',
  'Jane Doe',
  'John Smith'
];

export async function DELETE(request: NextRequest) {
  try {
    console.log('Starting demo customer cleanup via API...');
    
    // First, get all demo customer IDs
    const demoCustomersResult = await db.query<Customer[]>(
      `SELECT id, name FROM customers WHERE name IN (${DEMO_CUSTOMER_NAMES.map(() => '?').join(',')})`,
      DEMO_CUSTOMER_NAMES
    );
    
    if (demoCustomersResult[0].length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No demo customers found to delete',
        deletedCount: 0
      });
    }
    
    const demoCustomerIds = demoCustomersResult[0].map((customer: Customer) => customer.id);
    const deletedCustomerNames = demoCustomersResult[0].map((customer: Customer) => customer.name);
    console.log(`Found ${demoCustomersResult[0].length} demo customers to delete`);
    
    // Simple approach: Just delete the customers
    // If there are foreign key constraints, they should either cascade or prevent deletion
    const deleteCustomersResult = await db.query(
      `DELETE FROM customers WHERE id IN (${demoCustomerIds.map(() => '?').join(',')})`,
      demoCustomerIds
    );
    
    const deletedCount = (deleteCustomersResult[1] as any)?.affectedRows || 0;
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} demo customers`,
      deletedCustomers: deletedCustomerNames,
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting demo customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If there's a foreign key constraint error, we need to handle related data first
    if (errorMessage.includes('foreign key constraint') || errorMessage.includes('FOREIGN KEY')) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete customers with existing orders. Please delete their orders first, or use the manual cleanup script.',
        details: errorMessage,
        suggestion: 'Use the Node.js script for more thorough cleanup with proper order handling.'
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete demo customers',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just check how many demo customers exist
    const demoCustomersResult = await db.query<Customer[]>(
      `SELECT id, name, email, created_at FROM customers WHERE name IN (${DEMO_CUSTOMER_NAMES.map(() => '?').join(',')}) ORDER BY name`,
      DEMO_CUSTOMER_NAMES
    );
    
    return NextResponse.json({
      success: true,
      demoCustomersFound: demoCustomersResult[0].length,
      demoCustomers: demoCustomersResult[0]
    });
    
  } catch (error) {
    console.error('Error checking demo customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check demo customers',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
