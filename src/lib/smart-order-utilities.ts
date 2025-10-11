/**
 * Additional Smart Utilities for Order Processing
 * These functions make the code even more modular and reusable
 */

import { format } from 'date-fns';

// Smart form data extractor
export class FormDataExtractor {
  
  static extractCustomerInfo(formData: FormData) {
    return {
      customerName: (formData.get('customerName') as string)?.trim() || '',
      customerPhone: (formData.get('customerPhone') as string)?.trim() || '',
      customerEmail: (formData.get('customerEmail') as string)?.trim() || '',
      address: (formData.get('address') as string)?.trim() || '',
      city: (formData.get('city') as string)?.trim() || '',
      postcode: (formData.get('postcode') as string)?.trim() || '',
      orderNote: (formData.get('notes') as string)?.trim() || '',
    };
  }
  
  static buildAddressString(customerInfo: any, isDelivery: boolean): string {
    if (!isDelivery) return 'Collection';
    
    const { address, city, postcode } = customerInfo;
    return `${address}, ${city}, ${postcode}`;
  }
}

// Smart query parameters builder
export class QueryParamsBuilder {
  
  static buildOrderConfirmationParams(
    orderResult: any,
    orderContext: any,
    customerInfo: any
  ): URLSearchParams {
    const params = new URLSearchParams({
      orderId: orderResult.orderId,
      orderNumber: orderResult.orderNumber,
      orderType: orderResult.orderType,
      total: orderResult.total.toString(),
      customerName: orderResult.customerName,
    });

    if (orderResult.scheduledTime) {
      params.append('scheduledTime', orderResult.scheduledTime.toString());
    }

    // Add advance fulfillment type for advance orders
    if (orderContext.selectedOrderType === 'advance') {
      params.append('advanceFulfillmentType', orderContext.advanceFulfillmentType);
    }

    // Add postcode for delivery orders
    const isDelivery = orderContext.selectedOrderType === 'delivery' || 
                      (orderContext.selectedOrderType === 'advance' && 
                       orderContext.advanceFulfillmentType === 'delivery');
    
    if (isDelivery && customerInfo.postcode) {
      params.append('postcode', customerInfo.postcode);
    }

    return params;
  }
}

// Smart validation error mapper
export class ValidationErrorMapper {
  
  static mapValidationError(errorType: string, context?: any): { title: string; description: string } {
    const errorMap = {
      'order-type': {
        title: 'Order Type Unavailable',
        description: `Sorry, ${context?.selectedOrderType} orders are currently disabled.`
      },
      'restaurant-closed': {
        title: 'Restaurant Closed',
        description: `Sorry, we're currently closed. ${context?.message}`
      },
      'missing-info': {
        title: 'Missing Information',
        description: 'Please fill in all required fields.'
      },
      'missing-address': {
        title: 'Missing Address',
        description: 'Please fill in all address fields for delivery orders.'
      },
      'delivery-issue': {
        title: 'Delivery Issue',
        description: context?.deliveryError
      },
      'missing-schedule': {
        title: 'Missing Schedule',
        description: 'Please select date and time for advance order.'
      },
      'invalid-advance-time': {
        title: 'Invalid Advance Order Time',
        description: `Same-day orders require at least ${context?.minHoursNotice} hours notice. Please select a later time or a future date.`
      },
      'payment-not-available': {
        title: 'Payment Not Available',
        description: 'Card payments are not configured. Please select cash payment or contact the restaurant.'
      },
      'order-failed': {
        title: 'Order Failed',
        description: 'There was an error placing your order. Please try again.'
      },
      'order-capacity': {
        title: 'Restaurant Busy',
        description: 'The restaurant has reached its capacity for this time slot. Please try a different time or order later.'
      }
    };

    return errorMap[errorType as keyof typeof errorMap] || errorMap['order-failed'];
  }
}

// Smart order context builder for payment pages
export class PaymentOrderContextBuilder {
  
  static buildPaymentOrderData(
    customerInfo: any,
    orderContext: any,
    pricingData: any,
    orderItems: any[],
    calculateSelectedAddonPrice: (addons: any[]) => number
  ) {
    const isDelivery = orderContext.selectedOrderType === 'delivery' || 
                      (orderContext.selectedOrderType === 'advance' && 
                       orderContext.advanceFulfillmentType === 'delivery');

    return {
      customerName: customerInfo.customerName,
      customerPhone: customerInfo.customerPhone,
      customerEmail: customerInfo.customerEmail,
      address: FormDataExtractor.buildAddressString(customerInfo, isDelivery),
      total: pricingData.finalTotal,
      orderType: orderContext.selectedOrderType,
      fulfillmentType: orderContext.selectedOrderType === 'advance' 
        ? orderContext.advanceFulfillmentType 
        : orderContext.selectedOrderType,
      paymentMethod: orderContext.selectedPaymentMethod,
      items: this.buildPaymentOrderItems(orderItems, calculateSelectedAddonPrice),
      scheduledTime: this.buildScheduledTime(orderContext),
      isAdvanceOrder: orderContext.selectedOrderType === 'advance',
      subtotal: pricingData.subtotal,
      deliveryFee: pricingData.deliveryFee,
      discount: pricingData.voucherDiscount + pricingData.pointsDiscount,
      tax: 0,
      voucherCode: orderContext.appliedVoucher?.code || undefined,
      printed: false,
      customerId: undefined,
      specialInstructions: orderContext.orderNote?.trim() || undefined,
      // Payment gateway details
      paymentGateway: orderContext.paymentConfig?.configured 
        ? orderContext.paymentConfig.activeGateway 
        : null,
      gatewayName: orderContext.paymentConfig?.configured 
        ? orderContext.paymentConfig.gatewayName 
        : 'Payment System',
      // Additional context
      tenantSlug: orderContext.tenantData?.slug || '',
      currencySymbol: orderContext.currencySymbol
    };
  }

  private static buildPaymentOrderItems(
    orderItems: any[], 
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
          available: true,
          categoryId: item.categoryId || '',
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

  private static buildScheduledTime(orderContext: any): Date | undefined {
    if (orderContext.selectedOrderType === 'advance' && 
        orderContext.advanceDate && 
        orderContext.advanceTime) {
      return new Date(`${orderContext.advanceDate.toISOString().split('T')[0]}T${orderContext.advanceTime}:00`);
    }
    return undefined;
  }
}

// Smart cleanup utilities
export class OrderCleanupUtilities {
  
  static cleanupAfterOrder(stateSetters: any) {
    const {
      clearOrder,
      setAppliedVoucher,
      setVoucherInput,
      setPointsToRedeem
    } = stateSetters;

    // Execute all cleanup operations
    clearOrder?.();
    setAppliedVoucher?.(null);
    setVoucherInput?.('');
    setPointsToRedeem?.('');
  }

  static buildRedirectUrl(
    tenantSlug: string,
    queryParams: URLSearchParams
  ): string {
    return `/${tenantSlug}/order-confirmation?${queryParams.toString()}`;
  }
}
