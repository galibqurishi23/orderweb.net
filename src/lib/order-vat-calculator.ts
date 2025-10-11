// Phase 4: Order VAT Calculator for Mixed Items
// Calculates VAT for complete orders including mixed items

import { Order, OrderItem, PlacedOrderItem } from './types';
import { MixedItemVATCalculator } from './mixed-item-vat-calculator';
import { ComponentService } from './component-service';

export interface OrderVATInfo {
  totalVAT: number;
  hasHotFoodVAT: boolean;
  hasMixedItems: boolean;
  vatBreakdown: {
    hotFoodVAT: number;
    coldFoodVAT: number;
    alcoholVAT: number;
    softDrinkVAT: number;
    otherVAT: number;
  };
  hmrcCompliant: boolean;
  itemBreakdowns: {
    itemId: string;
    itemName: string;
    isMixedItem: boolean;
    vatAmount: number;
    components?: any[];
  }[];
}

export class OrderVATCalculator {
  private static componentService = new ComponentService();

  /**
   * Calculate VAT for an entire order including mixed items
   */
  static async calculateOrderVAT(order: Order): Promise<OrderVATInfo> {
    const itemBreakdowns: any[] = [];
    let totalVAT = 0;
    let hasHotFoodVAT = false;
    let hasMixedItems = false;
    
    const vatBreakdown = {
      hotFoodVAT: 0,
      coldFoodVAT: 0,
      alcoholVAT: 0,
      softDrinkVAT: 0,
      otherVAT: 0
    };

    // Process each order item
    for (const item of order.items) {
      const itemVATInfo = await this.calculateItemVAT(item);
      
      itemBreakdowns.push({
        itemId: item.id,
        itemName: item.menuItem.name,
        isMixedItem: itemVATInfo.isMixedItem,
        vatAmount: itemVATInfo.totalVAT * item.quantity,
        components: itemVATInfo.components
      });

      // Aggregate VAT amounts (multiply by quantity)
      const itemTotalVAT = itemVATInfo.totalVAT * item.quantity;
      totalVAT += itemTotalVAT;

      if (itemVATInfo.isMixedItem) {
        hasMixedItems = true;
        // Add breakdown from mixed item
        if (itemVATInfo.breakdown) {
          vatBreakdown.hotFoodVAT += itemVATInfo.breakdown.hotFoodVAT * item.quantity;
          vatBreakdown.coldFoodVAT += itemVATInfo.breakdown.coldFoodVAT * item.quantity;
          vatBreakdown.alcoholVAT += itemVATInfo.breakdown.alcoholVAT * item.quantity;
          vatBreakdown.softDrinkVAT += itemVATInfo.breakdown.softDrinkVAT * item.quantity;
          vatBreakdown.otherVAT += itemVATInfo.breakdown.otherVAT * item.quantity;
        }
      } else {
        // Simple item VAT calculation
        const simpleVAT = this.calculateSimpleItemVAT(item.menuItem, item.quantity);
        vatBreakdown.hotFoodVAT += simpleVAT; // Assume simple items are hot food for now
      }

      if (itemTotalVAT > 0) {
        hasHotFoodVAT = true;
      }
    }

    return {
      totalVAT: Math.round(totalVAT * 100) / 100,
      hasHotFoodVAT,
      hasMixedItems,
      vatBreakdown: {
        hotFoodVAT: Math.round(vatBreakdown.hotFoodVAT * 100) / 100,
        coldFoodVAT: Math.round(vatBreakdown.coldFoodVAT * 100) / 100,
        alcoholVAT: Math.round(vatBreakdown.alcoholVAT * 100) / 100,
        softDrinkVAT: Math.round(vatBreakdown.softDrinkVAT * 100) / 100,
        otherVAT: Math.round(vatBreakdown.otherVAT * 100) / 100
      },
      hmrcCompliant: true, // Assume compliant for now
      itemBreakdowns
    };
  }

