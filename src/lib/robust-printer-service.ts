import pool from './db';
import type { Printer, PrinterType } from './types';
import { v4 as uuidv4 } from 'uuid';
import net from 'net';

export interface PrinterTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  details?: string;
}

export interface PrintJob {
  id: string;
  tenantId: string;
  printerId: string;
  content: string;
  type: 'receipt' | 'kitchen' | 'bar' | 'label';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Enhanced printer service with comprehensive IP printer management
 */
export class PrinterService {
  
  /**
   * Get all printers for a tenant
   */
  static async getTenantPrinters(tenantId: string): Promise<Printer[]> {
    try {
      console.log('🖨️ Getting printers for tenant:', tenantId);
      
      const [rows] = await pool.execute(
        'SELECT * FROM printers WHERE tenant_id = ? ORDER BY created_at DESC',
        [tenantId]
      );
      
      const printers = rows as Printer[];
      console.log('📋 Found printers:', printers.length);
      
      return printers;
    } catch (error) {
      console.error('❌ Error fetching printers:', error);
      throw new Error('Failed to fetch printers');
    }
  }

  /**
   * Save or update a printer
   */
  static async savePrinter(tenantId: string, printer: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>, printerId?: string): Promise<string> {
    try {
      console.log('💾 Saving printer:', printer.name);
      
      const id = printerId || uuidv4();
      const now = new Date();
      
      // Validate IP address format
      if (!this.isValidIPAddress(printer.ipAddress)) {
        throw new Error('Invalid IP address format');
      }
      
      // Check if printer with same IP exists
      const [existing] = await pool.execute(
        'SELECT id FROM printers WHERE tenant_id = ? AND ipAddress = ? AND port = ? AND id != ?',
        [tenantId, printer.ipAddress, printer.port, id]
      );
      
      if ((existing as any[]).length > 0) {
        throw new Error('A printer with this IP address and port already exists');
      }
      
      // Insert or update printer
      await pool.execute(
        `INSERT INTO printers (id, tenant_id, name, ipAddress, port, type, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         ipAddress = VALUES(ipAddress),
         port = VALUES(port),
         type = VALUES(type),
         active = VALUES(active),
         updated_at = VALUES(updated_at)`,
        [id, tenantId, printer.name, printer.ipAddress, printer.port, printer.type, printer.active, now, now]
      );
      
      console.log('✅ Printer saved successfully');
      return id;
    } catch (error) {
      console.error('❌ Error saving printer:', error);
      throw error;
    }
  }

  /**
   * Delete a printer
   */
  static async deletePrinter(tenantId: string, printerId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting printer:', printerId);
      
      const [result] = await pool.execute(
        'DELETE FROM printers WHERE id = ? AND tenant_id = ?',
        [printerId, tenantId]
      );
      
      if ((result as any).affectedRows === 0) {
        throw new Error('Printer not found or not authorized');
      }
      
      console.log('✅ Printer deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting printer:', error);
      throw error;
    }
  }

