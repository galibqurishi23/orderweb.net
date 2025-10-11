/**
 * Currency utility functions for the application
 * Default currency is GBP (£)
 */

export const DEFAULT_CURRENCY = 'GBP';

export function getCurrencySymbol(currency?: string): string {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
    default:
      return '£'; // Default to GBP
  }
}

export function formatCurrency(amount: number, currency?: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

export const SUPPORTED_CURRENCIES = [
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' }
];
