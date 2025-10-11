'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Truck, Store, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { useTenantData } from '@/context/TenantDataContext';
import StripePaymentWrapper from '@/components/StripePaymentForm';
import GlobalPaymentsForm from '@/components/payments/GlobalPaymentsForm';
import WorldpayForm from '@/components/payments/WorldpayForm';
import PayPalForm from '@/components/payments/PayPalForm';

interface PendingOrderData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  total: number;
  orderType: string;
  fulfillmentType?: string;
  paymentMethod: string;
  items: any[];
  scheduledTime?: Date;
  isAdvanceOrder: boolean;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  voucherCode?: string;
  printed: boolean;
  customerId?: string;
  specialInstructions?: string;
  paymentGateway: string | null;
  gatewayName: string;
  tenantSlug: string;
  currencySymbol: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { tenantData } = useTenant();
  const { createOrder } = useTenantData();
  
  const [orderData, setOrderData] = useState<PendingOrderData | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [paymentConfigValidated, setPaymentConfigValidated] = useState(false);

  const total = searchParams.get('total');

  // Validate payment configuration with fresh API call
  const validatePaymentConfig = async (tenantSlug: string, storedGateway: string | null) => {
    try {
      console.log('🔍 Validating payment config for:', { tenantSlug, storedGateway });
      
      const response = await fetch(`/api/tenant/${tenantSlug}/payment-config?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const currentConfig = await response.json();
        console.log('🔍 Current payment config from API:', currentConfig);
        
        // Check if the stored gateway is still configured
        const isStillConfigured = currentConfig.configured && currentConfig.activeGateway === storedGateway;
        
        console.log('🔍 Payment validation result:', {
          storedGateway,
          currentActiveGateway: currentConfig.activeGateway,
          currentConfigured: currentConfig.configured,
          isStillConfigured
        });
        
        return isStillConfigured;
      }
    } catch (error) {
      console.error('Error validating payment config:', error);
    }
    
    return false;
  };

  useEffect(() => {
    const initializePaymentPage = async () => {
      // Load order data from sessionStorage
      const storedOrderData = sessionStorage.getItem('pendingOrder');
      if (storedOrderData) {
        try {
          const parsedData = JSON.parse(storedOrderData) as PendingOrderData;
          
          // Debug: Log the payment gateway information from session storage
          console.log('🔍 PaymentPage: Order data from session storage:', {
            paymentGateway: parsedData.paymentGateway,
            gatewayName: parsedData.gatewayName,
            paymentMethod: parsedData.paymentMethod,
            tenantSlug: parsedData.tenantSlug,
            timestamp: new Date().toISOString()
          });
          
          // Validate payment configuration with fresh API call
          if (parsedData.paymentGateway && parsedData.paymentGateway !== 'null') {
            const isConfigured = await validatePaymentConfig(parsedData.tenantSlug, parsedData.paymentGateway);
            
            if (!isConfigured) {
              console.log('⚠️ Payment gateway is no longer configured, clearing gateway data');
              // Clear payment gateway data if no longer configured
              parsedData.paymentGateway = null;
              parsedData.gatewayName = 'Payment System';
            }
          }
          
          setOrderData(parsedData);
          setPaymentConfigValidated(true);
          
          // Fetch Stripe publishable key if needed
          if (parsedData.paymentGateway === 'stripe') {
            fetchStripeConfig(parsedData.tenantSlug);
          }
        } catch (error) {
          console.error('Error parsing order data:', error);
          toast({
            title: 'Error',
            description: 'Order data not found. Please try again.',
            variant: 'destructive',
          });
          router.back();
        }
      } else {
        toast({
          title: 'No Order Found',
          description: 'Please complete your order details first.',
          variant: 'destructive',
        });
        router.back();
      }
      setLoading(false);
    };

    initializePaymentPage();
  }, [router, toast]);

  const fetchStripeConfig = async (tenantSlug: string) => {
    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/stripe-config`);
      if (response.ok) {
        const config = await response.json();
        setStripePublishableKey(config.publishableKey);
      }
    } catch (error) {
      console.error('Error fetching Stripe config:', error);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!orderData) return;

    try {
      console.log('💳 Payment successful, creating order...');
      
      // Create order with payment reference
      const orderResult = await createOrder({
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        address: orderData.address,
        total: orderData.total,
        orderType: orderData.orderType as 'delivery' | 'pickup' | 'advance' | 'collection',
        paymentMethod: orderData.paymentMethod as 'cash' | 'card',
        items: orderData.items,
        scheduledTime: orderData.scheduledTime,
        isAdvanceOrder: orderData.isAdvanceOrder,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        discount: orderData.discount,
        tax: orderData.tax,
        voucherCode: orderData.voucherCode,
        printed: orderData.printed,
        customerId: orderData.customerId,
        paymentTransactionId: paymentIntentId,
        specialInstructions: orderData.specialInstructions,
        orderSource: 'online',
      });
      
      // Clear stored order data
      sessionStorage.removeItem('pendingOrder');
      
      toast({
        title: 'Order Placed Successfully!',
        description: `Your order #${orderResult.orderNumber} has been confirmed and payment processed.`,
      });
      
      // Build proper order confirmation URL with all required parameters
      const confirmationParams = new URLSearchParams({
        orderId: orderResult.orderId,
        orderNumber: orderResult.orderNumber,
        orderType: orderResult.orderType,
        total: orderResult.total.toString(),
        customerName: orderResult.customerName || 'Customer'
      });

      // Extract postcode from address if available
      let postcode = 'N/A';
      if (orderData.address && orderData.address !== 'Collection') {
        // Try to extract postcode from the end of address
        const addressParts = orderData.address.split(',').map(part => part.trim());
        if (addressParts.length > 0) {
          const lastPart = addressParts[addressParts.length - 1];
          // Simple UK postcode pattern check
          if (lastPart.match(/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i)) {
            postcode = lastPart;
          }
        }
      }
      confirmationParams.set('postcode', postcode);

      // Add advance order specific parameters if applicable
      if (orderData.isAdvanceOrder && orderResult.scheduledTime) {
        confirmationParams.set('advanceFulfillmentType', orderData.fulfillmentType || orderData.orderType);
        confirmationParams.set('scheduledTime', orderResult.scheduledTime.toISOString());
      }
      
      // Redirect to proper order confirmation page
      const tenantSlug = tenantData?.slug || 'kitchen'; // fallback to 'kitchen' if slug is not available
      router.push(`/${tenantSlug}/order-confirmation?${confirmationParams.toString()}`);
      
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: 'Order Creation Failed',
        description: 'Payment was processed but there was an error creating your order. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    toast({
      title: 'Payment Failed',
      description: error,
      variant: 'destructive',
    });
  };

  const handleBackToOrder = () => {
    router.back();
  };

  if (loading || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToOrder}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
          <p className="text-gray-600 mt-1">Complete your payment to place the order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Details */}
                <div>
                  <h3 className="font-medium text-sm text-gray-900 mb-2">Customer</h3>
                  <p className="text-sm text-gray-600">{orderData.customerName}</p>
                  <p className="text-sm text-gray-600">{orderData.customerPhone}</p>
                  <p className="text-sm text-gray-600">{orderData.customerEmail}</p>
                </div>

                {/* Order Type */}
                <div className="flex items-center text-sm">
                  {orderData.orderType === 'delivery' ? (
                    <>
                      <Truck className="h-4 w-4 mr-2 text-green-600" />
                      <div>
                        <p className="font-medium">Delivery</p>
                        <p className="text-gray-600 text-xs">{orderData.address}</p>
                      </div>
                    </>
                  ) : orderData.orderType === 'collection' ? (
                    <>
                      <Store className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">Collection</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2 text-orange-600" />
                      <div>
                        <p className="font-medium">Advance Order</p>
                        <p className="text-gray-600 text-xs">
                          {orderData.fulfillmentType === 'delivery' ? 'Delivery' : 'Collection'}
                          {orderData.scheduledTime && (
                            <span> - {new Date(orderData.scheduledTime).toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium text-sm text-gray-900 mb-2">Items ({orderData.items.length})</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {orderData.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="text-gray-900">
                          {orderData.currencySymbol}{item.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{orderData.currencySymbol}{orderData.subtotal.toFixed(2)}</span>
                  </div>
                  {orderData.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>{orderData.currencySymbol}{orderData.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {orderData.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{orderData.currencySymbol}{orderData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-1">
                    <span>Total</span>
                    <span>{orderData.currencySymbol}{orderData.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  {orderData.gatewayName || 'Secure'} Payment
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Your payment is secured with {orderData.gatewayName || 'our secure payment system'}
                </p>
              </CardHeader>
              <CardContent>
                {orderData.paymentGateway === 'stripe' && stripePublishableKey ? (
                  <StripePaymentWrapper
                    stripePublishableKey={stripePublishableKey}
                    amount={orderData.total}
                    tenantSlug={orderData.tenantSlug}
                    customerName={orderData.customerName}
                    customerEmail={orderData.customerEmail}
                    billingAddress={
                      orderData.orderType === 'delivery' && orderData.address !== 'Collection'
                        ? {
                            line_1: orderData.address.split(',')[0] || '',
                            city: orderData.address.split(',')[1]?.trim() || '',
                            postal_code: orderData.address.split(',')[2]?.trim() || '',
                            country: 'GB'
                          }
                        : undefined
                    }
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                ) : orderData.paymentGateway === 'global_payments' ? (
                  <GlobalPaymentsForm
                    amount={orderData.total}
                    customerName={orderData.customerName}
                    customerEmail={orderData.customerEmail}
                    tenantSlug={orderData.tenantSlug}
                    billingAddress={
                      orderData.orderType === 'delivery' && orderData.address !== 'Collection'
                        ? {
                            line_1: orderData.address.split(',')[0] || '',
                            city: orderData.address.split(',')[1]?.trim() || '',
                            postal_code: orderData.address.split(',')[2]?.trim() || '',
                            country: 'GB'
                          }
                        : undefined
                    }
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                ) : orderData.paymentGateway === 'worldpay' ? (
                  <WorldpayForm
                    amount={orderData.total}
                    customerName={orderData.customerName}
                    customerEmail={orderData.customerEmail}
                    tenantSlug={orderData.tenantSlug}
                    billingAddress={
                      orderData.orderType === 'delivery' && orderData.address !== 'Collection'
                        ? {
                            line_1: orderData.address.split(',')[0] || '',
                            city: orderData.address.split(',')[1]?.trim() || '',
                            postal_code: orderData.address.split(',')[2]?.trim() || '',
                            country: 'GB'
                          }
                        : undefined
                    }
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                ) : orderData.paymentGateway === 'paypal' ? (
                  <PayPalForm
                    amount={orderData.total}
                    customerName={orderData.customerName}
                    customerEmail={orderData.customerEmail}
                    tenantSlug={orderData.tenantSlug}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <div className="flex items-center justify-center mb-4">
                        <CreditCard className="h-8 w-8 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Gateway Not Available</h3>
                      <p className="text-gray-600 mb-4">
                        No payment gateways are currently configured by the restaurant. 
                        Please contact them directly to complete your order or select a different payment method.
                      </p>
                      <Button onClick={handleBackToOrder} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Order
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
