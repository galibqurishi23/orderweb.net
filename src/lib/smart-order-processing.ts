import { Order } from '@/lib/types';
import { AdvancedOrderSchedulerService } from './advance-order-scheduler';
import { POSIntegrationService } from './pos-integration-service';

/**
 * Smart Order Processing Service
 * Handles automatic routing of orders based on type (immediate vs advance)
 */
export class SmartOrderProcessingService {
  
  /**
   * Process a new order - route to immediate print or advance scheduling
   */
  static async processNewOrder(tenantId: string, order: Order): Promise<void> {
    try {
      console.log('🎯 Processing new order:', order.orderNumber);
      console.log('🔍 Order details:', {
        isAdvanceOrder: order.isAdvanceOrder,
        scheduledTime: order.scheduledTime,
        hasScheduledTime: !!order.scheduledTime
      });
      
      // Determine if this is truly an advance order that needs scheduling
      const isAdvanceOrder = this.isAdvanceOrderRequiringScheduling(order);
      
      if (isAdvanceOrder) {
        console.log('📅 Detected as ADVANCE order - will schedule for later firing');
        await this.processAdvanceOrder(tenantId, order);
      } else {
        console.log('🚀 Detected as IMMEDIATE order - will print now');
        await this.processImmediateOrder(tenantId, order);
      }
      
      console.log('✅ Order processed successfully:', order.orderNumber);
      
    } catch (error) {
      console.error('❌ Error processing new order:', error);
      throw error;
    }
  }
  
  /**
   * Determine if order requires advance scheduling (90+ minutes from now)
   */
  private static isAdvanceOrderRequiringScheduling(order: Order): boolean {
    // If explicitly not an advance order, treat as immediate
    if (order.isAdvanceOrder === false) {
      console.log('🚫 Order explicitly marked as non-advance');
      return false;
    }
    
    // If no scheduled time, treat as immediate
    if (!order.scheduledTime) {
      console.log('⏱️ No scheduled time - treating as immediate');
      return false;
    }
    
    try {
      const now = new Date();
      const scheduledTime = new Date(order.scheduledTime);
      const minutesUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
      
      console.log('⏰ Time analysis:', {
        now: now.toISOString(),
        scheduled: scheduledTime.toISOString(),
        minutesUntilScheduled: Math.round(minutesUntilScheduled)
      });
      
      // If scheduled time is more than 90 minutes away, it's an advance order
      const isAdvance = minutesUntilScheduled > 90;
      
      console.log(`📊 Decision: ${minutesUntilScheduled > 90 ? 'ADVANCE' : 'IMMEDIATE'} (${Math.round(minutesUntilScheduled)} minutes until scheduled time)`);
      
      return isAdvance;
      
    } catch (error) {
      console.error('❌ Error parsing scheduled time, treating as immediate:', error);
      return false;
    }
  }
  
  /**
   * Process an advance order - schedule for later firing
   */
  private static async processAdvanceOrder(tenantId: string, order: Order): Promise<void> {
    try {
      console.log('📅 Processing advance order:', order.orderNumber);
      
      // Schedule the order for automatic firing
      const fireSchedule = await AdvancedOrderSchedulerService.scheduleAdvanceOrder(order);
      
      console.log('⏰ Advance order scheduled:', {
        orderId: order.id,
        customerTime: fireSchedule.customerDesiredTime.toISOString(),
        fireTime: fireSchedule.fireTime.toISOString()
      });
      
      // Send confirmation email to customer about advance order
      await this.sendAdvanceOrderConfirmation(tenantId, order, fireSchedule);
      
    } catch (error) {
      console.error('❌ Error processing advance order:', error);
      throw error;
    }
  }
  
