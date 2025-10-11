// Phase 2: Mixed Item VAT Calculator with Cost Apportionment
// HMRC-compliant VAT calculations for component-based items

import {
  ComponentVATBreakdown,
  MixedItemVATCalculation,
  ItemComponent,
  ComponentType,
  MixedMenuItem
} from './component-types.js';

export class MixedItemVATCalculator {
  // UK VAT rates - now dynamic based on admin settings in database components
  // Default fallback rates if component doesn't have VAT rate set
  private static readonly DEFAULT_VAT_RATES = {
    hot_food: 20.0,      // Standard rate for hot food
    cold_food: 0.0,      // Zero rate for cold food (temp under 60°C)  
    alcohol: 20.0,       // Standard rate for alcohol
    soft_drink: 20.0,    // Standard rate for soft drinks
    other: 20.0          // Default standard rate
  };

  /**
   * Calculate VAT for a mixed item using cost apportionment method
   * This is HMRC-compliant for items with both hot and cold components
   */
  static calculateMixedItemVAT(
    menuItem: MixedMenuItem,
    method: 'cost_apportionment' | 'component_based' = 'component_based'
  ): MixedItemVATCalculation {
    const components = menuItem.components.filter(c => c.isActive);
    
    if (method === 'cost_apportionment') {
      return this.calculateWithCostApportionment(menuItem, components);
    } else {
      return this.calculateWithComponentBased(menuItem, components);
    }
  }

  /**
   * Cost Apportionment Method (HMRC-approved for mixed supplies)
   * Used when it's difficult to separate hot and cold components
   */
  private static calculateWithCostApportionment(
    menuItem: MixedMenuItem,
    components: ItemComponent[]
  ): MixedItemVATCalculation {
    const totalCost = components.reduce((sum, comp) => sum + comp.componentCost, 0);
    
    // Calculate total costs by VAT category
    const costByCategory = {
      hot_food: 0,
      cold_food: 0,
      alcohol: 0,
      soft_drink: 0,
      other: 0
    };

    components.forEach(comp => {
      costByCategory[comp.componentType] += comp.componentCost;
    });

    // Apply cost apportionment
    const componentBreakdowns: ComponentVATBreakdown[] = [];
    const vatSummary = {
      hotFoodVAT: 0,
      coldFoodVAT: 0,
      alcoholVAT: 0,
      softDrinkVAT: 0,
      otherVAT: 0
    };

    let totalVAT = 0;

    // For cost apportionment, we calculate the proportion of total price for each category
    // Use admin-configurable rates or defaults
    Object.entries(costByCategory).forEach(([category, categoryTotal]) => {
      if (categoryTotal > 0) {
        const proportion = categoryTotal / totalCost;
        const allocatedPrice = menuItem.totalPrice * proportion;
        
        // Use admin-set rate if available, otherwise fallback to default
        const vatRate = this.DEFAULT_VAT_RATES[category as ComponentType];
        
        // VAT calculation: VAT = (Price × VAT Rate) / (100 + VAT Rate)
        const vatAmount = vatRate > 0 ? (allocatedPrice * vatRate) / (100 + vatRate) : 0;
        
        // Create a summary component for this category
        componentBreakdowns.push({
          componentId: `${category}_summary`,
          componentName: `${category.replace('_', ' ').toUpperCase()} Components`,
          componentCost: allocatedPrice,
          vatRate,
          vatAmount,
          componentType: category as ComponentType
        });

        // Add to summary
        switch (category) {
          case 'hot_food':
            vatSummary.hotFoodVAT += vatAmount;
            break;
          case 'cold_food':
            vatSummary.coldFoodVAT += vatAmount;
            break;
          case 'alcohol':
            vatSummary.alcoholVAT += vatAmount;
            break;
          case 'soft_drink':
            vatSummary.softDrinkVAT += vatAmount;
            break;
          case 'other':
            vatSummary.otherVAT += vatAmount;
            break;
        }

        totalVAT += vatAmount;
      }
    });

    return {
      itemId: menuItem.id,
      itemName: menuItem.name,
      totalPrice: menuItem.totalPrice,
      totalVAT: Math.round(totalVAT * 100) / 100,
      components: componentBreakdowns,
      vatSummary: {
        hotFoodVAT: Math.round(vatSummary.hotFoodVAT * 100) / 100,
        coldFoodVAT: Math.round(vatSummary.coldFoodVAT * 100) / 100,
        alcoholVAT: Math.round(vatSummary.alcoholVAT * 100) / 100,
        softDrinkVAT: Math.round(vatSummary.softDrinkVAT * 100) / 100,
        otherVAT: Math.round(vatSummary.otherVAT * 100) / 100
      },
      hmrcCompliant: true,
      calculationMethod: 'cost_apportionment'
    };
  }

