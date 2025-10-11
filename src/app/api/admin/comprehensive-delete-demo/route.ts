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
    console.log('Starting comprehensive demo customer cleanup via API...');
    
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
    
    // Get orders for these customers first
    const ordersResult = await db.query(
      `SELECT id FROM orders WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
      demoCustomerIds
    );
    
    const orderIds = ordersResult[0] ? (ordersResult[0] as any[]).map((order: any) => order.id) : [];
    
    let deletionDetails = {
      orderItems: 0,
      orders: 0,
      loyaltyRecords: 0,
      addresses: 0,
      customers: 0
    };
    
    // Delete related data step by step
    
    // Step 1: Delete order items if there are any orders
    if (orderIds.length > 0) {
      try {
        const orderItemsDeleteResult = await db.query(
          `DELETE FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
          orderIds
        );
        deletionDetails.orderItems = (orderItemsDeleteResult[1] as any)?.affectedRows || 0;
        console.log(`Deleted ${deletionDetails.orderItems} order items`);
      } catch (error) {
        console.log('No order_items table or no items to delete');
      }
      
      // Step 2: Delete orders
      try {
        const ordersDeleteResult = await db.query(
          `DELETE FROM orders WHERE id IN (${orderIds.map(() => '?').join(',')})`,
          orderIds
        );
        deletionDetails.orders = (ordersDeleteResult[1] as any)?.affectedRows || 0;
        console.log(`Deleted ${deletionDetails.orders} orders`);
      } catch (error) {
        console.log('Error deleting orders:', error);
      }
    }
    
    // Step 3: Delete loyalty data
    try {
      const loyaltyDeleteResult = await db.query(
        `DELETE FROM customer_loyalty WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
        demoCustomerIds
      );
      deletionDetails.loyaltyRecords = (loyaltyDeleteResult[1] as any)?.affectedRows || 0;
      console.log(`Deleted ${deletionDetails.loyaltyRecords} loyalty records`);
    } catch (error) {
      console.log('No customer_loyalty table or no records to delete');
    }
    
    // Step 4: Delete customer addresses
    try {
      const addressesDeleteResult = await db.query(
        `DELETE FROM customer_addresses WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
        demoCustomerIds
      );
      deletionDetails.addresses = (addressesDeleteResult[1] as any)?.affectedRows || 0;
      console.log(`Deleted ${deletionDetails.addresses} customer addresses`);
    } catch (error) {
      console.log('No customer_addresses table or no addresses to delete');
    }
    
    // Step 5: Finally delete the customers
    const deleteCustomersResult = await db.query(
      `DELETE FROM customers WHERE id IN (${demoCustomerIds.map(() => '?').join(',')})`,
      demoCustomerIds
    );
    
    deletionDetails.customers = (deleteCustomersResult[1] as any)?.affectedRows || 0;
    console.log(`Deleted ${deletionDetails.customers} customers`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletionDetails.customers} demo customers`,
      deletedCustomers: deletedCustomerNames,
      deletedCount: deletionDetails.customers,
      details: deletionDetails
    });
    
  } catch (error) {
    console.error('Error deleting demo customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
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
    // Check how many demo customers exist and their related data
    const demoCustomersResult = await db.query<Customer[]>(
      `SELECT id, name, email, created_at FROM customers WHERE name IN (${DEMO_CUSTOMER_NAMES.map(() => '?').join(',')}) ORDER BY name`,
      DEMO_CUSTOMER_NAMES
    );
    
    const demoCustomerIds = demoCustomersResult[0].map((customer: Customer) => customer.id);
    
    // Check related data
    let relatedData = {
      orders: 0,
      orderItems: 0,
      loyaltyRecords: 0,
      addresses: 0
    };
    
    if (demoCustomerIds.length > 0) {
      // Check orders
      try {
        const ordersResult = await db.query(
          `SELECT COUNT(*) as count FROM orders WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
          demoCustomerIds
        );
        relatedData.orders = (ordersResult[0] as any)[0]?.count || 0;
      } catch (error) {
        console.log('No orders table');
      }
      
      // Check loyalty records
      try {
        const loyaltyResult = await db.query(
          `SELECT COUNT(*) as count FROM customer_loyalty WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
          demoCustomerIds
        );
        relatedData.loyaltyRecords = (loyaltyResult[0] as any)[0]?.count || 0;
      } catch (error) {
        console.log('No customer_loyalty table');
      }
      
      // Check addresses
      try {
        const addressesResult = await db.query(
          `SELECT COUNT(*) as count FROM customer_addresses WHERE customer_id IN (${demoCustomerIds.map(() => '?').join(',')})`,
          demoCustomerIds
        );
        relatedData.addresses = (addressesResult[0] as any)[0]?.count || 0;
      } catch (error) {
        console.log('No customer_addresses table');
      }
    }
    
    return NextResponse.json({
      success: true,
      demoCustomersFound: demoCustomersResult[0].length,
      demoCustomers: demoCustomersResult[0],
      relatedData: relatedData
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
