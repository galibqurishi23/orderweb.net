import pool from './db';
import { v4 as uuidv4 } from 'uuid';

export interface KitchenDisplay {
  id: string;
  printerId: string;
  tenantId: string;
  displayName: string;
  layoutConfig: any;
  autoAcknowledge: boolean;
  orderTimeoutMinutes: number;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'high-contrast';
  soundAlerts: boolean;
  maxOrdersDisplay: number;
  refreshIntervalSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisplayOrder {
  id: string;
  orderId: string;
  displayId: string;
  tenantId: string;
  status: 'new' | 'preparing' | 'ready' | 'completed';
  acknowledgedAt?: Date;
  completedAt?: Date;
  prepTimeMinutes?: number;
  estimatedReadyTime?: Date;
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  // Order details (joined)
  orderNumber?: string;
  customerName?: string;
  orderType?: string;
  totalAmount?: number;
  items?: any[];
  specialInstructions?: string;
}

export interface KitchenDisplayStats {
  totalDisplays: number;
  activeDisplays: number;
  totalOrdersToday: number;
  averagePrepTime: number;
  ordersInProgress: number;
  completedOrdersToday: number;
}

/**
 * Kitchen Display System Service
 * Manages digital kitchen displays that work alongside physical printers
 */
export class KitchenDisplayService {

  /**
   * Get all kitchen displays for a tenant
   */
  static async getTenantDisplays(tenantId: string): Promise<KitchenDisplay[]> {
    try {
      console.log('🖥️ Getting kitchen displays for tenant:', tenantId);
      
      const [rows] = await pool.execute(`
        SELECT 
          kd.*,
          p.name as printer_name,
          p.active as printer_active
        FROM kitchen_displays kd
        LEFT JOIN printers p ON kd.printer_id = p.id
        WHERE kd.tenant_id = ?
        ORDER BY kd.created_at DESC
      `, [tenantId]);
      
      const displays = rows as any[];
      console.log('📋 Found kitchen displays:', displays.length);
      
      return displays.map(this.mapDatabaseToDisplay);
    } catch (error) {
      console.error('❌ Error fetching kitchen displays:', error);
      throw new Error('Failed to fetch kitchen displays');
    }
  }

