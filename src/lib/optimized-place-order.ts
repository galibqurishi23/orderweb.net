import { 
  OrderValidator, 
  OrderDataBuilder, 
  PaymentProcessor, 
  PostOrderProcessor,
  type OrderValidationContext,
  type OrderPricingData,
  type PaymentProcessingContext 
} from '@/lib/order-processing-utils';
import {
  FormDataExtractor,
  QueryParamsBuilder,
  ValidationErrorMapper,
  PaymentOrderContextBuilder,
  OrderCleanupUtilities
} from '@/lib/smart-order-utilities';

/**
 * Optimized and Smart handlePlaceOrder function
 * Broken down into smaller, focused functions for better maintainability
 */
export function createOptimizedPlaceOrderHandler({
  toast,
  createOrder,
  clearOrder,
  TenantVoucherService,
  calculateSelectedAddonPrice
}: {
  toast: any;
  createOrder: any;
  clearOrder: any;
  TenantVoucherService: any;
  calculateSelectedAddonPrice: (addons: any[]) => number;
}) {
  
  return function handlePlaceOrder(formData: FormData, context: any) {
    return (async () => {
      try {
        // Extract context values
        const {
          selectedOrderType,
          availableOrderTypes,
          restaurantSettings,
          advanceDate,
          advanceTime,
          advanceFulfillmentType,
          deliveryError,
          order,
          orderNote,
          subtotal,
          deliveryFee,
          voucherDiscount,
          pointsDiscount,
          finalTotal,
          appliedVoucher,
          selectedPaymentMethod,
          paymentConfig,
          pointsToRedeem,
          customerAuth,
          loyaltyData,
          setLoyaltyData,
          router,
          tenantData,
          currencySymbol,
          setAppliedVoucher,
          setVoucherInput,
          setPointsToRedeem
        } = context;
      // Step 1: Build validation context
      const validationContext: OrderValidationContext = {
        selectedOrderType,
        availableOrderTypes,
        restaurantSettings,
        advanceDate,
        advanceTime,
        advanceFulfillmentType,
        deliveryError
      };

      // Step 2: Run all validations using smart validators
      const validations = [
        OrderValidator.validateOrderType(validationContext),
        OrderValidator.validateRestaurantHours(validationContext),
        OrderValidator.validateCustomerInfo(formData),
        OrderValidator.validateAdvanceOrder(validationContext)
      ];

      // Check for validation failures
      for (const validation of validations) {
        if (!validation.isValid) {
          toast({
            title: validation.error?.includes('closed') ? 'Restaurant Closed' : 
                   validation.error?.includes('schedule') ? 'Missing Schedule' :
                   validation.error?.includes('notice') ? 'Invalid Advance Order Time' : 'Validation Error',
            description: validation.error,
            variant: 'destructive',
          });
          return;
        }
      }

      // Extract customer info from successful validation
      const customerValidation = OrderValidator.validateCustomerInfo(formData);
      const customerInfo = customerValidation.customerInfo!;

      // Step 3: Validate delivery info if needed
      const deliveryValidation = OrderValidator.validateDeliveryInfo(validationContext, customerInfo);
      if (!deliveryValidation.isValid) {
        toast({
          title: 'Missing Address',
          description: deliveryValidation.error,
          variant: 'destructive',
        });
        return;
      }

      // Step 4: Build pricing data
      const pricingData: OrderPricingData = {
        subtotal,
        deliveryFee,
        voucherDiscount,
        pointsDiscount,
        finalTotal
      };

      // Step 5: Handle card payments with smart payment processor
      if (selectedPaymentMethod === 'card') {
        const paymentContext: PaymentProcessingContext = {
          selectedPaymentMethod,
          paymentConfig,
          router,
          tenantData,
          currencySymbol
        };

        const orderData = OrderDataBuilder.buildOrderData(
          customerInfo,
          validationContext,
          pricingData,
          order,
          appliedVoucher,
          orderNote,
          calculateSelectedAddonPrice
        );

        const paymentResult = await PaymentProcessor.processCardPayment(
          paymentContext,
          orderData,
          pricingData
        );

        if (!paymentResult.success) {
          toast({
            title: 'Payment Not Available',
            description: paymentResult.error,
            variant: 'destructive',
          });
          return;
        }
        
        return; // Payment processor handles the redirect
      }

      // Step 6: Build order data for cash payments
      const orderData = OrderDataBuilder.buildOrderData(
        customerInfo,
        validationContext,
        pricingData,
        order,
        appliedVoucher,
        orderNote,
        calculateSelectedAddonPrice
      );

      // Step 7: Create the order
      const orderResult = await createOrder(orderData);

      // Step 8: Post-order processing (loyalty & vouchers)
      await Promise.all([
        PostOrderProcessor.processLoyaltyPoints(
          pointsToRedeem,
          customerAuth,
          orderResult,
          finalTotal,
          loyaltyData,
          setLoyaltyData
        ),
        PostOrderProcessor.processVoucherUsage(
          appliedVoucher,
          tenantData?.id,
          TenantVoucherService
        )
      ]);

      // Step 9: Clean up and redirect
      clearOrder();
      setAppliedVoucher?.(null);
      setVoucherInput?.('');
      setPointsToRedeem?.('');

      // Build redirect query params
      const queryParams = new URLSearchParams({
        orderId: orderResult.orderId,
        orderNumber: orderResult.orderNumber,
        orderType: orderResult.orderType,
        total: orderResult.total.toString(),
        customerName: orderResult.customerName,
      });

      if (orderResult.scheduledTime) {
        queryParams.append('scheduledTime', orderResult.scheduledTime.toString());
      }

      // Add postcode for delivery orders
      const isDelivery = selectedOrderType === 'delivery' || 
                        (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery');
      if (isDelivery && customerInfo.postcode) {
        queryParams.append('postcode', customerInfo.postcode);
      }

      router.push(`/${tenantData?.slug}/order-confirmation?${queryParams.toString()}`);

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Order Failed',
        description: 'There was an error placing your order. Please try again.',
        variant: 'destructive',
      });
    }
  })();
  };
}
