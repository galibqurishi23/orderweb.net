import { Order } from '@/lib/types';
import { POSIntegrationService } from './pos-integration-service';
import pool from './db';

export interface FireTimeCalculation {
  orderId: string;
  customerDesiredTime: Date;
  fireTime: Date;
  status: 'HOLD' | 'READY_TO_FIRE' | 'FIRED' | 'PRINTED' | 'FAILED';
  retryCount: number;
  lastRetryAt?: Date;
  printJobId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConflictAlert {
  fireTime: Date;
  orderCount: number;
  orders: Order[];
  alertLevel: 'info' | 'warning' | 'critical';
}

/**
 * Advanced Order Scheduler Service
 * Handles smart automation for advance orders with precise timing
 */
export class AdvancedOrderSchedulerService {
  
  private static readonly PREPARATION_TIME_MINUTES = 90;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_INTERVAL_MINUTES = 2;
  
  /**
   * Schedule an advance order for automatic firing
   */
  static async scheduleAdvanceOrder(order: Order): Promise<FireTimeCalculation> {
    try {
      console.log('📅 Scheduling advance order:', order.orderNumber);
      
      if (!order.isAdvanceOrder || !order.scheduledTime) {
        throw new Error('Order must be an advance order with scheduled time');
      }
      
      // Calculate fire time: scheduledTime - 90 minutes
      const customerDesiredTime = new Date(order.scheduledTime);
      const fireTime = new Date(customerDesiredTime.getTime() - (this.PREPARATION_TIME_MINUTES * 60 * 1000));
      
      console.log('⏰ Fire time calculation:', {
        customerDesiredTime: customerDesiredTime.toISOString(),
        fireTime: fireTime.toISOString(),
        preparationTime: this.PREPARATION_TIME_MINUTES
      });
      
      // Store in database
      const fireSchedule: FireTimeCalculation = {
        orderId: order.id,
        customerDesiredTime,
        fireTime,
        status: 'HOLD',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.saveFireSchedule(fireSchedule);
      
      console.log('✅ Advance order scheduled successfully');
      
      return fireSchedule;
      
    } catch (error) {
      console.error('❌ Error scheduling advance order:', error);
      throw error;
    }
  }
  
  /**
   * Background process - check and fire orders that are ready
   */
  static async processReadyOrders(tenantId: string): Promise<void> {
    try {
      console.log('🔄 Processing ready orders for tenant:', tenantId);
      
      const now = new Date();
      const readyOrders = await this.getReadyToFireOrders(tenantId, now);
      
      console.log(`📋 Found ${readyOrders.length} orders ready to fire`);
      
      for (const fireSchedule of readyOrders) {
        await this.fireOrder(tenantId, fireSchedule);
      }
      
      // Also process retry attempts
      await this.processRetryAttempts(tenantId);
      
    } catch (error) {
      console.error('❌ Error processing ready orders:', error);
    }
  }
  
  /**
   * Fire an individual order to POS
   */
  static async fireOrder(tenantId: string, fireSchedule: FireTimeCalculation): Promise<void> {
    try {
      console.log('🚀 Firing order:', fireSchedule.orderId);
      
      // Get full order details
      const order = await this.getOrderById(fireSchedule.orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Update status to FIRED
      await this.updateFireScheduleStatus(fireSchedule.orderId, 'FIRED');
      
      // Send to POS
      const posResponse = await POSIntegrationService.sendOrderToPOS(tenantId, order);
      
      if (posResponse.success) {
        // Update to PRINTED status
        await this.updateFireScheduleStatus(fireSchedule.orderId, 'PRINTED', posResponse.printJobId);
        console.log('✅ Order fired and printed successfully:', fireSchedule.orderId);
      } else {
        // Update to FAILED status and start retry process
        await this.updateFireScheduleStatus(fireSchedule.orderId, 'FAILED');
        console.log('❌ Order fired but print failed, starting retry process:', fireSchedule.orderId);
      }
      
    } catch (error) {
      console.error('❌ Error firing order:', error);
      await this.updateFireScheduleStatus(fireSchedule.orderId, 'FAILED');
    }
  }
  
  /**
   * Process retry attempts for failed orders
   */
  private static async processRetryAttempts(tenantId: string): Promise<void> {
    try {
      console.log('🔄 Processing retry attempts for tenant:', tenantId);
      
      const failedOrders = await this.getFailedOrders(tenantId);
      const now = new Date();
      
      for (const fireSchedule of failedOrders) {
        // Check if retry interval has passed
        if (fireSchedule.lastRetryAt) {
          const timeSinceLastRetry = now.getTime() - new Date(fireSchedule.lastRetryAt).getTime();
          const intervalMs = this.RETRY_INTERVAL_MINUTES * 60 * 1000;
          
          if (timeSinceLastRetry < intervalMs) {
            continue; // Not time for retry yet
          }
        }
        
        // Check retry count
        if (fireSchedule.retryCount >= this.MAX_RETRY_ATTEMPTS) {
          console.log('❌ Max retry attempts reached for order:', fireSchedule.orderId);
          continue; // Will show in manual print area
        }
        
        // Attempt retry
        await this.retryFailedOrder(tenantId, fireSchedule);
      }
      
    } catch (error) {
      console.error('❌ Error processing retry attempts:', error);
    }
  }
  
  /**
   * Retry a failed order
   */
  private static async retryFailedOrder(tenantId: string, fireSchedule: FireTimeCalculation): Promise<void> {
    try {
      console.log(`🔄 Retry attempt ${fireSchedule.retryCount + 1} for order:`, fireSchedule.orderId);
      
      const order = await this.getOrderById(fireSchedule.orderId);
      if (!order) {
        return;
      }
      
      // Send to POS
      const posResponse = await POSIntegrationService.retryPrintJob(tenantId, order);
      
      // Update retry info
      const newRetryCount = fireSchedule.retryCount + 1;
      const lastRetryAt = new Date();
      
      if (posResponse.success) {
        // Success - update to PRINTED
        await this.updateFireScheduleStatus(
          fireSchedule.orderId, 
          'PRINTED', 
          posResponse.printJobId,
          newRetryCount,
          lastRetryAt
        );
        console.log('✅ Retry successful for order:', fireSchedule.orderId);
      } else {
        // Still failed - update retry count
        await this.updateFireScheduleStatus(
          fireSchedule.orderId, 
          'FAILED', 
          undefined,
          newRetryCount,
          lastRetryAt
        );
        console.log(`❌ Retry ${newRetryCount} failed for order:`, fireSchedule.orderId);
      }
      
    } catch (error) {
      console.error('❌ Error retrying failed order:', error);
    }
  }
  
  /**
   * Get order conflict alerts for a specific time
   */
  static async getOrderConflicts(tenantId: string, targetDate: Date): Promise<ConflictAlert[]> {
    try {
      console.log('🔍 Checking order conflicts for date:', targetDate.toDateString());
      
      // Group orders by fire time (rounded to 15-minute intervals)
      const conflicts = await this.getOrdersByFireTime(tenantId, targetDate);
      
      return conflicts.map((conflict: any) => {
        let alertLevel: 'info' | 'warning' | 'critical' = 'info';
        
        if (conflict.orderCount >= 10) {
          alertLevel = 'critical';
        } else if (conflict.orderCount >= 5) {
          alertLevel = 'warning';
        }
        
        return {
          fireTime: conflict.fireTime,
          orderCount: conflict.orderCount,
          orders: conflict.orders,
          alertLevel
        };
      });
      
    } catch (error) {
      console.error('❌ Error getting order conflicts:', error);
      return [];
    }
  }
  
  /**
   * Get all advance orders with their fire schedules
   */
  static async getAdvanceOrdersWithSchedules(tenantId: string): Promise<(Order & { fireSchedule?: FireTimeCalculation })[]> {
    try {
      const orders = await this.getAdvanceOrders(tenantId);
      
      // Attach fire schedule information
      for (const order of orders) {
        (order as any).fireSchedule = await this.getFireSchedule(order.id);
      }
      
      return orders as (Order & { fireSchedule?: FireTimeCalculation })[];
      
    } catch (error) {
      console.error('❌ Error getting advance orders with schedules:', error);
      return [];
    }
  }
  
  /**
   * Manual retry for failed orders (from admin interface)
   */
  static async manualRetry(tenantId: string, orderId: string): Promise<boolean> {
    try {
      console.log('🔧 Manual retry for order:', orderId);
      
      const fireSchedule = await this.getFireSchedule(orderId);
      if (!fireSchedule) {
        return false;
      }
      
      await this.retryFailedOrder(tenantId, fireSchedule);
      return true;
      
    } catch (error) {
      console.error('❌ Error in manual retry:', error);
      return false;
    }
  }
  
  // Database operations
  private static async saveFireSchedule(fireSchedule: FireTimeCalculation): Promise<void> {
    await pool.execute(
      `INSERT INTO advance_order_schedules 
       (order_id, customer_desired_time, fire_time, status, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fireSchedule.orderId,
        fireSchedule.customerDesiredTime,
        fireSchedule.fireTime,
        fireSchedule.status,
        fireSchedule.retryCount,
        fireSchedule.createdAt,
        fireSchedule.updatedAt
      ]
    );
  }
  
  private static async getReadyToFireOrders(tenantId: string, currentTime: Date): Promise<FireTimeCalculation[]> {
    const [rows] = await pool.execute(
      `SELECT aos.*, o.tenant_id
       FROM advance_order_schedules aos
       JOIN orders o ON aos.order_id = o.id
       WHERE o.tenant_id = ? 
       AND aos.status = 'HOLD' 
       AND aos.fire_time <= ?`,
      [tenantId, currentTime]
    );
    
    return (rows as any[]).map(row => ({
      orderId: row.order_id,
      customerDesiredTime: new Date(row.customer_desired_time),
      fireTime: new Date(row.fire_time),
      status: row.status,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
      printJobId: row.print_job_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
  
  private static async updateFireScheduleStatus(
    orderId: string, 
    status: FireTimeCalculation['status'], 
    printJobId?: string,
    retryCount?: number,
    lastRetryAt?: Date
  ): Promise<void> {
    const updates = ['status = ?', 'updated_at = ?'];
    const values: any[] = [status, new Date()];
    
    if (printJobId !== undefined) {
      updates.push('print_job_id = ?');
      values.push(printJobId);
    }
    
    if (retryCount !== undefined) {
      updates.push('retry_count = ?');
      values.push(retryCount);
    }
    
    if (lastRetryAt !== undefined) {
      updates.push('last_retry_at = ?');
      values.push(lastRetryAt);
    }
    
    values.push(orderId);
    
    await pool.execute(
      `UPDATE advance_order_schedules 
       SET ${updates.join(', ')}
       WHERE order_id = ?`,
      values
    );
  }
  
  private static async getFailedOrders(tenantId: string): Promise<FireTimeCalculation[]> {
    const [rows] = await pool.execute(
      `SELECT aos.*, o.tenant_id
       FROM advance_order_schedules aos
       JOIN orders o ON aos.order_id = o.id
       WHERE o.tenant_id = ? 
       AND aos.status = 'FAILED' 
       AND aos.retry_count < ?`,
      [tenantId, this.MAX_RETRY_ATTEMPTS]
    );
    
    return (rows as any[]).map(row => ({
      orderId: row.order_id,
      customerDesiredTime: new Date(row.customer_desired_time),
      fireTime: new Date(row.fire_time),
      status: row.status,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
      printJobId: row.print_job_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
  
  private static async getOrderById(orderId: string): Promise<Order | null> {
    // This would fetch the full order with all details from the database
    // Implementation depends on your existing order fetching logic
    // For now, returning null - you'll need to implement this based on your existing order service
    console.log('🔍 Getting order by ID:', orderId);
    return null;
  }
  
  private static async getAdvanceOrders(tenantId: string): Promise<Order[]> {
    // This would fetch all advance orders for the tenant
    // Implementation depends on your existing order fetching logic
    console.log('🔍 Getting advance orders for tenant:', tenantId);
    return [];
  }
  
  private static async getFireSchedule(orderId: string): Promise<FireTimeCalculation | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM advance_order_schedules WHERE order_id = ?',
      [orderId]
    );
    
    const row = (rows as any[])[0];
    if (!row) return null;
    
    return {
      orderId: row.order_id,
      customerDesiredTime: new Date(row.customer_desired_time),
      fireTime: new Date(row.fire_time),
      status: row.status,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at ? new Date(row.last_retry_at) : undefined,
      printJobId: row.print_job_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
  
  private static async getOrdersByFireTime(tenantId: string, targetDate: Date): Promise<any[]> {
    // Group orders by fire time for conflict detection
    // This is a simplified implementation - you'd want to implement proper grouping
    console.log('🔍 Getting orders by fire time for tenant:', tenantId, 'date:', targetDate);
    return [];
  }
}