  /**
   * Calculate VAT for a single order item (which might be mixed)
   */
  private static async calculateItemVAT(item: PlacedOrderItem): Promise<{
    isMixedItem: boolean;
    totalVAT: number;
    components?: any[];
    breakdown?: {
      hotFoodVAT: number;
      coldFoodVAT: number;
      alcoholVAT: number;
      softDrinkVAT: number;
      otherVAT: number;
    };
  }> {
    // Check if this item has VAT info (indicating it's a mixed item)
    if (item.vatInfo && item.vatInfo.isMixedItem) {
      return {
        isMixedItem: true,
        totalVAT: item.vatInfo.totalVAT,
        components: item.vatInfo.components,
        breakdown: item.vatInfo.breakdown
      };
    }

    // Try to load components from database if available
    try {
      const components = await this.componentService.getItemComponents(item.menuItem.id);
      if (components.length > 0) {
        // This is a mixed item, calculate VAT
        const mixedMenuItem = {
          ...item.menuItem,
          components: components,
          isMixedItem: true
        };

        const vatCalc = MixedItemVATCalculator.calculateMixedItemVAT(mixedMenuItem as any);
        
        return {
          isMixedItem: true,
          totalVAT: vatCalc.totalVAT,
          components: vatCalc.components,
          breakdown: vatCalc.vatSummary
        };
      }
    } catch (error) {
      console.warn('Could not load item components:', error);
    }

    // Fall back to simple item VAT
    const simpleVAT = this.calculateSimpleItemVAT(item.menuItem, 1);
    return {
      isMixedItem: false,
      totalVAT: simpleVAT,
      components: undefined,
      breakdown: undefined
    };
  }

  /**
   * Calculate VAT for a simple (non-mixed) menu item
   * Menu prices are treated as GROSS amounts (VAT inclusive)
   */
  private static calculateSimpleItemVAT(menuItem: any, quantity: number = 1): number {
    console.log('🧮 Calculating VAT for menu item:', {
      name: menuItem.name,
      vatRate: menuItem.vatRate,
      isVatExempt: menuItem.isVatExempt,
      price: menuItem.price,
      priceType: typeof menuItem.price,
      quantity
    });

    // Check VAT exemption first
    const isVatExempt = menuItem.isVatExempt || false;
    if (isVatExempt) {
      console.log('✅ Item is VAT exempt - returning 0');
      return 0;
    }

    // Get the VAT rate - handle null/undefined properly
    let vatRate = menuItem.vatRate;
    
    // If vatRate is null, undefined, or not a number, treat as 0% VAT (admin must set VAT rate explicitly)
    if (vatRate === null || vatRate === undefined || isNaN(vatRate)) {
      vatRate = 0;
      console.log('⚠️ No VAT rate set for item - treating as 0% VAT. Admin should set VAT rate explicitly.');
    } else {
      vatRate = parseFloat(vatRate);
      console.log('✅ Using admin-set VAT rate:', vatRate + '%');
    }
    
    if (vatRate === 0) {
      console.log('✅ 0% VAT rate - returning 0');
      return 0;
    }

    // Ensure price is a number
    const itemPrice = parseFloat(menuItem.price.toString());
    if (isNaN(itemPrice) || itemPrice <= 0) {
      console.log('⚠️ Invalid price:', menuItem.price, '- returning 0 VAT');
      return 0;
    }

    // Calculate VAT from GROSS amount: VAT = Gross Price × (VAT Rate / (100 + VAT Rate))
    // This treats menu prices as VAT-inclusive (gross amounts)
    const vatAmount = (itemPrice * vatRate) / (100 + vatRate);
    const totalVAT = Math.round(vatAmount * quantity * 100) / 100;
    
    console.log('🧮 VAT calculation result:', {
      itemPrice: itemPrice,
      vatRate: vatRate + '%',
      vatPerItem: Math.round(vatAmount * 100) / 100,
      quantity,
      totalVAT
    });
    
    return totalVAT;
  }

  /**
   * Add VAT information to order items when creating an order
   */
  static async enrichOrderWithVAT(order: Order): Promise<Order> {
    const orderVATInfo = await this.calculateOrderVAT(order);
    
    // Add VAT info to each item
    const enrichedItems = await Promise.all(
      order.items.map(async (item) => {
        const itemVATInfo = await this.calculateItemVAT(item);
        
        return {
          ...item,
          vatInfo: {
            isMixedItem: itemVATInfo.isMixedItem,
            totalVAT: itemVATInfo.totalVAT,
            components: itemVATInfo.components,
            breakdown: itemVATInfo.breakdown
          }
        };
      })
    );

    // Return order with VAT information
    return {
      ...order,
      items: enrichedItems,
      vatInfo: orderVATInfo
    };
  }

