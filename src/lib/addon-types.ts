// Comprehensive Add-on System Type Definitions
import { MenuItem, OrderItem } from './types';

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
  description?: string;
  imageUrl?: string;
  nutritionInfo?: {
    calories?: number;
    allergens?: string[];
  };
  // Quantity-based pricing
  quantityPricing?: {
    baseQuantity: number;
    additionalPrice: number; // price per additional unit
  };
}

export interface AddonGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: 'toppings' | 'sauces' | 'sides' | 'drinks' | 'extras' | 'size' | 'custom';
  type: 'single' | 'multiple'; // radio vs checkbox
  required: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  active: boolean;
  
  // Advanced features
  conditionalVisibility?: {
    showForCategories?: string[]; // category IDs
    showForItems?: string[]; // specific menu item IDs
    hideForCategories?: string[]; // exclude certain categories
    hideForItems?: string[]; // exclude specific items
  };
  
  // UI customization
  displayStyle?: 'list' | 'grid' | 'compact';
  allowCustomInput?: boolean; // allow customer to type custom instructions
  
  options: AddonOption[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectedAddonOption {
  optionId: string;
  quantity: number;
  customNote?: string; // for custom input
  totalPrice: number; // calculated price including quantity
}

export interface SelectedAddon {
  groupId: string;
  groupName: string;
  groupType: 'single' | 'multiple';
  options: SelectedAddonOption[];
  totalPrice: number; // sum of all selected options
}

export interface AddonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Menu Item with Addons
export interface MenuItemWithAddons extends Omit<MenuItem, 'addons'> {
  addonGroups: AddonGroup[];
  hasRequiredAddons: boolean;
  minAddonPrice: number; // minimum additional cost with required addons
  maxAddonPrice: number; // maximum possible addon cost
}

// Order Item with Addons
export interface OrderItemWithAddons extends Omit<OrderItem, 'selectedAddons'> {
  selectedAddons: SelectedAddon[];
  basePrice: number; // item price without addons
  addonPrice: number; // total addon price
  finalPrice: number; // basePrice + addonPrice
}

// API Request/Response Types
export interface CreateAddonGroupRequest {
  name: string;
  description?: string;
  category: AddonGroup['category'];
  type: AddonGroup['type'];
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
  active?: boolean;
  conditionalVisibility?: AddonGroup['conditionalVisibility'];
  displayStyle?: AddonGroup['displayStyle'];
  allowCustomInput?: boolean;
  options: Omit<AddonOption, 'id'>[];
}

export interface UpdateAddonGroupRequest extends Partial<CreateAddonGroupRequest> {
  id: string;
}

export interface CreateAddonOptionRequest {
  addonGroupId: string;
  name: string;
  price: number;
  available?: boolean;
  description?: string;
  imageUrl?: string;
  nutritionInfo?: AddonOption['nutritionInfo'];
  quantityPricing?: AddonOption['quantityPricing'];
}

export interface UpdateAddonOptionRequest extends Partial<CreateAddonOptionRequest> {
  id: string;
}

export interface AssignAddonGroupRequest {
  menuItemId: string;
  addonGroupIds: string[];
}

// Statistics and Analytics
export interface AddonStats {
  totalGroups: number;
  totalOptions: number;
  activeGroups: number;
  activeOptions: number;
  requiredGroups: number;
  optionalGroups: number;
  groupsByCategory: Record<AddonGroup['category'], number>;
  avgOptionsPerGroup: number;
  avgPricePerOption: number;
  topUsedAddons: {
    optionId: string;
    optionName: string;
    groupName: string;
    usageCount: number;
    revenue: number;
  }[];
}

// Pricing Configuration
export interface AddonPricingConfig {
  allowNegativePricing: boolean; // for discounts
  roundingStrategy: 'none' | 'up' | 'down' | 'nearest';
  roundingPrecision: number; // e.g., 0.05 for rounding to nearest 5 cents
  taxIncluded: boolean;
  bulkDiscounts?: {
    threshold: number; // minimum number of addon options
    discountPercent: number;
  }[];
}

// Customer Interface Types
export interface AddonSelectionState {
  [groupId: string]: {
    selectedOptions: {
      [optionId: string]: {
        quantity: number;
        customNote?: string;
      };
    };
    isValid: boolean;
    errors: string[];
  };
}

export interface AddonCalculationResult {
  subtotal: number;
  discounts: number;
  total: number;
  breakdown: {
    groupId: string;
    groupName: string;
    options: {
      optionId: string;
      optionName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    groupTotal: number;
  }[];
}

export default {};