  /**
   * Process an immediate order - send directly to POS
   */
  private static async processImmediateOrder(tenantId: string, order: Order): Promise<void> {
    try {
      console.log('🚀 Processing immediate order:', order.orderNumber);
      
      // Send directly to POS system
      const posResponse = await POSIntegrationService.sendOrderToPOS(tenantId, order);
      
      if (posResponse.success) {
        console.log('✅ Immediate order sent to POS successfully:', order.orderNumber);
        
        // Update order as printed
        await this.markOrderAsPrinted(order.id);
        
      } else {
        console.log('❌ Immediate order failed to print:', order.orderNumber);
        
        // Will appear in failed orders for manual retry
        await this.logPrintFailure(tenantId, order.id, posResponse.message);
      }
      
    } catch (error) {
      console.error('❌ Error processing immediate order:', error);
      
      // Log failure for manual intervention
      await this.logPrintFailure(tenantId, order.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  /**
   * Send advance order confirmation email
   */
  private static async sendAdvanceOrderConfirmation(
    tenantId: string, 
    order: Order, 
    fireSchedule: any
  ): Promise<void> {
    try {
      // This would integrate with your existing email service
      console.log('📧 Sending advance order confirmation:', {
        customerEmail: order.customerEmail,
        scheduledTime: order.scheduledTime,
        fireTime: fireSchedule.fireTime
      });
      
      // Implementation would depend on your existing email system
      
    } catch (error) {
      console.error('❌ Error sending advance order confirmation:', error);
      // Don't throw - this shouldn't break order processing
    }
  }
  
  /**
   * Mark order as successfully printed
   */
  private static async markOrderAsPrinted(orderId: string): Promise<void> {
    try {
      const pool = (await import('./db')).default;
      
      await pool.execute(
        'UPDATE orders SET printed = TRUE WHERE id = ?',
        [orderId]
      );
      
    } catch (error) {
      console.error('❌ Error marking order as printed:', error);
    }
  }
  
  /**
   * Log print failure for manual intervention
   */
  private static async logPrintFailure(tenantId: string, orderId: string, message: string): Promise<void> {
    try {
      const pool = (await import('./db')).default;
      
      await pool.execute(
        'INSERT INTO print_job_logs (tenant_id, order_id, status, message) VALUES (?, ?, ?, ?)',
        [tenantId, orderId, 'failed', message]
      );
      
    } catch (error) {
      console.error('❌ Error logging print failure:', error);
    }
  }
  
  /**
   * Update order status from POS system
   */
  static async updateOrderFromPOS(orderId: string, status: string, printJobId?: string): Promise<void> {
    try {
      const pool = (await import('./db')).default;
      
      if (status === 'completed') {
        // Mark as printed
        await pool.execute(
          'UPDATE orders SET printed = TRUE WHERE id = ?',
          [orderId]
        );
        
        // Update advance order schedule if exists
        await pool.execute(
          'UPDATE advance_order_schedules SET status = "PRINTED", print_job_id = ? WHERE order_id = ?',
          [printJobId || null, orderId]
        );
        
      } else if (status === 'failed') {
        // Mark as failed for retry
        await pool.execute(
          'UPDATE advance_order_schedules SET status = "FAILED" WHERE order_id = ?',
          [orderId]
        );
      }
      
      // Log status update
      await pool.execute(
        'INSERT INTO print_job_logs (tenant_id, order_id, print_job_id, status, message) VALUES ((SELECT tenant_id FROM orders WHERE id = ?), ?, ?, ?, ?)',
        [orderId, orderId, printJobId || null, status, `Status updated from POS: ${status}`]
      );
      
    } catch (error) {
      console.error('❌ Error updating order from POS:', error);
    }
  }
  
  /**
   * Cancel a scheduled advance order
   */
  static async cancelAdvanceOrder(orderId: string): Promise<boolean> {
    try {
      const pool = (await import('./db')).default;
      
      // Remove from schedule
      await pool.execute(
        'DELETE FROM advance_order_schedules WHERE order_id = ?',
        [orderId]
      );
      
      // Update order status
      await pool.execute(
        'UPDATE orders SET status = "cancelled" WHERE id = ?',
        [orderId]
      );
      
      console.log('✅ Advance order cancelled:', orderId);
      return true;
      
    } catch (error) {
      console.error('❌ Error cancelling advance order:', error);
      return false;
    }
  }
}

export default SmartOrderProcessingService;