  /**
   * Create a new kitchen display
   */
  static async createDisplay(tenantId: string, data: Partial<KitchenDisplay>): Promise<KitchenDisplay> {
    try {
      const displayId = uuidv4();
      
      // Default layout configuration
      const defaultLayout = {
        columns: 3,
        showTimer: true,
        showCustomerName: true,
        showOrderType: true,
        showSpecialInstructions: true,
        cardSize: 'medium',
        sortBy: 'oldest_first'
      };

      const [result] = await pool.execute(`
        INSERT INTO kitchen_displays (
          id, printer_id, tenant_id, display_name, layout_config,
          auto_acknowledge, order_timeout_minutes, font_size, theme,
          sound_alerts, max_orders_display, refresh_interval_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        displayId,
        data.printerId,
        tenantId,
        data.displayName || 'Kitchen Display',
        JSON.stringify(data.layoutConfig || defaultLayout),
        data.autoAcknowledge || false,
        data.orderTimeoutMinutes || 30,
        data.fontSize || 'medium',
        data.theme || 'light',
        data.soundAlerts !== undefined ? data.soundAlerts : true,
        data.maxOrdersDisplay || 12,
        data.refreshIntervalSeconds || 5
      ]);

      console.log('✅ Kitchen display created:', displayId);
      
      // Return the created display
      const [displays] = await pool.execute(
        'SELECT * FROM kitchen_displays WHERE id = ?',
        [displayId]
      );
      
      return this.mapDatabaseToDisplay((displays as any[])[0]);
    } catch (error) {
      console.error('❌ Error creating kitchen display:', error);
      throw new Error('Failed to create kitchen display');
    }
  }

  /**
   * Update kitchen display settings
   */
  static async updateDisplay(displayId: string, tenantId: string, data: Partial<KitchenDisplay>): Promise<void> {
    try {
      const updateFields = [];
      const updateValues = [];

      if (data.displayName) {
        updateFields.push('display_name = ?');
        updateValues.push(data.displayName);
      }

      if (data.layoutConfig) {
        updateFields.push('layout_config = ?');
        updateValues.push(JSON.stringify(data.layoutConfig));
      }

      if (data.autoAcknowledge !== undefined) {
        updateFields.push('auto_acknowledge = ?');
        updateValues.push(data.autoAcknowledge);
      }

      if (data.orderTimeoutMinutes) {
        updateFields.push('order_timeout_minutes = ?');
        updateValues.push(data.orderTimeoutMinutes);
      }

      if (data.fontSize) {
        updateFields.push('font_size = ?');
        updateValues.push(data.fontSize);
      }

      if (data.theme) {
        updateFields.push('theme = ?');
        updateValues.push(data.theme);
      }

      if (data.soundAlerts !== undefined) {
        updateFields.push('sound_alerts = ?');
        updateValues.push(data.soundAlerts);
      }

      if (data.maxOrdersDisplay) {
        updateFields.push('max_orders_display = ?');
        updateValues.push(data.maxOrdersDisplay);
      }

      if (data.refreshIntervalSeconds) {
        updateFields.push('refresh_interval_seconds = ?');
        updateValues.push(data.refreshIntervalSeconds);
      }

      if (updateFields.length === 0) {
        return;
      }

      updateValues.push(displayId, tenantId);

      await pool.execute(`
        UPDATE kitchen_displays 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND tenant_id = ?
      `, updateValues);

      console.log('✅ Kitchen display updated:', displayId);
    } catch (error) {
      console.error('❌ Error updating kitchen display:', error);
      throw new Error('Failed to update kitchen display');
    }
  }

  /**
   * Delete kitchen display
   */
  static async deleteDisplay(displayId: string, tenantId: string): Promise<void> {
    try {
      await pool.execute(
        'DELETE FROM kitchen_displays WHERE id = ? AND tenant_id = ?',
        [displayId, tenantId]
      );

      console.log('✅ Kitchen display deleted:', displayId);
    } catch (error) {
      console.error('❌ Error deleting kitchen display:', error);
      throw new Error('Failed to delete kitchen display');
    }
  }

  /**
   * Add order to kitchen displays
   */
  static async addOrderToDisplays(tenantId: string, order: any): Promise<void> {
    try {
      console.log('🖥️ Adding order to kitchen displays:', order.orderNumber);

      // Get all active kitchen displays for this tenant
      const displays = await this.getTenantDisplays(tenantId);
      const activeDisplays = displays.filter(d => d.printerId); // Only displays linked to active printers

      if (activeDisplays.length === 0) {
        console.log('ℹ️ No active kitchen displays found for tenant:', tenantId);
        return;
      }

      // Add order to each active display
      for (const display of activeDisplays) {
        const displayOrderId = uuidv4();
        
        await pool.execute(`
          INSERT INTO display_order_status (
            id, order_id, display_id, tenant_id, status, priority_level
          ) VALUES (?, ?, ?, ?, 'new', ?)
        `, [
          displayOrderId,
          order.id,
          display.id,
          tenantId,
          this.calculateOrderPriority(order)
        ]);

        // Log the action
        await this.logDisplayAction(display.id, tenantId, 'order_received', order.id);
      }

      console.log('✅ Order added to', activeDisplays.length, 'kitchen displays');
    } catch (error) {
      console.error('❌ Error adding order to displays:', error);
      // Don't throw error as this shouldn't break order processing
    }
  }

  /**
   * Get orders for a specific display
   */
  static async getDisplayOrders(displayId: string, tenantId: string): Promise<DisplayOrder[]> {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          dos.*,
          o.order_number,
          o.customer_name,
          o.order_type,
          o.total_amount,
          o.special_instructions,
          o.items
        FROM display_order_status dos
        LEFT JOIN orders o ON dos.order_id = o.id
        WHERE dos.display_id = ? AND dos.tenant_id = ?
        AND dos.status != 'completed'
        ORDER BY 
          CASE dos.priority_level 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
          END,
          dos.created_at ASC
      `, [displayId, tenantId]);

      return (rows as any[]).map(this.mapDatabaseToDisplayOrder);
    } catch (error) {
      console.error('❌ Error fetching display orders:', error);
      throw new Error('Failed to fetch display orders');
    }
  }

