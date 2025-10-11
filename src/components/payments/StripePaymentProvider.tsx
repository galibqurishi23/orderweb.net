'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';

interface StripePaymentProviderProps {
  tenant: string;
  orderDetails: {
    orderId: string;
    amount: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    description?: string;
  };
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancel: () => void;
}

interface PaymentFormProps {
  orderDetails: StripePaymentProviderProps['orderDetails'];
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancel: () => void;
}

// Payment form component that uses Stripe Elements
const PaymentForm: React.FC<PaymentFormProps> = ({
  orderDetails,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Validate elements before confirming
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          receipt_email: orderDetails.customerEmail,
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
      } else if (paymentIntent) {
        throw new Error(`Payment ${paymentIntent.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <p><strong>Order:</strong> {orderDetails.orderId}</p>
              <p><strong>Amount:</strong> {orderDetails.currency.toUpperCase()} {orderDetails.amount.toFixed(2)}</p>
              {orderDetails.description && (
                <p><strong>Description:</strong> {orderDetails.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <PaymentElement 
              options={{
                layout: "tabs",
                fields: {
                  billingDetails: 'auto'
                }
              }}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Secured by Stripe. Your payment information is encrypted and secure.</span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onPaymentCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Pay ${orderDetails.currency.toUpperCase()} ${orderDetails.amount.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Main Stripe payment provider component
const StripePaymentProvider: React.FC<StripePaymentProviderProps> = ({
  tenant,
  orderDetails,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        console.log('Initializing Stripe for tenant:', tenant);
        
        // Get Stripe configuration
        const configResponse = await fetch(`/api/tenant/${tenant}/payments/stripe`);
        if (!configResponse.ok) {
          throw new Error('Failed to load Stripe configuration');
        }
        const config = await configResponse.json();
        
        console.log('Stripe config received:', { 
          configured: config.configured, 
          hasPublishableKey: !!config.publishableKey,
          error: config.error 
        });

        // Check if Stripe is properly configured
        if (!config.configured || !config.publishableKey) {
          throw new Error(config.error || 'Stripe payment system not configured');
        }

        // Initialize Stripe with publishable key
        const stripe = loadStripe(config.publishableKey);
        setStripePromise(stripe);

        console.log('Creating payment intent for order:', orderDetails.orderId);

        // Create payment intent
        const paymentResponse = await fetch(`/api/tenant/${tenant}/payments/stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_payment_intent',
            ...orderDetails
          })
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const paymentData = await paymentResponse.json();
        console.log('Payment intent created:', paymentData.paymentIntentId);
        setClientSecret(paymentData.clientSecret);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        console.error('Stripe initialization error:', error);
        setError(errorMessage);
        onPaymentError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, [tenant, orderDetails, onPaymentError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stripePromise || !clientSecret) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to initialize payment system</AlertDescription>
      </Alert>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0a58ca',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
    fields: {
      billingDetails: 'auto',
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        orderDetails={orderDetails}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        onPaymentCancel={onPaymentCancel}
      />
    </Elements>
  );
};

export default StripePaymentProvider;