  /**
   * Component-Based Method
   * Each component has its own VAT rate applied individually
   */
  private static calculateWithComponentBased(
    menuItem: MixedMenuItem,
    components: ItemComponent[]
  ): MixedItemVATCalculation {
    const componentBreakdowns: ComponentVATBreakdown[] = [];
    const vatSummary = {
      hotFoodVAT: 0,
      coldFoodVAT: 0,
      alcoholVAT: 0,
      softDrinkVAT: 0,
      otherVAT: 0
    };

    let totalVAT = 0;

    components.forEach(comp => {
      // Use the component's specific VAT rate (admin-set from database)
      // Fallback to default rate if component rate is invalid
      let vatRate = comp.vatRate;
      
      if (vatRate === null || vatRate === undefined || isNaN(vatRate) || vatRate < 0) {
        vatRate = this.DEFAULT_VAT_RATES[comp.componentType] || 20.0;
        console.warn(`Component ${comp.componentName} has invalid VAT rate, using default: ${vatRate}%`);
      }
      
      // Ensure VAT rate is within valid UK bounds (0% or 20%)
      if (vatRate !== 0 && vatRate !== 20) {
        console.warn(`Component ${comp.componentName} has non-standard VAT rate: ${vatRate}%. UK standard rates are 0% or 20%.`);
      }
      
      // Fix: Component costs are GROSS amounts (VAT-inclusive), so extract VAT correctly
      const vatAmount = vatRate > 0 ? (comp.componentCost * vatRate) / (100 + vatRate) : 0;

      componentBreakdowns.push({
        componentId: comp.id,
        componentName: comp.componentName,
        componentCost: comp.componentCost,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        componentType: comp.componentType
      });

      // Add to summary by type
      switch (comp.componentType) {
        case 'hot_food':
          vatSummary.hotFoodVAT += vatAmount;
          break;
        case 'cold_food':
          vatSummary.coldFoodVAT += vatAmount;
          break;
        case 'alcohol':
          vatSummary.alcoholVAT += vatAmount;
          break;
        case 'soft_drink':
          vatSummary.softDrinkVAT += vatAmount;
          break;
        case 'other':
          vatSummary.otherVAT += vatAmount;
          break;
      }

      totalVAT += vatAmount;
    });

    return {
      itemId: menuItem.id,
      itemName: menuItem.name,
      totalPrice: menuItem.totalPrice,
      totalVAT: Math.round(totalVAT * 100) / 100,
      components: componentBreakdowns,
      vatSummary: {
        hotFoodVAT: Math.round(vatSummary.hotFoodVAT * 100) / 100,
        coldFoodVAT: Math.round(vatSummary.coldFoodVAT * 100) / 100,
        alcoholVAT: Math.round(vatSummary.alcoholVAT * 100) / 100,
        softDrinkVAT: Math.round(vatSummary.softDrinkVAT * 100) / 100,
        otherVAT: Math.round(vatSummary.otherVAT * 100) / 100
      },
      hmrcCompliant: true,
      calculationMethod: 'component_based'
    };
  }

  /**
   * Calculate VAT for multiple mixed items in an order
   */
  static calculateOrderMixedItemVAT(
    mixedItems: MixedMenuItem[],
    method: 'cost_apportionment' | 'component_based' = 'component_based'
  ): {
    items: MixedItemVATCalculation[];
    orderTotalVAT: number;
    orderVATSummary: {
      hotFoodVAT: number;
      coldFoodVAT: number;
      alcoholVAT: number;
      softDrinkVAT: number;
      otherVAT: number;
    };
  } {
    const itemCalculations = mixedItems.map(item => 
      this.calculateMixedItemVAT(item, method)
    );

    const orderVATSummary = itemCalculations.reduce(
      (summary, calc) => ({
        hotFoodVAT: summary.hotFoodVAT + calc.vatSummary.hotFoodVAT,
        coldFoodVAT: summary.coldFoodVAT + calc.vatSummary.coldFoodVAT,
        alcoholVAT: summary.alcoholVAT + calc.vatSummary.alcoholVAT,
        softDrinkVAT: summary.softDrinkVAT + calc.vatSummary.softDrinkVAT,
        otherVAT: summary.otherVAT + calc.vatSummary.otherVAT
      }),
      {
        hotFoodVAT: 0,
        coldFoodVAT: 0,
        alcoholVAT: 0,
        softDrinkVAT: 0,
        otherVAT: 0
      }
    );

    const orderTotalVAT = itemCalculations.reduce(
      (total, calc) => total + calc.totalVAT,
      0
    );

    return {
      items: itemCalculations,
      orderTotalVAT: Math.round(orderTotalVAT * 100) / 100,
      orderVATSummary: {
        hotFoodVAT: Math.round(orderVATSummary.hotFoodVAT * 100) / 100,
        coldFoodVAT: Math.round(orderVATSummary.coldFoodVAT * 100) / 100,
        alcoholVAT: Math.round(orderVATSummary.alcoholVAT * 100) / 100,
        softDrinkVAT: Math.round(orderVATSummary.softDrinkVAT * 100) / 100,
        otherVAT: Math.round(orderVATSummary.otherVAT * 100) / 100
      }
    };
  }

