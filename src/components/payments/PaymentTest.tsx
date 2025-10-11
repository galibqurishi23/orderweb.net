'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import StripePaymentProvider from '@/components/payments/StripePaymentProvider';

interface PaymentTestProps {
  tenant: string;
}

const PaymentTest: React.FC<PaymentTestProps> = ({ tenant }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState({
    orderId: `TEST-${Date.now()}`,
    amount: 10.50,
    currency: 'usd',
    customerEmail: 'test@example.com',
    customerName: 'Test Customer',
    description: 'Test payment for restaurant order'
  });

  const handleStartPayment = () => {
    setShowPayment(true);
    setPaymentStatus('idle');
    setPaymentMessage('');
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentStatus('success');
    setPaymentMessage(`Payment successful! Payment ID: ${paymentIntentId}`);
    setShowPayment(false);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setPaymentMessage(`Payment failed: ${error}`);
    setShowPayment(false);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setPaymentStatus('idle');
    setPaymentMessage('');
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`/api/tenant/${tenant}/payments/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setPaymentStatus('success');
        setPaymentMessage(`Stripe connection successful! Account ID: ${result.accountId}`);
      } else {
        setPaymentStatus('error');
        setPaymentMessage(`Stripe connection failed: ${result.details || result.error}`);
      }
    } catch (error) {
      setPaymentStatus('error');
      setPaymentMessage(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Payment Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={orderDetails.amount}
              onChange={(e) => setOrderDetails({
                ...orderDetails,
                amount: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={orderDetails.currency}
              onChange={(e) => setOrderDetails({
                ...orderDetails,
                currency: e.target.value
              })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Customer Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={orderDetails.customerEmail}
              onChange={(e) => setOrderDetails({
                ...orderDetails,
                customerEmail: e.target.value
              })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={orderDetails.customerName}
              onChange={(e) => setOrderDetails({
                ...orderDetails,
                customerName: e.target.value
              })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTestConnection} variant="outline" className="flex-1">
              Test Connection
            </Button>
            <Button onClick={handleStartPayment} className="flex-1">
              Start Payment Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {paymentStatus !== 'idle' && (
        <Alert variant={paymentStatus === 'success' ? 'default' : 'destructive'}>
          <div className="flex items-center gap-2">
            {paymentStatus === 'success' ? 
              <CheckCircle className="h-4 w-4 text-green-600" /> : 
              <AlertCircle className="h-4 w-4" />
            }
            <AlertDescription>{paymentMessage}</AlertDescription>
          </div>
        </Alert>
      )}

      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <StripePaymentProvider
              tenant={tenant}
              orderDetails={orderDetails}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onPaymentCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTest;
