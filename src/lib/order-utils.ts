import type { RestaurantSettings } from './types';

/**
 * Generates a unique order number with prefix based on restaurant name
 * Format: [PREFIX]-[4-digit-number]
 * Examples: "BIS-1234", "PIZ-5678"
 */
export function generateOrderNumber(
  restaurantSettings: RestaurantSettings, 
  isAdvanceOrder: boolean = false
): string {
  const prefix = generatePrefixFromRestaurantName(restaurantSettings.name);
    
  // Generate 4-digit random number
  const orderNumber = Math.floor(1000 + Math.random() * 9000);
  
  return `${prefix}-${orderNumber}`;
}

/**
 * Generates prefix from restaurant name
 * Takes first 3 alphabetic characters of restaurant name, uppercased
 */
function generatePrefixFromRestaurantName(restaurantName: string): string {
  if (!restaurantName) {
    return 'ORD';
  }
  
  // Extract only alphabetic characters
  const alphabetic = restaurantName.replace(/[^a-zA-Z]/g, '');
  
  // Take first 3 characters, uppercase
  let prefix = alphabetic.substring(0, 3).toUpperCase();
  
  // Pad with 'X' if less than 3 characters
  while (prefix.length < 3) {
    prefix += 'X';
  }
  
  return prefix;
}

/**
 * Validates if an order number follows the correct format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  // Format: XXX-XXXX (3 letters, dash, 4 digits)
  const orderNumberRegex = /^[A-Z]{3}-\d{4}$/;
  return orderNumberRegex.test(orderNumber);
}

/**
 * Extracts prefix from order number
 */
export function extractOrderPrefix(orderNumber: string): string | null {
  const match = orderNumber.match(/^([A-Z]{3})-\d{4}$/);
  return match ? match[1] : null;
}
