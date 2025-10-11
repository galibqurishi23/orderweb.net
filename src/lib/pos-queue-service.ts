import db from '@/lib/db';

/**
 * POS Queue Service - Handles automatic queuing of online orders for POS synchronization
 */
export class POSQueueService {
  
  /**
   * Queue an order for POS synchronization
   * @param tenantId - The tenant/restaurant ID
   * @param orderId - The order ID to queue
   * @param orderData - Complete order data with items and customer info
   */
  static async queueOrder(tenantId: string | number, orderId: string | number, orderData: any): Promise<void> {
    try {
      // Check if tenant has POS integration enabled (has API key)
      const [tenantRows] = await db.execute(
        'SELECT pos_api_key FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        console.log(`⚠️ Tenant ${tenantId} not found, skipping POS queue`);
        return;
      }

      const tenant = tenantRows[0] as any;
      
      // If no POS API key is configured, skip queuing
      if (!tenant.pos_api_key) {
        console.log(`⚠️ Tenant ${tenantId} has no POS integration configured, skipping queue`);
        return;
      }

      // Prepare order data for POS consumption
      const posOrderData = {
        order_id: orderId,
        order_data: orderData,
        queued_at: new Date().toISOString(),
        source: 'online'
      };

      // Insert into POS sync queue
      await db.execute(
        `INSERT INTO pos_sync_queue (
          tenant_id,
          order_id,
          order_data,
          sync_status,
          created_at
        ) VALUES (?, ?, ?, 'pending', NOW())`,
        [
          tenantId,
          orderId,
          JSON.stringify(posOrderData)
        ]
      );

      console.log(`✅ Order ${orderId} queued for POS sync (tenant: ${tenantId})`);

    } catch (error) {
      console.error(`❌ Error queuing order ${orderId} for POS sync:`, error);
      // Don't throw error as this shouldn't break order processing
    }
  }

  /**
   * Get pending orders count for a tenant
   * @param tenantId - The tenant ID
   * @returns Number of pending orders
   */
  static async getPendingOrdersCount(tenantId: string | number): Promise<number> {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM pos_sync_queue WHERE tenant_id = ? AND sync_status = "pending"',
        [tenantId]
      );

      return (rows as any[])[0].count || 0;
    } catch (error) {
      console.error('Error getting pending orders count:', error);
      return 0;
    }
  }

  /**
   * Mark order as confirmed in POS queue
   * @param tenantId - The tenant ID
   * @param orderId - The order ID
   * @param posOrderId - The POS system's order ID (optional)
   */
  static async markOrderConfirmed(
    tenantId: string | number, 
    orderId: string | number, 
    posOrderId?: string
  ): Promise<void> {
    try {
      await db.execute(
        `UPDATE pos_sync_queue 
         SET sync_status = 'confirmed',
             pos_order_id = ?,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE tenant_id = ? AND order_id = ?`,
        [posOrderId || null, tenantId, orderId]
      );

      console.log(`✅ Order ${orderId} marked as confirmed in POS queue`);
    } catch (error) {
      console.error(`❌ Error marking order ${orderId} as confirmed:`, error);
    }
  }

  /**
   * Clean up old processed orders from queue (older than specified days)
   * @param daysOld - Number of days to keep processed orders (default: 30)
   */
  static async cleanupOldOrders(daysOld: number = 30): Promise<void> {
    try {
      const [result] = await db.execute(
        `DELETE FROM pos_sync_queue 
         WHERE sync_status = 'confirmed' 
         AND confirmed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [daysOld]
      );

      console.log(`✅ Cleaned up ${(result as any).affectedRows} old POS queue entries`);
    } catch (error) {
      console.error('❌ Error cleaning up old POS queue entries:', error);
    }
  }
}