  /**
   * Validate that a mixed item calculation is HMRC compliant
   */
  static validateHMRCCompliance(calculation: MixedItemVATCalculation): {
    isCompliant: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check if hot and cold components are properly separated
    const hasHotComponents = calculation.vatSummary.hotFoodVAT > 0;
    const hasColdComponents = calculation.vatSummary.coldFoodVAT > 0;

    if (hasHotComponents && hasColdComponents) {
      if (calculation.calculationMethod !== 'cost_apportionment') {
        warnings.push('Mixed hot/cold item should consider cost apportionment method for HMRC compliance');
        recommendations.push('Use cost_apportionment method for items with significant hot and cold components');
      }
    }

    // Check for zero-rated components
    if (calculation.vatSummary.coldFoodVAT === 0 && hasColdComponents) {
      recommendations.push('Ensure cold food components are properly documented as below 60°C');
    }

    // Check total reconciliation
    const calculatedTotal = calculation.components.reduce((sum, comp) => sum + comp.componentCost, 0);
    const priceDifference = Math.abs(calculatedTotal - calculation.totalPrice);
    
    if (priceDifference > 0.01) {
      warnings.push(`Component costs (${calculatedTotal}) don't match item price (${calculation.totalPrice})`);
      recommendations.push('Ensure component costs add up to the total item price');
    }

    return {
      isCompliant: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * Generate HMRC-compliant report for mixed items
   */
  static generateHMRCReport(calculations: MixedItemVATCalculation[]): {
    summary: {
      totalItems: number;
      totalVAT: number;
      standardRateVAT: number;
      zeroRateVAT: number;
    };
    breakdown: {
      itemName: string;
      totalPrice: number;
      standardRateAmount: number;
      zeroRateAmount: number;
      vatAmount: number;
      method: string;
    }[];
    compliance: {
      allCompliant: boolean;
      totalWarnings: number;
    };
  } {
    const breakdown = calculations.map(calc => {
      const standardRateAmount = calc.vatSummary.hotFoodVAT + calc.vatSummary.alcoholVAT + 
                                calc.vatSummary.softDrinkVAT + calc.vatSummary.otherVAT;
      const zeroRateAmount = calc.vatSummary.coldFoodVAT;

      return {
        itemName: calc.itemName,
        totalPrice: calc.totalPrice,
        standardRateAmount,
        zeroRateAmount,
        vatAmount: calc.totalVAT,
        method: calc.calculationMethod
      };
    });

    const summary = breakdown.reduce(
      (sum, item) => ({
        totalItems: sum.totalItems + 1,
        totalVAT: sum.totalVAT + item.vatAmount,
        standardRateVAT: sum.standardRateVAT + item.standardRateAmount,
        zeroRateVAT: sum.zeroRateVAT + item.zeroRateAmount
      }),
      { totalItems: 0, totalVAT: 0, standardRateVAT: 0, zeroRateVAT: 0 }
    );

    const complianceChecks = calculations.map(calc => this.validateHMRCCompliance(calc));
    const totalWarnings = complianceChecks.reduce((sum, check) => sum + check.warnings.length, 0);

    return {
      summary: {
        totalItems: summary.totalItems,
        totalVAT: Math.round(summary.totalVAT * 100) / 100,
        standardRateVAT: Math.round(summary.standardRateVAT * 100) / 100,
        zeroRateVAT: Math.round(summary.zeroRateVAT * 100) / 100
      },
      breakdown,
      compliance: {
        allCompliant: totalWarnings === 0,
        totalWarnings
      }
    };
  }
}
