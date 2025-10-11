'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface GlobalPaymentsFormProps {
  amount: number;
  onPaymentSuccess: (transactionId: string) => void;
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

const GlobalPaymentsForm: React.FC<GlobalPaymentsFormProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  customerName,
  customerEmail,
  tenantSlug,
  billingAddress
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState(customerName);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);

    try {
      // Format card data for Global Payments API
      const paymentMethod = {
        card: {
          number: cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(expiryDate.split('/')[0]),
          exp_year: parseInt(`20${expiryDate.split('/')[1]}`),
          cvc: cvv
        },
        billing_details: {
          name: cardholderName,
          email: customerEmail,
          address: billingAddress
        }
      };

      // Create order reference
      const orderReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process payment through Global Payments
      const response = await fetch(`/api/tenant/${tenantSlug}/payments/global-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_payment',
          amount: amount,
          orderId: orderReference,
          paymentMethod: paymentMethod
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        onPaymentSuccess(result.data.id);
      } else {
        onPaymentError(result.error || result.message || 'Payment processing failed');
      }

    } catch (error) {
      console.error('Global Payments error:', error);
      onPaymentError('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="w-8 h-8 bg-orange-600 rounded mr-3 flex items-center justify-center">
            <span className="text-white text-sm font-bold">GP</span>
          </div>
          Global Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gp-cardholder-name">Cardholder Name</Label>
            <Input
              id="gp-cardholder-name"
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Name on card"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gp-card-number">Card Number</Label>
            <Input
              id="gp-card-number"
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gp-expiry">Expiry Date</Label>
              <Input
                id="gp-expiry"
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gp-cvv">CVV</Label>
              <Input
                id="gp-cvv"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Test Mode</p>
                <p>This is a test environment. No real charges will be made.</p>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing ? 'Processing...' : `Pay £${amount.toFixed(2)}`}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Secured by Global Payments
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GlobalPaymentsForm;
