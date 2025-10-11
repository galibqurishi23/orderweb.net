import type { Order } from '@/lib/types';
import type { MenuItem } from '@/lib/menu-types';

export interface ItemVATBreakdown {
  itemName: string;
  itemPrice: number;
  vatRate: number;
  vatType: 'simple' | 'mixed';
  isVatExempt: boolean;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface OrderVATBreakdown {
  orderTotal: number;
  totalNetAmount: number;
  totalVatAmount: number;
  totalGrossAmount: number;
  itemBreakdowns: ItemVATBreakdown[];
  vatRateSummary: {
    rate: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }[];
}

export class ItemLevelVATCalculator {
  
  /**
   * Calculate VAT for a single order using item-level VAT rates
   */
  static calculateOrderVAT(order: Order, menuItems: MenuItem[]): OrderVATBreakdown {
    const itemBreakdowns: ItemVATBreakdown[] = [];
    let totalNetAmount = 0;
    let totalVatAmount = 0;
    let totalGrossAmount = 0;

    // Process each item in the order
    for (const orderItem of order.items || []) {
      const menuItem = orderItem.menuItem;
      
      if (!menuItem) {
        // Fallback to 20% VAT if menu item not found
        const breakdown = this.calculateItemVAT(
          `Unknown Item ${orderItem.id}`,
          orderItem.finalPrice,
          20.00,
          'simple',
          false
        );
        itemBreakdowns.push(breakdown);
        totalNetAmount += breakdown.netAmount;
        totalVatAmount += breakdown.vatAmount;
        totalGrossAmount += breakdown.grossAmount;
        continue;
      }

      // Calculate VAT for this item based on its configuration
      // Note: For now, we'll look up the menu item from the provided list to get VAT rates
      const menuItemWithVAT = menuItems.find(item => item.id === menuItem.id);
      
      const breakdown = this.calculateItemVAT(
        menuItem.name,
        orderItem.finalPrice,
        menuItemWithVAT?.vatRate || 20.00,
        menuItemWithVAT?.vatType || 'simple',
        menuItemWithVAT?.isVatExempt || false
      );

      itemBreakdowns.push(breakdown);
      totalNetAmount += breakdown.netAmount;
      totalVatAmount += breakdown.vatAmount;
      totalGrossAmount += breakdown.grossAmount;
    }

    // Calculate VAT rate summary
    const vatRateSummary = this.generateVATRateSummary(itemBreakdowns);

    return {
      orderTotal: parseFloat(order.total?.toString() || '0'),
      totalNetAmount,
      totalVatAmount,
      totalGrossAmount,
      itemBreakdowns,
      vatRateSummary
    };
  }

  /**
   * Calculate VAT for a single item
   */
  private static calculateItemVAT(
    itemName: string,
    itemPrice: number,
    vatRate: number,
    vatType: 'simple' | 'mixed',
    isVatExempt: boolean
  ): ItemVATBreakdown {
    
    if (isVatExempt || vatRate === 0) {
      // VAT exempt or zero-rated items
      return {
        itemName,
        itemPrice,
        vatRate: 0,
        vatType,
        isVatExempt: true,
        netAmount: itemPrice,
        vatAmount: 0,
        grossAmount: itemPrice
      };
    }

    // For items with VAT (currently only simple items supported)
    if (vatType === 'simple') {
      // The price includes VAT, so we need to extract it
      const vatMultiplier = 1 + (vatRate / 100);
      const netAmount = itemPrice / vatMultiplier;
      const vatAmount = itemPrice - netAmount;

      return {
        itemName,
        itemPrice,
        vatRate,
        vatType,
        isVatExempt: false,
        netAmount: parseFloat(netAmount.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        grossAmount: itemPrice
      };
    }

    // Mixed items (future implementation)
    if (vatType === 'mixed') {
      // For now, treat as 20% VAT until component system is implemented
      const vatMultiplier = 1 + (20 / 100);
      const netAmount = itemPrice / vatMultiplier;
      const vatAmount = itemPrice - netAmount;

      return {
        itemName,
        itemPrice,
        vatRate: 20,
        vatType,
        isVatExempt: false,
        netAmount: parseFloat(netAmount.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        grossAmount: itemPrice
      };
    }

    // Default fallback
    return {
      itemName,
      itemPrice,
      vatRate: 20,
      vatType: 'simple',
      isVatExempt: false,
      netAmount: parseFloat((itemPrice / 1.2).toFixed(2)),
      vatAmount: parseFloat((itemPrice - (itemPrice / 1.2)).toFixed(2)),
      grossAmount: itemPrice
    };
  }

  /**
   * Generate summary by VAT rate
   */
  private static generateVATRateSummary(itemBreakdowns: ItemVATBreakdown[]) {
    const summaryMap = new Map<number, { netAmount: number; vatAmount: number; grossAmount: number }>();

    for (const item of itemBreakdowns) {
      const rate = item.vatRate;
      const existing = summaryMap.get(rate) || { netAmount: 0, vatAmount: 0, grossAmount: 0 };
      
      summaryMap.set(rate, {
        netAmount: existing.netAmount + item.netAmount,
        vatAmount: existing.vatAmount + item.vatAmount,
        grossAmount: existing.grossAmount + item.grossAmount
      });
    }

    return Array.from(summaryMap.entries()).map(([rate, amounts]) => ({
      rate,
      netAmount: parseFloat(amounts.netAmount.toFixed(2)),
      vatAmount: parseFloat(amounts.vatAmount.toFixed(2)),
      grossAmount: parseFloat(amounts.grossAmount.toFixed(2))
    }));
  }

  /**
   * Calculate total VAT for multiple orders
   */
  static calculateOrdersVAT(orders: Order[], menuItems: MenuItem[]) {
    let totalNetAmount = 0;
    let totalVatAmount = 0;
    let totalGrossAmount = 0;
    const orderBreakdowns: OrderVATBreakdown[] = [];
    const allItemBreakdowns: ItemVATBreakdown[] = [];

    for (const order of orders) {
      const breakdown = this.calculateOrderVAT(order, menuItems);
      orderBreakdowns.push(breakdown);
      allItemBreakdowns.push(...breakdown.itemBreakdowns);
      
      totalNetAmount += breakdown.totalNetAmount;
      totalVatAmount += breakdown.totalVatAmount;
      totalGrossAmount += breakdown.totalGrossAmount;
    }

    const vatRateSummary = this.generateVATRateSummary(allItemBreakdowns);

    return {
      totalNetAmount: parseFloat(totalNetAmount.toFixed(2)),
      totalVatAmount: parseFloat(totalVatAmount.toFixed(2)),
      totalGrossAmount: parseFloat(totalGrossAmount.toFixed(2)),
      orderBreakdowns,
      vatRateSummary
    };
  }
}
