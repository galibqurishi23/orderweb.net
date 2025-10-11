import { PrinterService } from '@/lib/robust-printer-service';
import { Order, Printer } from '@/lib/types';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';
import { WebSocketService } from '@/lib/websocket-service';

/**
 * Order printing service that integrates with the enhanced printer system
 * and Kitchen Display System (KDS)
 */
export class OrderPrintingService {
  
  /**
   * Print an order to appropriate printers AND send to kitchen displays
   */
  static async printOrder(tenantId: string, order: Order): Promise<void> {
    try {
      console.log('🖨️ Processing order for printing and display:', order.orderNumber);
      
      // Get all active printers for the tenant
      const printers = await PrinterService.getTenantPrinters(tenantId);
      const activePrinters = printers.filter(p => p.active);
      
      // Separate physical printers from kitchen displays
      const physicalPrinters = activePrinters.filter(p => p.type !== 'kitchen-display');
      const kitchenDisplayPrinters = activePrinters.filter(p => p.type === 'kitchen-display');
      
      // Process physical printers
      if (physicalPrinters.length > 0) {
        await this.processPhysicalPrinters(physicalPrinters, order);
      } else {
        console.warn('⚠️ No active physical printers found for tenant:', tenantId);
      }
      
      // Process kitchen displays
      if (kitchenDisplayPrinters.length > 0) {
        await this.processKitchenDisplays(tenantId, order);
      } else {
        console.log('ℹ️ No active kitchen displays found for tenant:', tenantId);
      }
      
      console.log('✅ Order processed successfully:', order.orderNumber);
      
    } catch (error) {
      console.error('❌ Error processing order:', error);
      throw error;
    }
  }

  /**
   * Process physical printers (existing functionality)
   */
  private static async processPhysicalPrinters(printers: Printer[], order: Order): Promise<void> {
    console.log('🖨️ Printing to physical printers:', printers.length);
    
    // Print to different printer types
    const printPromises = [];
    
    // Print kitchen order
    const kitchenPrinters = printers.filter(p => p.type === 'kitchen');
    for (const printer of kitchenPrinters) {
      const kitchenContent = this.formatKitchenOrder(order);
      printPromises.push(
        PrinterService.sendPrintJob(printer, kitchenContent, 'kitchen')
      );
    }
    
    // Print receipt
    const receiptPrinters = printers.filter(p => p.type === 'receipt');
    for (const printer of receiptPrinters) {
      const receiptContent = this.formatReceipt(order);
      printPromises.push(
        PrinterService.sendPrintJob(printer, receiptContent, 'receipt')
      );
    }
    
    // Print bar orders (if any drink items)
    const hasDrinks = order.items.some(item => 
      item.menuItem.categoryId === 'drinks' || 
      item.menuItem.name.toLowerCase().includes('drink')
    );
      
    if (hasDrinks) {
      const barPrinters = printers.filter(p => p.type === 'bar');
      for (const printer of barPrinters) {
        const barContent = this.formatBarOrder(order);
        printPromises.push(
          PrinterService.sendPrintJob(printer, barContent, 'bar')
        );
      }
    }
    
    // Wait for all print jobs to complete
    const results = await Promise.allSettled(printPromises);
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Print job ${index + 1} completed:`, result.value.message);
      } else {
        console.error(`❌ Print job ${index + 1} failed:`, result.reason);
      }
    });
    
    console.log('🎯 Physical printing completed for order:', order.orderNumber);
  }

  /**
   * Process kitchen displays (NEW functionality)
   */
  private static async processKitchenDisplays(tenantId: string, order: Order): Promise<void> {
    try {
      console.log('🖥️ Sending order to kitchen displays:', order.orderNumber);
      
      // Add order to kitchen display system
      await KitchenDisplayService.addOrderToDisplays(tenantId, order);
      
      // Send real-time update via WebSocket
      await WebSocketService.sendNewOrder(tenantId, order);
      
      console.log('✅ Order sent to kitchen displays successfully');
      
    } catch (error) {
      console.error('❌ Error sending order to kitchen displays:', error);
      // Don't throw error as this shouldn't break order processing
    }
  }

  /**
   * Format kitchen order for printing
   */
  private static formatKitchenOrder(order: Order): string {
    const lines = [];
    
    lines.push('='.repeat(32));
    lines.push('        KITCHEN ORDER');
    lines.push('='.repeat(32));
    lines.push('');
    lines.push(`Order #: ${order.orderNumber}`);
    lines.push(`Time: ${new Date(order.createdAt).toLocaleString()}`);
    lines.push(`Customer: ${order.customerName}`);
    lines.push(`Phone: ${order.customerPhone}`);
    if (order.address) {
      lines.push(`Address: ${order.address}`);
    }
    lines.push('');
    lines.push('-'.repeat(32));
    lines.push('ITEMS:');
    lines.push('-'.repeat(32));
    
    order.items.forEach(item => {
      lines.push(`${item.quantity}x ${item.menuItem.name}`);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        // TODO: Fix addon structure for printing
        lines.push(`  + Addons selected (${item.selectedAddons.length} groups)`);
      }
      if (item.specialInstructions) {
        lines.push(`  NOTE: ${item.specialInstructions}`);
      }
      lines.push('');
    });
    
