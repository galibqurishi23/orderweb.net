/**
 * Order Processing Utilities
 * Extracted from TenantCustomerInterface to make functions smaller and more focused
 */

import { Order, OrderItem } from '@/lib/types';
import { getRestaurantStatus } from '@/lib/opening-hours-utils';

// Type definitions for better type safety
export interface OrderValidationContext {
  selectedOrderType: string;
  availableOrderTypes: string[];
  restaurantSettings: any;
  advanceDate?: Date;
  advanceTime?: string;
  advanceFulfillmentType?: string;
  deliveryError?: string;
}

export interface CustomerInfo {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address?: string;
  city?: string;
  postcode?: string;
}

export interface OrderPricingData {
  subtotal: number;
  deliveryFee: number;
  voucherDiscount: number;
  pointsDiscount: number;
  finalTotal: number;
}

export interface PaymentProcessingContext {
  selectedPaymentMethod: string;
  paymentConfig: any;
  router: any;
  tenantData: any;
  currencySymbol: string;
}

// Smart validation functions
export class OrderValidator {
  
  static validateOrderType(context: OrderValidationContext): { isValid: boolean; error?: string } {
    const { selectedOrderType, availableOrderTypes } = context;
    
    if (!availableOrderTypes.includes(selectedOrderType)) {
      return {
        isValid: false,
        error: `Sorry, ${selectedOrderType} orders are currently disabled.`
      };
    }
    
    return { isValid: true };
  }

  static validateRestaurantHours(context: OrderValidationContext): { isValid: boolean; error?: string } {
    const { selectedOrderType, restaurantSettings } = context;
    
    // Skip validation for advance orders
    if (selectedOrderType === 'advance' || !restaurantSettings?.openingHours) {
      return { isValid: true };
    }

    const restaurantStatus = getRestaurantStatus(restaurantSettings.openingHours);
    
    if (!restaurantStatus.isOpen) {
      return {
        isValid: false,
        error: `Sorry, we're currently closed. ${restaurantStatus.message}`
      };
    }
    
    return { isValid: true };
  }

  static validateCustomerInfo(formData: FormData): { isValid: boolean; error?: string; customerInfo?: CustomerInfo } {
    const customerName = formData.get('customerName') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerEmail = formData.get('customerEmail') as string;

    if (!customerName?.trim() || !customerPhone?.trim() || !customerEmail?.trim()) {
      return {
        isValid: false,
        error: 'Please fill in all required fields.'
      };
    }

    return {
      isValid: true,
      customerInfo: {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        postcode: formData.get('postcode') as string,
      }
    };
  }

  static validateDeliveryInfo(context: OrderValidationContext, customerInfo: CustomerInfo): { isValid: boolean; error?: string } {
    const { selectedOrderType, advanceFulfillmentType, deliveryError } = context;
    
    const isDelivery = selectedOrderType === 'delivery' || 
                      (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery');
    
    if (!isDelivery) return { isValid: true };

    const { address, city, postcode } = customerInfo;
    
    if (!address?.trim() || !city?.trim() || !postcode?.trim()) {
      return {
        isValid: false,
        error: 'Please fill in all address fields for delivery orders.'
      };
    }

    if (deliveryError) {
      return {
        isValid: false,
        error: deliveryError
      };
    }

    return { isValid: true };
  }

  static validateAdvanceOrder(context: OrderValidationContext): { isValid: boolean; error?: string } {
    const { selectedOrderType, advanceDate, advanceTime, restaurantSettings } = context;
    
    if (selectedOrderType !== 'advance') return { isValid: true };

    if (!advanceDate || !advanceTime) {
      return {
        isValid: false,
        error: 'Please select date and time for advance order.'
      };
    }

    // Validate minimum notice period
    const selectedDateTime = new Date(`${advanceDate.toISOString().split('T')[0]}T${advanceTime}:00`);
    const now = new Date();
    const minHoursNotice = restaurantSettings?.advanceOrderSettings?.minHoursNotice || 4;
    const minDateTime = new Date(now.getTime() + (minHoursNotice * 60 * 60 * 1000));
    
    if (selectedDateTime < minDateTime) {
      return {
        isValid: false,
        error: `Same-day orders require at least ${minHoursNotice} hours notice. Please select a later time or a future date.`
      };
    }

    return { isValid: true };
  }
}

// Smart order data builder
export class OrderDataBuilder {
  
  static buildOrderData(
    customerInfo: CustomerInfo,
    context: OrderValidationContext,
    pricing: OrderPricingData,
    orderItems: OrderItem[],
    appliedVoucher: any,
    orderNote: string,
    calculateSelectedAddonPrice: (addons: any[]) => number
  ): Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'> {
    
    const isDelivery = context.selectedOrderType === 'delivery' || 
                      (context.selectedOrderType === 'advance' && context.advanceFulfillmentType === 'delivery');
    
