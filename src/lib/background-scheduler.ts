import { AdvancedOrderSchedulerService } from '@/lib/advance-order-scheduler';
import { DailyPrepAlertService } from '@/lib/daily-prep-alert-service';
import pool from '@/lib/db';

/**
 * Background Scheduler Service
 * Handles automatic firing of advance orders and daily email alerts
 */
export class BackgroundSchedulerService {
  
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Start the background scheduler
   */
  static start(): void {
    if (this.isRunning) {
      console.log('⚠️ Background scheduler already running');
      return;
    }
    
    console.log('🚀 Starting background scheduler service...');
    
    this.isRunning = true;
    
    // Check for ready orders every minute
    this.intervalId = setInterval(async () => {
      await this.processScheduledTasks();
    }, 60000); // 1 minute
    
    // Also run immediately
    this.processScheduledTasks();
    
    console.log('✅ Background scheduler started successfully');
  }
  
  /**
   * Stop the background scheduler
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Background scheduler not running');
      return;
    }
    
    console.log('🛑 Stopping background scheduler service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    console.log('✅ Background scheduler stopped successfully');
  }
  
  /**
   * Process all scheduled tasks
   */
  private static async processScheduledTasks(): Promise<void> {
    try {
      console.log('🔄 Processing scheduled tasks...');
      
      const now = new Date();
      
      // Check if it's 8 AM for daily alerts (only run once per day)
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        console.log('📧 Time for daily prep alerts...');
        await DailyPrepAlertService.sendDailyAlerts();
      }
      
      // Process advance orders for all tenants
      const tenants = await this.getActiveTenants();
      
      for (const tenant of tenants) {
        await AdvancedOrderSchedulerService.processReadyOrders(tenant.id);
      }
      
      // Clean up old logs (keep last 30 days)
      await this.cleanupOldLogs();
      
    } catch (error) {
      console.error('❌ Error processing scheduled tasks:', error);
    }
  }
  
  /**
   * Get all active tenants
   */
  private static async getActiveTenants(): Promise<{ id: string; name: string }[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT id, name FROM tenants WHERE active = 1'
      );
      
      return (rows as any[]).map(row => ({
        id: row.id,
        name: row.name
      }));
      
    } catch (error) {
      console.error('❌ Error getting active tenants:', error);
      return [];
    }
  }
  
  /**
   * Clean up old logs and data
   */
  private static async cleanupOldLogs(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Clean old print job logs
      await pool.execute(
        'DELETE FROM print_job_logs WHERE created_at < ?',
        [thirtyDaysAgo]
      );
      
      // Clean old daily prep alerts
      await pool.execute(
        'DELETE FROM daily_prep_alerts WHERE date < ?',
        [thirtyDaysAgo]
      );
      
      // Clean completed advance order schedules older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      await pool.execute(
        'DELETE FROM advance_order_schedules WHERE status = "PRINTED" AND updated_at < ?',
        [sevenDaysAgo]
      );
      
      console.log('🧹 Cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  /**
   * Get scheduler status
   */
  static getStatus(): { running: boolean; startedAt?: Date } {
    return {
      running: this.isRunning,
      startedAt: this.isRunning ? new Date() : undefined
    };
  }
  
  /**
   * Force process all tasks (for testing)
   */
  static async forceProcess(): Promise<void> {
    console.log('🔧 Forcing task processing...');
    await this.processScheduledTasks();
  }
}

// Auto-start the scheduler when the module loads
if (typeof window === 'undefined') {
  // Only run on server-side
  BackgroundSchedulerService.start();
}

export default BackgroundSchedulerService;