  /**
   * Test printer connectivity
   */
  static async testPrinterConnection(printer: Printer): Promise<PrinterTestResult> {
    return new Promise((resolve) => {
      console.log('🔍 Testing printer connection:', printer.name, `${printer.ipAddress}:${printer.port}`);
      
      const startTime = Date.now();
      const socket = new net.Socket();
      
      // Set connection timeout
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: 'Connection timeout',
          details: `Could not connect to ${printer.ipAddress}:${printer.port} within 5 seconds`
        });
      }, 5000);
      
      socket.connect(printer.port, printer.ipAddress, () => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        
        console.log('✅ Printer connection successful');
        
        // Send test command based on printer type
        const testCommand = this.getTestCommand(printer.type);
        socket.write(testCommand);
        
        // Close connection after brief delay
        setTimeout(() => {
          socket.destroy();
          resolve({
            success: true,
            message: 'Connection successful',
            responseTime,
            details: `Connected to ${printer.ipAddress}:${printer.port} in ${responseTime}ms`
          });
        }, 100);
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.log('❌ Printer connection failed:', error.message);
        
        resolve({
          success: false,
          message: 'Connection failed',
          details: error.message
        });
      });
      
      socket.on('timeout', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          success: false,
          message: 'Connection timeout',
          details: 'Socket timeout occurred'
        });
      });
    });
  }

  /**
   * Send print job to printer
   */
  static async sendPrintJob(printer: Printer, content: string, type: PrintJob['type']): Promise<PrinterTestResult> {
    return new Promise((resolve) => {
      console.log('📨 Sending print job to:', printer.name);
      
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: 'Print job timeout',
          details: 'Print job timed out'
        });
      }, 10000);
      
      socket.connect(printer.port, printer.ipAddress, () => {
        clearTimeout(timeout);
        
        // Format content for ESC/POS printer
        const formattedContent = this.formatPrintContent(content, printer.type);
        socket.write(formattedContent);
        
        setTimeout(() => {
          socket.destroy();
          resolve({
            success: true,
            message: 'Print job sent successfully',
            details: 'Document sent to printer'
          });
        }, 1000);
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          message: 'Print job failed',
          details: error.message
        });
      });
    });
  }

  /**
   * Get printer statistics
   */
  static async getPrinterStats(tenantId: string): Promise<{
    totalPrinters: number;
    activePrinters: number;
    printerTypes: { [key: string]: number };
    recentJobs: number;
  }> {
    try {
      // Get total and active printers
      const [printerStats] = await pool.execute(
        'SELECT COUNT(*) as total, SUM(active) as active FROM printers WHERE tenant_id = ?',
        [tenantId]
      );
      
      // Get printer types distribution
      const [typeStats] = await pool.execute(
        'SELECT type, COUNT(*) as count FROM printers WHERE tenant_id = ? GROUP BY type',
        [tenantId]
      );
      
      const stats = (printerStats as any[])[0];
      const types = (typeStats as any[]).reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {});
      
      return {
        totalPrinters: stats.total || 0,
        activePrinters: stats.active || 0,
        printerTypes: types,
        recentJobs: 0 // TODO: Implement print job tracking
      };
    } catch (error) {
      console.error('❌ Error fetching printer stats:', error);
      return {
        totalPrinters: 0,
        activePrinters: 0,
        printerTypes: {},
        recentJobs: 0
      };
    }
  }

  /**
   * Validate IP address format
   */
  private static isValidIPAddress(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Get test command for different printer types
   */
  private static getTestCommand(type: PrinterType): string {
    const commands = {
      kitchen: '\x1B\x40\x1B\x21\x08TEST - KITCHEN PRINTER\x0A\x0A\x1D\x56\x00', // ESC/POS test for kitchen
      receipt: '\x1B\x40TEST - RECEIPT PRINTER\x0A\x0A\x1D\x56\x00', // ESC/POS test for receipt
      bar: '\x1B\x40\x1B\x21\x08TEST - BAR PRINTER\x0A\x0A\x1D\x56\x00', // ESC/POS test for bar
      'dot-matrix': 'TEST - DOT MATRIX PRINTER\x0A\x0A\x0C', // Basic text for dot matrix
      label: '\x1B\x40TEST LABEL\x0A\x1D\x56\x00', // ESC/POS test for label
      'kitchen-display': '\x1B\x40TEST - KITCHEN DISPLAY\x0A\x0A\x1D\x56\x00' // ESC/POS test for kitchen display
    };
    
    return commands[type] || commands.receipt;
  }

  /**
   * Format content for ESC/POS printing
   */
  private static formatPrintContent(content: string, type: PrinterType): string {
    // ESC/POS commands
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';
    const CR = '\x0D';
    
    // Initialize printer
    let formatted = `${ESC}@`; // Initialize printer
    
    // Set font based on printer type
    if (type === 'kitchen' || type === 'bar') {
      formatted += `${ESC}!${String.fromCharCode(0x08)}`; // Emphasized text
    }
    
    // Add content
    formatted += content;
    
    // Add line feeds
    formatted += `${LF}${LF}`;
    
    // Cut paper (if supported)
    if (type === 'receipt' || type === 'kitchen') {
      formatted += `${GS}V${String.fromCharCode(0x00)}`; // Full cut
    }
    
    return formatted;
  }

  /**
   * Discover printers on network (basic implementation)
   */
  static async discoverPrinters(networkRange: string = '192.168.1'): Promise<{ ip: string; port: number; responsive: boolean }[]> {
    const discoveredPrinters: { ip: string; port: number; responsive: boolean }[] = [];
    const commonPorts = [9100, 515, 631, 9101, 9102]; // Common printer ports
    
    console.log('🔍 Discovering printers on network:', networkRange);
    
    // Check common IP range (simplified for demonstration)
    const promises = [];
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${networkRange}.${i}`;
      
      for (const port of commonPorts) {
        promises.push(
          this.quickPortScan(ip, port).then(responsive => {
            if (responsive) {
              discoveredPrinters.push({ ip, port, responsive });
            }
          })
        );
      }
    }
    
    // Wait for all scans to complete (with timeout)
    await Promise.allSettled(promises);
    
    console.log('🎯 Discovered printers:', discoveredPrinters.length);
    return discoveredPrinters;
  }

  /**
   * Quick port scan to check if printer is responsive
   */
  private static quickPortScan(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000); // Quick 1-second timeout
      
      socket.connect(port, ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }
}

// Legacy functions for backward compatibility
export async function getPrinters(): Promise<Printer[]> {
  return [];
}

export async function savePrinter(printer: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return '';
}

export async function deletePrinter(printerId: string): Promise<void> {
  return;
}

export async function testPrinter(printer: Printer): Promise<PrinterTestResult> {
  return {
    success: false,
    message: 'Not implemented'
  };
}

export async function printDocument(printer: Printer, content: string): Promise<PrinterTestResult> {
  return {
    success: false,
    message: 'Not implemented'
  };
}