    // Add overall order special instructions
    if (order.specialInstructions) {
      lines.push('-'.repeat(32));
      lines.push('OVERALL ORDER NOTES:');
      lines.push(order.specialInstructions);
      lines.push('');
    }
    
    lines.push('-'.repeat(32));
    lines.push(`Total: $${order.total.toFixed(2)}`);
    lines.push('='.repeat(32));
    
    return lines.join('\n');
  }
  
  /**
   * Format receipt for printing
   */
  private static formatReceipt(order: Order): string {
    const lines = [];
    
    lines.push('='.repeat(32));
    lines.push('        RECEIPT');
    lines.push('='.repeat(32));
    lines.push('');
    lines.push(`Order #: ${order.orderNumber}`);
    lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    lines.push(`Customer: ${order.customerName}`);
    lines.push('');
    lines.push('-'.repeat(32));
    
    let subtotal = 0;
    order.items.forEach(item => {
      const itemTotal = item.quantity * item.menuItem.price;
      subtotal += itemTotal;
      
      lines.push(`${item.quantity}x ${item.menuItem.name}`);
      lines.push(`    $${item.menuItem.price.toFixed(2)} each = $${itemTotal.toFixed(2)}`);
      
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        // TODO: Fix addon pricing structure for detailed receipt
        const addonTotal = item.selectedAddons.reduce((sum, addon) => sum + addon.totalPrice, 0) * item.quantity;
        lines.push(`  + Addons = $${addonTotal.toFixed(2)}`);
        subtotal += addonTotal;
      }
      lines.push('');
    });
    
    // Add overall order special instructions to receipt
    if (order.specialInstructions) {
      lines.push('-'.repeat(32));
      lines.push('SPECIAL INSTRUCTIONS:');
      lines.push(order.specialInstructions);
      lines.push('');
    }
    
    lines.push('-'.repeat(32));
    lines.push(`Subtotal: $${subtotal.toFixed(2)}`);
    // Tax line removed - application is tax-free
    lines.push(`TOTAL: $${order.total.toFixed(2)}`);
    lines.push('='.repeat(32));
    lines.push('');
    lines.push('Thank you for your order!');
    lines.push('');
    
    return lines.join('\n');
  }
  
  /**
   * Format bar order for printing
   */
  private static formatBarOrder(order: Order): string {
    const lines = [];
    
    lines.push('='.repeat(32));
    lines.push('        BAR ORDER');
    lines.push('='.repeat(32));
    lines.push('');
    lines.push(`Order #: ${order.orderNumber}`);
    lines.push(`Time: ${new Date(order.createdAt).toLocaleString()}`);
    lines.push(`Customer: ${order.customerName}`);
    lines.push('');
    lines.push('-'.repeat(32));
    lines.push('DRINKS:');
    lines.push('-'.repeat(32));
    
    // Filter only drink items
    const drinkItems = order.items.filter(item => 
      item.menuItem.categoryId === 'drinks' || 
      item.menuItem.name.toLowerCase().includes('drink')
    );
    
    drinkItems.forEach(item => {
      lines.push(`${item.quantity}x ${item.menuItem.name}`);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        // TODO: Fix addon structure for kitchen printing
        lines.push(`  + Addons selected (${item.selectedAddons.length} groups)`);
      }
      if (item.specialInstructions) {
        lines.push(`  NOTE: ${item.specialInstructions}`);
      }
      lines.push('');
    });
    
    // Add overall order special instructions to bar receipt
    if (order.specialInstructions) {
      lines.push('-'.repeat(32));
      lines.push('OVERALL ORDER NOTES:');
      lines.push(order.specialInstructions);
      lines.push('');
    }
    
    lines.push('='.repeat(32));
    
    return lines.join('\n');
  }
  
  /**
   * Test all printers for a tenant
   */
  static async testAllPrinters(tenantId: string): Promise<{ [printerId: string]: any }> {
    const printers = await PrinterService.getTenantPrinters(tenantId);
    const results: { [printerId: string]: any } = {};
    
    for (const printer of printers) {
      try {
        const result = await PrinterService.testPrinterConnection(printer);
        results[printer.id] = result;
      } catch (error) {
        results[printer.id] = {
          success: false,
          message: 'Test failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return results;
  }
}
