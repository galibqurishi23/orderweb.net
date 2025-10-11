import { Printer, PrinterType } from '@/lib/types';
import { PrinterTestResult } from '@/lib/robust-printer-service';

export interface PrinterFormData {
  name: string;
  ipAddress: string;
  port: number;
  type: PrinterType;
  active: boolean;
}

export interface PrinterStats {
  totalPrinters: number;
  activePrinters: number;
  printerTypes: { [key: string]: number };
  recentJobs: number;
}

export interface DiscoveredPrinter {
  ip: string;
  port: number;
  responsive: boolean;
}

/**
 * Client-side service for enhanced printer management
 */
export class ClientPrinterService {
  
  /**
   * Get all printers for a tenant
   */
  static async getTenantPrinters(tenantId: string): Promise<Printer[]> {
    const response = await fetch(`/api/tenant/printers?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch printers');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * Save a new printer
   */
  static async savePrinter(tenantId: string, printerData: PrinterFormData): Promise<string> {
    const response = await fetch(`/api/tenant/printers?tenantId=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save printer');
    }
    
    const result = await response.json();
    return result.data.id;
  }

  /**
   * Update an existing printer
   */
  static async updatePrinter(tenantId: string, printerId: string, printerData: PrinterFormData): Promise<void> {
    const response = await fetch(`/api/tenant/printers/${printerId}?tenantId=${tenantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update printer');
    }
  }

  /**
   * Delete a printer
   */
  static async deletePrinter(tenantId: string, printerId: string): Promise<void> {
    const response = await fetch(`/api/tenant/printers/${printerId}?tenantId=${tenantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete printer');
    }
  }

  /**
   * Test printer connection
   */
  static async testPrinterConnection(tenantId: string, printerId: string): Promise<PrinterTestResult> {
    const response = await fetch(`/api/tenant/printers/${printerId}/test?tenantId=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to test printer');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * Get printer statistics
   */
  static async getPrinterStats(tenantId: string): Promise<PrinterStats> {
    const response = await fetch(`/api/tenant/printers/stats?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch printer stats');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * Discover printers on network
   */
  static async discoverPrinters(tenantId: string, networkRange: string = '192.168.1'): Promise<DiscoveredPrinter[]> {
    const response = await fetch(`/api/tenant/printers/discover?tenantId=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ networkRange }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to discover printers');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * Validate IP address format
   */
  static isValidIPAddress(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Get printer type display information
   */
  static getPrinterTypeInfo(type: PrinterType): { label: string; icon: string; description: string } {
    const typeInfo = {
      kitchen: { 
        label: 'Kitchen Printer', 
        icon: '🍳',
        description: 'For kitchen orders and food preparation'
      },
      receipt: { 
        label: 'Receipt Printer', 
        icon: '🧾',
        description: 'For customer receipts and invoices'
      },
      bar: { 
        label: 'Bar Printer', 
        icon: '🍺',
        description: 'For drink orders and bar operations'
      },
      'dot-matrix': { 
        label: 'Dot Matrix', 
        icon: '📄',
        description: 'For carbon copy orders and backup printing'
      },
      label: { 
        label: 'Label Printer', 
        icon: '🏷️',
        description: 'For order labels and packaging'
      },
      'kitchen-display': { 
        label: 'Kitchen Display', 
        icon: '📺',
        description: 'For digital kitchen display screens'
      },
    };
    
    return typeInfo[type] || typeInfo.receipt;
  }

  /**
   * Get printer status from test result
   */
  static getPrinterStatus(testResult?: PrinterTestResult): {
    status: 'connected' | 'disconnected' | 'unknown';
    color: 'green' | 'red' | 'gray';
    message: string;
  } {
    if (!testResult) {
      return {
        status: 'unknown',
        color: 'gray',
        message: 'Not tested'
      };
    }
    
    return {
      status: testResult.success ? 'connected' : 'disconnected',
      color: testResult.success ? 'green' : 'red',
      message: testResult.message
    };
  }

  /**
   * Format print content for different printer types
   */
  static formatPrintContent(content: string, type: PrinterType): string {
    const headers = {
      kitchen: '=== KITCHEN ORDER ===',
      receipt: '=== RECEIPT ===',
      bar: '=== BAR ORDER ===',
      'dot-matrix': '=== ORDER COPY ===',
      label: '=== LABEL ===',
      'kitchen-display': '=== KITCHEN DISPLAY ==='
    };
    
    const header = headers[type] || headers.receipt;
    const timestamp = new Date().toLocaleString();
    
    return `${header}
${timestamp}
${'-'.repeat(32)}
${content}
${'-'.repeat(32)}
Thank you for your order!
`;
  }

  /**
   * Get common printer ports
   */
  static getCommonPrinterPorts(): number[] {
    return [9100, 515, 631, 9101, 9102, 9103];
  }

  /**
   * Get network range suggestions
   */
  static getNetworkRangeSuggestions(): string[] {
    return [
      '192.168.1',
      '192.168.0',
      '10.0.0',
      '172.16.0',
      '192.168.100'
    ];
  }
}
