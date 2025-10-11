// Simple utility functions for addon calculations
// These are client-side utilities and don't need to be Server Actions

import { SelectedAddon } from './addon-types';

/**
 * Calculate the total price of selected addons
 * This is a synchronous function that can be used on the client side
 */
export function calculateSelectedAddonPrice(selectedAddons: SelectedAddon[]): number {
  return selectedAddons.reduce((total, group) => {
    return total + group.options.reduce((groupTotal, option) => {
      return groupTotal + option.totalPrice;
    }, 0);
  }, 0);
}

/**
 * Format addon display name with quantity
 */
export function formatAddonDisplay(addon: SelectedAddon): string {
  return addon.options.map(option => 
    `${option.quantity > 1 ? `${option.quantity}x ` : ''}${option.optionId}`
  ).join(', ');
}

/**
 * Check if addon group has any selections
 */
export function hasAddonSelections(addons: SelectedAddon[]): boolean {
  return addons.length > 0 && addons.some(group => group.options.length > 0);
}
