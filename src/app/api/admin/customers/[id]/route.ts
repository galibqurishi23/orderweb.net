import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * DELETE /api/admin/customers/[id]
 * Delete a customer and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  
  try {
    const customerId = params.id;
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tenant ID is required' 
      }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer ID is required' 
      }, { status: 400 });
    }

    console.log(`🗑️ [DELETE] Starting deletion for customer: ${customerId}, tenant: ${tenantId}`);

    // Get a connection from the pool
    connection = await db.getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    console.log('✅ [DELETE] Transaction started');

    // Verify customer belongs to this tenant
    const [customerCheck] = await connection.execute(
      'SELECT id, name, email FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );

    if ((customerCheck as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        success: false, 
        error: 'Customer not found or does not belong to this tenant' 
      }, { status: 404 });
    }

    const customer = (customerCheck as any[])[0];
    console.log(`📋 [DELETE] Found customer: ${customer.name} (${customer.email})`);

    // Delete all related data in order (with try-catch for each to continue even if table doesn't exist)
    
    // 1. Customer addresses
    try {
      await connection.execute('DELETE FROM customer_addresses WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_addresses');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_addresses: ${err.message}`);
    }

    // 2. Customer communications
    try {
      await connection.execute('DELETE FROM customer_communications WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_communications');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_communications: ${err.message}`);
    }

    // 3. Customer preferences
    try {
      await connection.execute('DELETE FROM customer_preferences WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_preferences');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_preferences: ${err.message}`);
    }

    // 4. Customer reviews
    try {
      await connection.execute('DELETE FROM customer_reviews WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_reviews');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_reviews: ${err.message}`);
    }

    // 5. Customer sessions
    try {
      await connection.execute('DELETE FROM customer_sessions WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_sessions');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_sessions: ${err.message}`);
    }

    // 6. Customer password resets
    try {
      await connection.execute('DELETE FROM customer_password_resets WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_password_resets');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_password_resets: ${err.message}`);
    }

    // 7. Customer login attempts (by email)
    try {
      await connection.execute('DELETE FROM customer_login_attempts WHERE email = ?', [customer.email]);
      console.log('✅ [DELETE] Deleted customer_login_attempts');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_login_attempts: ${err.message}`);
    }

    // 8. Customer campaign interactions
    try {
      await connection.execute('DELETE FROM customer_campaign_interactions WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_campaign_interactions');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_campaign_interactions: ${err.message}`);
    }

    // 9. Customer special events
    try {
      await connection.execute('DELETE FROM customer_special_events WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_special_events');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_special_events: ${err.message}`);
    }

    // 10. Loyalty transactions
    try {
      await connection.execute('DELETE FROM loyalty_transactions WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted loyalty_transactions');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] loyalty_transactions: ${err.message}`);
    }

    // 11. Phone loyalty transactions  
    try {
      await connection.execute('DELETE FROM phone_loyalty_transactions WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted phone_loyalty_transactions');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] phone_loyalty_transactions: ${err.message}`);
    }

    // 12. Loyalty phone lookup
    try {
      await connection.execute('DELETE FROM loyalty_phone_lookup WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted loyalty_phone_lookup');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] loyalty_phone_lookup: ${err.message}`);
    }

    // 13. Customer loyalty
    try {
      await connection.execute('DELETE FROM customer_loyalty WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_loyalty');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_loyalty: ${err.message}`);
    }

    // 14. Customer loyalty points
    try {
      await connection.execute('DELETE FROM customer_loyalty_points WHERE customer_id = ?', [customerId]);
      console.log('✅ [DELETE] Deleted customer_loyalty_points');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] customer_loyalty_points: ${err.message}`);
    }

    // 15. Update orders to remove customer reference (keeps order history for restaurant)
    try {
      await connection.execute('UPDATE orders SET customerId = NULL WHERE customerId = ?', [customerId]);
      console.log('✅ [DELETE] Updated orders (removed customer reference)');
    } catch (err: any) {
      console.log(`⚠️ [DELETE] orders update: ${err.message}`);
    }

    // 16. Finally, delete the customer record itself
    const [customerResult] = await connection.execute(
      'DELETE FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, tenantId]
    );
    console.log(`✅ [DELETE] Deleted customer record: ${(customerResult as any).affectedRows} rows`);

    if ((customerResult as any).affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete customer record' 
      }, { status: 500 });
    }

    // Commit the transaction
    await connection.commit();
    console.log('✅ [DELETE] Transaction committed successfully');
    connection.release();

    return NextResponse.json({
      success: true,
      message: `Customer "${customer.name}" and all associated data have been deleted successfully`,
      deletedCustomer: {
        id: customer.id,
        name: customer.name,
        email: customer.email
      }
    });

  } catch (error) {
    console.error('❌ [DELETE] Error deleting customer:', error);
    
    // Rollback transaction if it was started
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 [DELETE] Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ [DELETE] Rollback error:', rollbackError);
      }
      connection.release();
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete customer'
    }, { status: 500 });
  }
}
