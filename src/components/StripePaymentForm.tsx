import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StripePaymentFormProps {
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  customerName: string;
  customerEmail?: string;
  tenantSlug: string;
  billingAddress?: {
    line_1: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

const PaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  customerName,
  customerEmail,
  tenantSlug,
  billingAddress
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState(customerName);
  const [postalCode, setPostalCode] = useState(billingAddress?.postal_code || '');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onPaymentError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onPaymentError('Card element not found.');
      return;
    }

    // Validate postal code
    if (!postalCode.trim()) {
      onPaymentError('Please enter your post code or ZIP code.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const orderReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`/api/tenant/${tenantSlug}/payments/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_payment_intent',
          amount: amount,
          currency: 'gbp',
          orderId: orderReference,
          customerName: cardholderName,
          customerEmail: customerEmail,
          description: `Online Order - ${tenantSlug}`,
          metadata: {
            order_reference: orderReference,
            customer_name: customerName,
            payment_gateway: 'stripe'
          }
        }),
      });

      const { clientSecret, paymentIntentId } = await response.json();

      if (!clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Confirm payment with card
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName,
            email: customerEmail,
            address: {
              line1: billingAddress?.line_1 || 'Not provided',
              city: billingAddress?.city || 'Not provided',
              postal_code: postalCode || billingAddress?.postal_code || 'SW1A 1AA',
              country: billingAddress?.country || 'GB'
            }
          }
        }
      });

      if (result.error) {
        onPaymentError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onPaymentSuccess(result.paymentIntent.id);
      } else {
        onPaymentError('Payment was not successful');
      }
    } catch (error) {
      console.error('Payment error:', error);
      onPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true, // We'll collect postal code separately
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholder-name">Cardholder Name</Label>
        <Input
          id="cardholder-name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border border-gray-300 rounded-md">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postal-code">Post Code / ZIP Code</Label>
        <Input
          id="postal-code"
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Enter your post code or ZIP code"
          required
        />
        <p className="text-xs text-gray-500">Required for payment verification</p>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : `Pay £${amount.toFixed(2)}`}
      </Button>
    </form>
  );
};

interface StripePaymentWrapperProps extends StripePaymentFormProps {
  stripePublishableKey: string;
}

const StripePaymentWrapper: React.FC<StripePaymentWrapperProps> = ({
  stripePublishableKey,
  ...props
}) => {
  const [stripePromise] = useState(() => loadStripe(stripePublishableKey));

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default StripePaymentWrapper;
