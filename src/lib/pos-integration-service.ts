import { Order } from '@/lib/types';

export interface POSConfig {
  endpointUrl: string;
  apiKey?: string;
  timeout: number;
  enabled: boolean;
}

export interface POSPrintResponse {
  success: boolean;
  message: string;
  orderId: string;
  printJobId?: string;
  timestamp: Date;
}

export interface POSPrintStatus {
  orderId: string;
  printJobId: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  message?: string;
  timestamp: Date;
}

/**
 * Smart POS Integration Service
 * Handles automatic printing to .NET POS system with retry logic
 */
export class POSIntegrationService {
  
  /**
   * Send order to POS system for printing
   */
  static async sendOrderToPOS(tenantId: string, order: Order): Promise<POSPrintResponse> {
    try {
      console.log('🖨️ Sending order to POS system:', order.orderNumber);
      
      // Get POS configuration for tenant
      const posConfig = await this.getPOSConfig(tenantId);
      
      if (!posConfig || !posConfig.enabled) {
        console.log('⚠️ POS integration disabled for tenant:', tenantId);
        return {
          success: false,
          message: 'POS integration not configured',
          orderId: order.id,
          timestamp: new Date()
        };
      }
      
      // Prepare order data for POS
      const posOrderData = this.formatOrderForPOS(order);
      
      // Send to POS system
      const response = await fetch(posConfig.endpointUrl + '/api/print-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(posConfig.apiKey && { 'Authorization': `Bearer ${posConfig.apiKey}` })
        },
        body: JSON.stringify(posOrderData),
        signal: AbortSignal.timeout(posConfig.timeout * 1000)
      });
      
      if (!response.ok) {
        throw new Error(`POS API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Order sent to POS successfully:', result);
      
      return {
        success: true,
        message: 'Order sent to POS successfully',
        orderId: order.id,
        printJobId: result.printJobId,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error sending order to POS:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown POS error',
        orderId: order.id,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Check print status from POS system
   */
  static async checkPrintStatus(tenantId: string, orderId: string, printJobId: string): Promise<POSPrintStatus | null> {
    try {
      console.log('🔍 Checking print status for order:', orderId);
      
      const posConfig = await this.getPOSConfig(tenantId);
      
      if (!posConfig || !posConfig.enabled) {
        return null;
      }
      
      const response = await fetch(`${posConfig.endpointUrl}/api/print-status/${printJobId}`, {
        method: 'GET',
        headers: {
          ...(posConfig.apiKey && { 'Authorization': `Bearer ${posConfig.apiKey}` })
        },
        signal: AbortSignal.timeout(posConfig.timeout * 1000)
      });
      
      if (!response.ok) {
        throw new Error(`POS Status API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        orderId,
        printJobId,
        status: result.status,
        message: result.message,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error checking print status:', error);
      return null;
    }
  }
  
  /**
   * Retry failed print job
   */
  static async retryPrintJob(tenantId: string, order: Order): Promise<POSPrintResponse> {
    console.log('🔄 Retrying print job for order:', order.orderNumber);
    return this.sendOrderToPOS(tenantId, order);
  }
  
  /**
   * Format order data for POS system
   */
  private static formatOrderForPOS(order: Order) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      address: order.address,
      orderType: order.orderType,
      isAdvanceOrder: order.isAdvanceOrder,
      scheduledTime: order.scheduledTime,
      status: order.status,
      paymentMethod: order.paymentMethod,
      specialInstructions: order.specialInstructions,
      items: order.items.map(item => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
        basePrice: item.basePrice,
        addonPrice: item.addonPrice,
        finalPrice: item.finalPrice,
        specialInstructions: item.specialInstructions,
        addons: item.selectedAddons?.flatMap(addon => 
          addon.options.map(option => ({
            groupName: addon.groupName,
            optionId: option.optionId,
            quantity: option.quantity,
            price: option.totalPrice,
            customNote: option.customNote
          }))
        ) || []
      })),
      totals: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        total: order.total
      },
      voucherCode: order.voucherCode,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get POS configuration for tenant
   */
  private static async getPOSConfig(tenantId: string): Promise<POSConfig | null> {
    try {
      // In a real implementation, this would fetch from database
      // For now, return a mock configuration
      return {
        endpointUrl: process.env.POS_API_ENDPOINT || 'http://localhost:8080',
        apiKey: process.env.POS_API_KEY,
        timeout: 30, // 30 seconds
        enabled: process.env.POS_INTEGRATION_ENABLED === 'true'
      };
    } catch (error) {
      console.error('❌ Error getting POS config:', error);
      return null;
    }
  }
}
