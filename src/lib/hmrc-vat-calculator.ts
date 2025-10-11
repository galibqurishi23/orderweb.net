/**
 * HMRC VAT Calculation Service
 * Handles UK VAT calculations for business reporting
 * Standard rate: 20% for most items
 * Zero rate: 0% for certain food items (implementation can be expanded)
 */

export interface VATBreakdown {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
}

export interface VATSummary {
  totalNet: number;
  totalVAT: number;
  totalGross: number;
  standardRateVAT: number;
  zeroRateVAT: number;
}

export class HMRCVATCalculator {
  
  // UK VAT rates
  static readonly STANDARD_VAT_RATE = 0.20; // 20%
  static readonly ZERO_VAT_RATE = 0.00; // 0%
  
  /**
   * Calculate VAT breakdown for a single order
   * For restaurant food orders, we'll use standard rate (20%) for now
   * This can be enhanced later to support zero-rated items
   */
  static calculateOrderVAT(grossAmount: number, vatRate: number = this.STANDARD_VAT_RATE): VATBreakdown {
    // VAT-inclusive calculation (most restaurant orders include VAT in the price)
    const netAmount = grossAmount / (1 + vatRate);
    const vatAmount = grossAmount - netAmount;
    
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      vatRate
    };
  }
  
  /**
   * Calculate VAT breakdown for multiple orders
   */
  static calculateBulkVAT(orders: Array<{ total: number; orderType?: string }>): VATSummary {
    let totalNet = 0;
    let totalVAT = 0;
    let totalGross = 0;
    let standardRateVAT = 0;
    let zeroRateVAT = 0;
    
    orders.forEach(order => {
      // For now, all orders use standard rate
      // Future enhancement: implement zero-rate logic for specific items
      const vatRate = this.STANDARD_VAT_RATE;
      const breakdown = this.calculateOrderVAT(order.total, vatRate);
      
      totalNet += breakdown.netAmount;
      totalVAT += breakdown.vatAmount;
      totalGross += breakdown.grossAmount;
      
      if (vatRate === this.STANDARD_VAT_RATE) {
        standardRateVAT += breakdown.vatAmount;
      } else {
        zeroRateVAT += breakdown.vatAmount;
      }
    });
    
    return {
      totalNet: Math.round(totalNet * 100) / 100,
      totalVAT: Math.round(totalVAT * 100) / 100,
      totalGross: Math.round(totalGross * 100) / 100,
      standardRateVAT: Math.round(standardRateVAT * 100) / 100,
      zeroRateVAT: Math.round(zeroRateVAT * 100) / 100
    };
  }
  
  /**
   * Format amounts for HMRC reporting
   */
  static formatCurrency(amount: number): string {
    return `£${amount.toFixed(2)}`;
  }
  
  /**
   * Get VAT period for a given date (quarterly periods for HMRC)
   */
  static getVATPeriod(date: Date): string {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const year = date.getFullYear();
    
    if (month >= 1 && month <= 3) {
      return `Q1 ${year} (Jan-Mar)`;
    } else if (month >= 4 && month <= 6) {
      return `Q2 ${year} (Apr-Jun)`;
    } else if (month >= 7 && month <= 9) {
      return `Q3 ${year} (Jul-Sep)`;
    } else {
      return `Q4 ${year} (Oct-Dec)`;
    }
  }
  
  /**
   * Get UK financial year for a given date
   */
  static getFinancialYear(date: Date): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  }
  
  /**
   * Generate HMRC-compliant CSV headers
   */
  static getHMRCCSVHeaders(): string[] {
    return [
      'Order Number',
      'Date',
      'Time',
      'Order Source',
      'Order Type',
      'Payment Method',
      'Net Amount (£)',
      'VAT Amount (£)',
      'Gross Amount (£)',
      'VAT Rate (%)',
      'Customer Name',
      'Financial Year',
      'VAT Period'
    ];
  }
  
  /**
   * Convert order to HMRC CSV row
   */
  static orderToHMRCCSVRow(order: any): string[] {
    const vatBreakdown = this.calculateOrderVAT(order.total);
    const orderDate = new Date(order.createdAt);
    
    return [
      order.orderNumber || order.id,
      orderDate.toISOString().split('T')[0], // YYYY-MM-DD format
      orderDate.toTimeString().split(' ')[0], // HH:MM:SS format
      order.orderSource || 'online',
      order.orderType || 'delivery',
      order.paymentMethod || 'card',
      vatBreakdown.netAmount.toFixed(2),
      vatBreakdown.vatAmount.toFixed(2),
      vatBreakdown.grossAmount.toFixed(2),
      (vatBreakdown.vatRate * 100).toFixed(0),
      order.customerName || 'N/A',
      this.getFinancialYear(orderDate),
      this.getVATPeriod(orderDate)
    ];
  }
}