    // Map order types correctly 
    const mappedOrderType = context.selectedOrderType === 'collection' ? 'pickup' : context.selectedOrderType;
    
    return {
      customerName: customerInfo.customerName,
      customerPhone: customerInfo.customerPhone,
      customerEmail: customerInfo.customerEmail,
      address: isDelivery 
        ? `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.postcode}` 
        : 'Collection',
      total: pricing.finalTotal,
      orderType: mappedOrderType as 'delivery' | 'pickup' | 'advance' | 'collection',
      paymentMethod: 'cash', // Default, will be updated by payment processor
      items: this.buildOrderItems(orderItems, calculateSelectedAddonPrice),
      scheduledTime: this.buildScheduledTime(context),
      isAdvanceOrder: context.selectedOrderType === 'advance',
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      discount: pricing.voucherDiscount,
      tax: 0,
      voucherCode: appliedVoucher?.code || undefined,
      printed: false,
      customerId: undefined,
      orderSource: 'online',
      specialInstructions: orderNote?.trim() || undefined,
    };
  }

  private static buildOrderItems(
    orderItems: OrderItem[], 
    calculateSelectedAddonPrice: (addons: any[]) => number
  ) {
    return orderItems.map(item => {
      const addonPrice = calculateSelectedAddonPrice(item.selectedAddons || []);
      return {
        id: item.orderItemId,
        menuItem: {
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          image: item.image || '',
          imageHint: item.imageHint || '',
          categoryId: item.categoryId,
          available: item.available || true,
          characteristics: item.characteristics || [],
          nutrition: item.nutrition || undefined,
        },
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        selectedAddons: item.selectedAddons || [],
        specialInstructions: item.specialInstructions || '',
        basePrice: item.price,
        addonPrice: addonPrice,
        finalPrice: item.price + addonPrice,
      };
    });
  }

  private static buildScheduledTime(context: OrderValidationContext): Date | undefined {
    if (context.selectedOrderType === 'advance' && context.advanceDate && context.advanceTime) {
      return new Date(`${context.advanceDate.toISOString().split('T')[0]}T${context.advanceTime}:00`);
    }
    return undefined;
  }
}

// Smart payment processor
export class PaymentProcessor {
  
  static async processCardPayment(
    context: PaymentProcessingContext,
    orderData: any,
    pricing: OrderPricingData
  ): Promise<{ success: boolean; error?: string }> {
    
    if (!context.paymentConfig?.configured || !context.paymentConfig?.activeGateway) {
      return {
        success: false,
        error: 'Card payments are not configured. Please select cash payment or contact the restaurant.'
      };
    }

    // Build payment order data
    const paymentOrderData = {
      ...orderData,
      paymentMethod: 'card',
      paymentGateway: context.paymentConfig.activeGateway,
      gatewayName: context.paymentConfig.gatewayName,
      tenantSlug: context.tenantData?.slug || '',
      currencySymbol: context.currencySymbol,
      total: pricing.finalTotal,
      discount: pricing.voucherDiscount + pricing.pointsDiscount,
    };
    
    // Store in session and redirect
    sessionStorage.setItem('pendingOrder', JSON.stringify(paymentOrderData));
    context.router.push(`/${context.tenantData?.slug}/payment?total=${pricing.finalTotal.toFixed(2)}`);
    
    return { success: true };
  }
}

// Smart post-order processor for loyalty points and vouchers
export class PostOrderProcessor {
  
  static async processLoyaltyPoints(
    pointsToRedeem: string,
    customerAuth: any,
    orderResult: any,
    finalTotal: number,
    loyaltyData: any,
    setLoyaltyData: (data: any) => void
  ): Promise<void> {
    const pointsAmount = parseInt(pointsToRedeem);
    if (pointsAmount <= 0 || !customerAuth) return;

    try {
      const response = await fetch('/api/customer/redeem-points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pointsToRedeem: pointsAmount,
          orderId: orderResult.orderId,
          orderTotal: finalTotal
        }),
      });

      if (response.ok && loyaltyData) {
        setLoyaltyData({
          ...loyaltyData,
          pointsBalance: loyaltyData.pointsBalance - pointsAmount
        });
      }
    } catch (error) {
      console.error('Error processing loyalty points redemption:', error);
      // Don't fail the order if points redemption fails
    }
  }

  static async processVoucherUsage(
    appliedVoucher: any,
    tenantId: string,
    TenantVoucherService: any
  ): Promise<void> {
    if (!appliedVoucher || !tenantId) return;

    try {
      await TenantVoucherService.incrementVoucherUsage(tenantId, appliedVoucher.id);
    } catch (error) {
      console.error('Error incrementing voucher usage:', error);
      // Don't fail the order if voucher update fails
    }
  }
}