  /**
   * Update order status on display
   */
  static async updateOrderStatus(
    displayOrderId: string, 
    tenantId: string, 
    newStatus: 'new' | 'preparing' | 'ready' | 'completed',
    userId?: string
  ): Promise<void> {
    try {
      const updateFields = ['status = ?', 'updated_at = NOW()'];
      const updateValues: any[] = [newStatus];

      if (newStatus === 'preparing') {
        updateFields.push('acknowledged_at = NOW()');
      } else if (newStatus === 'completed') {
        updateFields.push('completed_at = NOW()');
        
        // Calculate prep time
        updateFields.push(`prep_time_minutes = TIMESTAMPDIFF(MINUTE, 
          COALESCE(acknowledged_at, created_at), NOW())`);
      }

      updateValues.push(displayOrderId, tenantId);

      await pool.execute(`
        UPDATE display_order_status 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND tenant_id = ?
      `, updateValues);

      // Get display_id and order_id for logging
      const [orderData] = await pool.execute(
        'SELECT display_id, order_id FROM display_order_status WHERE id = ?',
        [displayOrderId]
      );

      if ((orderData as any[]).length > 0) {
        const { display_id, order_id } = (orderData as any[])[0];
        
        // Log the status change
        await this.logDisplayAction(
          display_id, 
          tenantId, 
          'status_changed', 
          order_id,
          { newStatus, userId }
        );
      }

      console.log('✅ Order status updated:', displayOrderId, 'to', newStatus);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Get kitchen display statistics
   */
  static async getDisplayStats(tenantId: string): Promise<KitchenDisplayStats> {
    try {
      const [statsRows] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT kd.id) as total_displays,
          COUNT(DISTINCT CASE WHEN p.active = 1 THEN kd.id END) as active_displays,
          COUNT(DISTINCT CASE WHEN DATE(dos.created_at) = CURDATE() THEN dos.order_id END) as total_orders_today,
          AVG(dos.prep_time_minutes) as average_prep_time,
          COUNT(DISTINCT CASE WHEN dos.status IN ('new', 'preparing') THEN dos.order_id END) as orders_in_progress,
          COUNT(DISTINCT CASE WHEN dos.status = 'completed' AND DATE(dos.completed_at) = CURDATE() THEN dos.order_id END) as completed_orders_today
        FROM kitchen_displays kd
        LEFT JOIN printers p ON kd.printer_id = p.id
        LEFT JOIN display_order_status dos ON kd.id = dos.display_id
        WHERE kd.tenant_id = ?
      `, [tenantId]);

      const stats = (statsRows as any[])[0];
      
      return {
        totalDisplays: parseInt(stats.total_displays) || 0,
        activeDisplays: parseInt(stats.active_displays) || 0,
        totalOrdersToday: parseInt(stats.total_orders_today) || 0,
        averagePrepTime: parseFloat(stats.average_prep_time) || 0,
        ordersInProgress: parseInt(stats.orders_in_progress) || 0,
        completedOrdersToday: parseInt(stats.completed_orders_today) || 0
      };
    } catch (error) {
      console.error('❌ Error fetching display stats:', error);
      return {
        totalDisplays: 0,
        activeDisplays: 0,
        totalOrdersToday: 0,
        averagePrepTime: 0,
        ordersInProgress: 0,
        completedOrdersToday: 0
      };
    }
  }

  /**
   * Clean up old completed orders
   */
  static async cleanupCompletedOrders(tenantId: string, hoursOld: number = 24): Promise<void> {
    try {
      await pool.execute(`
        DELETE FROM display_order_status 
        WHERE tenant_id = ? 
        AND status = 'completed' 
        AND completed_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
      `, [tenantId, hoursOld]);

      console.log('✅ Cleaned up old completed orders for tenant:', tenantId);
    } catch (error) {
      console.error('❌ Error cleaning up orders:', error);
    }
  }

  /**
   * Calculate order priority based on order characteristics
   */
  private static calculateOrderPriority(order: any): 'low' | 'normal' | 'high' | 'urgent' {
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

    // High priority for large orders
    if (order.total_amount > 100) {
      priority = 'high';
    }

    // Urgent for orders with special instructions or allergies
    if (order.special_instructions && 
        (order.special_instructions.toLowerCase().includes('allergy') ||
         order.special_instructions.toLowerCase().includes('urgent'))) {
      priority = 'urgent';
    }

    // High priority for VIP customers (if customer data available)
    if (order.customer_tier === 'vip' || order.customer_tier === 'gold') {
      priority = 'high';
    }

    return priority;
  }

  /**
   * Log display action for audit trail
   */
  private static async logDisplayAction(
    displayId: string,
    tenantId: string,
    actionType: string,
    orderId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const logId = uuidv4();
      
      await pool.execute(`
        INSERT INTO kitchen_display_logs (
          id, display_id, tenant_id, action_type, order_id, metadata, user_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        logId,
        displayId,
        tenantId,
        actionType,
        orderId || null,
        metadata ? JSON.stringify(metadata) : null,
        metadata?.userId ? true : false
      ]);
    } catch (error) {
      console.error('❌ Error logging display action:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Map database row to KitchenDisplay object
   */
  private static mapDatabaseToDisplay(row: any): KitchenDisplay {
    return {
      id: row.id,
      printerId: row.printer_id,
      tenantId: row.tenant_id,
      displayName: row.display_name,
      layoutConfig: typeof row.layout_config === 'string' 
        ? JSON.parse(row.layout_config) 
        : row.layout_config,
      autoAcknowledge: Boolean(row.auto_acknowledge),
      orderTimeoutMinutes: row.order_timeout_minutes,
      fontSize: row.font_size,
      theme: row.theme,
      soundAlerts: Boolean(row.sound_alerts),
      maxOrdersDisplay: row.max_orders_display,
      refreshIntervalSeconds: row.refresh_interval_seconds,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to DisplayOrder object
   */
  private static mapDatabaseToDisplayOrder(row: any): DisplayOrder {
    return {
      id: row.id,
      orderId: row.order_id,
      displayId: row.display_id,
      tenantId: row.tenant_id,
      status: row.status,
      acknowledgedAt: row.acknowledged_at,
      completedAt: row.completed_at,
      prepTimeMinutes: row.prep_time_minutes,
      estimatedReadyTime: row.estimated_ready_time,
      priorityLevel: row.priority_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      orderType: row.order_type,
      totalAmount: row.total_amount,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      specialInstructions: row.special_instructions
    };
  }
}