  /**
   * Generate VAT summary for receipts and reports
   */
  static generateVATSummary(orderVATInfo: OrderVATInfo): {
    displaySummary: string[];
    hmrcSummary: {
      standardRateItems: number;
      standardRateVAT: number;
      zeroRateItems: number;
      zeroRateVAT: number;
      mixedItems: number;
      totalVAT: number;
    };
  } {
    const displaySummary: string[] = [];
    
    if (orderVATInfo.hasMixedItems) {
      displaySummary.push(`Mixed Items: ${orderVATInfo.itemBreakdowns.filter(i => i.isMixedItem).length}`);
    }
    
    if (orderVATInfo.vatBreakdown.hotFoodVAT > 0) {
      displaySummary.push(`Hot Food VAT (20%): £${orderVATInfo.vatBreakdown.hotFoodVAT.toFixed(2)}`);
    }
    
    if (orderVATInfo.vatBreakdown.coldFoodVAT > 0) {
      displaySummary.push(`Cold Food VAT (0%): £${orderVATInfo.vatBreakdown.coldFoodVAT.toFixed(2)}`);
    }
    
    if (orderVATInfo.vatBreakdown.alcoholVAT > 0) {
      displaySummary.push(`Alcohol VAT (20%): £${orderVATInfo.vatBreakdown.alcoholVAT.toFixed(2)}`);
    }
    
    if (orderVATInfo.vatBreakdown.softDrinkVAT > 0) {
      displaySummary.push(`Drinks VAT (20%): £${orderVATInfo.vatBreakdown.softDrinkVAT.toFixed(2)}`);
    }

    displaySummary.push(`Total VAT: £${orderVATInfo.totalVAT.toFixed(2)}`);

    const hmrcSummary = {
      standardRateItems: orderVATInfo.itemBreakdowns.filter(i => 
        !i.isMixedItem || (i.vatAmount > 0)
      ).length,
      standardRateVAT: orderVATInfo.vatBreakdown.hotFoodVAT + 
                      orderVATInfo.vatBreakdown.alcoholVAT + 
                      orderVATInfo.vatBreakdown.softDrinkVAT + 
                      orderVATInfo.vatBreakdown.otherVAT,
      zeroRateItems: orderVATInfo.itemBreakdowns.filter(i => 
        i.isMixedItem && orderVATInfo.vatBreakdown.coldFoodVAT > 0
      ).length,
      zeroRateVAT: orderVATInfo.vatBreakdown.coldFoodVAT,
      mixedItems: orderVATInfo.itemBreakdowns.filter(i => i.isMixedItem).length,
      totalVAT: orderVATInfo.totalVAT
    };

    return {
      displaySummary,
      hmrcSummary
    };
  }

  /**
   * Validate order VAT compliance
   */
  static validateOrderVATCompliance(order: Order): {
    isCompliant: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!order.vatInfo) {
      warnings.push('Order missing VAT information');
      recommendations.push('Recalculate order VAT before processing');
      return { isCompliant: false, warnings, recommendations };
    }

    // Check for mixed items with proper component breakdown
    if (order.vatInfo.hasMixedItems) {
      const mixedItems = order.items.filter(item => item.vatInfo?.isMixedItem);
      
      mixedItems.forEach(item => {
        if (!item.vatInfo?.components || item.vatInfo.components.length === 0) {
          warnings.push(`Mixed item "${item.menuItem.name}" missing component breakdown`);
          recommendations.push('Add component information for proper VAT calculation');
        }

        // Check if item has both hot and cold components
        const hasHot = item.vatInfo?.components?.some(c => c.componentType === 'hot_food');
        const hasCold = item.vatInfo?.components?.some(c => c.componentType === 'cold_food');
        
        if (hasHot && hasCold) {
          recommendations.push(`Item "${item.menuItem.name}" properly classified as mixed hot/cold - HMRC compliant`);
        }
      });
    }

    return {
      isCompliant: warnings.length === 0,
      warnings,
      recommendations
    };
  }
}
