import { Order } from '@/lib/types';
// import { EmailService } from '@/lib/email-service'; // TODO: Create email service
import pool from './db';
import { AdvancedOrderSchedulerService, FireTimeCalculation } from './advance-order-scheduler';

export interface DailyPrepAlert {
  tenantId: string;
  date: Date;
  orderCount: number;
  orders: (Order & { fireSchedule?: FireTimeCalculation })[];
  sentAt: Date;
}

/**
 * Daily Pre-Prep Email Alert Service
 * Sends morning alerts to restaurants about advance orders scheduled for the day
 */
export class DailyPrepAlertService {
  
  /**
   * Send daily 8 AM alerts for all tenants with advance orders
   */
  static async sendDailyAlerts(): Promise<void> {
    try {
      console.log('📧 Starting daily prep alerts process...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const tenants = await this.getActiveTenants();
      
      for (const tenant of tenants) {
        await this.sendTenantDailyAlert(tenant.id, today);
      }
      
      console.log('✅ Daily prep alerts completed');
      
    } catch (error) {
      console.error('❌ Error sending daily alerts:', error);
    }
  }
  
  /**
   * Send daily alert for a specific tenant
   */
  static async sendTenantDailyAlert(tenantId: string, targetDate: Date): Promise<void> {
    try {
      console.log('📧 Processing daily alert for tenant:', tenantId);
      
      // Get advance orders for today
      const ordersWithSchedules = await AdvancedOrderSchedulerService.getAdvanceOrdersWithSchedules(tenantId);
      
      // Filter for today's orders
      const todaysOrders = ordersWithSchedules.filter(order => {
        if (!order.scheduledTime) return false;
        
        const orderDate = new Date(order.scheduledTime);
        orderDate.setHours(0, 0, 0, 0);
        
        return orderDate.getTime() === targetDate.getTime();
      });
      
      // If no orders for today, don't send email
      if (todaysOrders.length === 0) {
        console.log('ℹ️ No advance orders for today, skipping email for tenant:', tenantId);
        return;
      }
      
      // Check if we already sent alert for today
      const alreadySent = await this.hasAlertBeenSent(tenantId, targetDate);
      if (alreadySent) {
        console.log('ℹ️ Daily alert already sent for tenant:', tenantId);
        return;
      }
      
      // Get tenant info
      const tenantInfo = await this.getTenantInfo(tenantId);
      if (!tenantInfo || !tenantInfo.email) {
        console.log('⚠️ No email configured for tenant:', tenantId);
        return;
      }
      
      // Send email
      await this.sendPrepAlert(tenantInfo, todaysOrders, targetDate);
      
      // Record that we sent the alert
      await this.recordAlertSent(tenantId, targetDate, todaysOrders.length);
      
      console.log('✅ Daily alert sent successfully for tenant:', tenantId);
      
    } catch (error) {
      console.error('❌ Error sending tenant daily alert:', error);
    }
  }
  
  /**
   * Send the actual prep alert email
   */
  private static async sendPrepAlert(
    tenantInfo: any, 
    orders: (Order & { fireSchedule?: FireTimeCalculation })[], 
    targetDate: Date
  ): Promise<void> {
    try {
      const subject = `Daily Prep Alert: ${orders.length} advance order${orders.length > 1 ? 's' : ''} for ${targetDate.toDateString()}`;
      
      // Group orders by fire time for better organization
      const ordersByFireTime = this.groupOrdersByFireTime(orders);
      
      const emailBody = this.generateAlertEmailBody(tenantInfo, ordersByFireTime, targetDate);
      
      // TODO: Implement EmailService for production
      // await EmailService.sendEmail({
      //   to: tenantInfo.email,
      //   subject,
      //   html: emailBody,
      //   from: process.env.SMTP_FROM_EMAIL || 'noreply@orderwebsystem.com'
      // });
      
      console.log('📧 Prep alert email functionality disabled for production build');
      
    } catch (error) {
      console.error('❌ Error sending prep alert email:', error);
      throw error;
    }
  }
  
  /**
   * Generate HTML email body for daily alert
   */
  private static generateAlertEmailBody(
    tenantInfo: any, 
    ordersByFireTime: Map<string, (Order & { fireSchedule?: FireTimeCalculation })[]>, 
    targetDate: Date
  ): string {
    const totalOrders = Array.from(ordersByFireTime.values()).reduce((sum, orders) => sum + orders.length, 0);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Prep Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-group { margin-bottom: 30px; }
          .fire-time { background-color: #f3f4f6; padding: 10px; border-left: 4px solid #2563eb; margin-bottom: 10px; }
          .order-item { background-color: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .order-header { font-weight: bold; color: #1f2937; }
          .order-details { margin-top: 10px; font-size: 14px; color: #6b7280; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .alert-badge { background-color: #dc2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍳 Daily Prep Alert</h1>
          <p>${tenantInfo.name || 'Restaurant'}</p>
        </div>
        
        <div class="content">
          <h2>Good Morning! 🌅</h2>
          <p>You have <strong>${totalOrders}</strong> advance order${totalOrders > 1 ? 's' : ''} scheduled for today, ${targetDate.toDateString()}.</p>
          
          <h3>📅 Orders by Kitchen Fire Time:</h3>
    `;
    
    // Add orders grouped by fire time
    for (const [fireTimeStr, orders] of ordersByFireTime) {
      html += `
        <div class="order-group">
          <div class="fire-time">
            <strong>🚀 Kitchen Fire Time: ${fireTimeStr}</strong>
            <span class="alert-badge">${orders.length} order${orders.length > 1 ? 's' : ''}</span>
          </div>
      `;
      
      for (const order of orders) {
        const scheduledTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleTimeString() : 'TBD';
        const customerTime = order.scheduledTime ? new Date(order.scheduledTime).toLocaleString() : 'TBD';
        
        html += `
          <div class="order-item">
            <div class="order-header">
              Order #${order.orderNumber} - ${order.customerName}
            </div>
            <div class="order-details">
              <div><strong>Customer Pickup/Delivery:</strong> ${customerTime}</div>
              <div><strong>Phone:</strong> ${order.customerPhone}</div>
              <div><strong>Type:</strong> ${order.orderType.toUpperCase()}</div>
              <div><strong>Total:</strong> £${order.total.toFixed(2)}</div>
              <div><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</div>
              ${order.specialInstructions ? `<div><strong>Special Instructions:</strong> ${order.specialInstructions}</div>` : ''}
              <div><strong>Items:</strong></div>
              <ul>
                ${order.items.map(item => `
                  <li>${item.quantity}x ${item.menuItem.name} (£${item.finalPrice.toFixed(2)})</li>
                `).join('')}
              </ul>
            </div>
          </div>
        `;
      }
      
      html += '</div>';
    }
    
    html += `
          <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-radius: 5px;">
            <h4>💡 Remember:</h4>
            <ul>
              <li>Orders will automatically fire to your kitchen 90 minutes before customer pickup time</li>
              <li>Check your POS system for automatic prints</li>
              <li>Failed prints will appear in your manual print area</li>
              <li>Contact support if you need to adjust fire times</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated daily alert from your Order Management System</p>
          <p>Generated at ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Group orders by their fire time for better organization
   */
  private static groupOrdersByFireTime(orders: (Order & { fireSchedule?: FireTimeCalculation })[]): Map<string, (Order & { fireSchedule?: FireTimeCalculation })[]> {
    const groups = new Map<string, (Order & { fireSchedule?: FireTimeCalculation })[]>();
    
    for (const order of orders) {
      const fireTime = order.fireSchedule?.fireTime;
      const fireTimeKey = fireTime ? fireTime.toLocaleTimeString() : 'TBD';
      
      if (!groups.has(fireTimeKey)) {
        groups.set(fireTimeKey, []);
      }
      
      groups.get(fireTimeKey)!.push(order);
    }
    
    return groups;
  }
  
  // Database operations
  private static async getActiveTenants(): Promise<{ id: string; name: string; email?: string }[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email FROM tenants WHERE active = 1'
      );
      
      return (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        email: row.email
      }));
      
    } catch (error) {
      console.error('❌ Error getting active tenants:', error);
      return [];
    }
  }
  
  private static async getTenantInfo(tenantId: string): Promise<{ id: string; name: string; email?: string } | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email FROM tenants WHERE id = ?',
        [tenantId]
      );
      
      const row = (rows as any[])[0];
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        email: row.email
      };
      
    } catch (error) {
      console.error('❌ Error getting tenant info:', error);
      return null;
    }
  }
  
  private static async hasAlertBeenSent(tenantId: string, date: Date): Promise<boolean> {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM daily_prep_alerts WHERE tenant_id = ? AND DATE(date) = DATE(?)',
        [tenantId, date]
      );
      
      return (rows as any[])[0].count > 0;
      
    } catch (error) {
      console.error('❌ Error checking if alert was sent:', error);
      return false;
    }
  }
  
  private static async recordAlertSent(tenantId: string, date: Date, orderCount: number): Promise<void> {
    try {
      await pool.execute(
        'INSERT INTO daily_prep_alerts (tenant_id, date, order_count, sent_at) VALUES (?, ?, ?, ?)',
        [tenantId, date, orderCount, new Date()]
      );
      
    } catch (error) {
      console.error('❌ Error recording alert sent:', error);
    }
  }
}
