'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface PayPalFormProps {
  amount: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  customerName: string;
  customerEmail?: string;
  tenantSlug: string;
}

declare global {
  interface Window {
    paypal: any;
  }
}

const PayPalForm: React.FC<PayPalFormProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  customerName,
  customerEmail,
  tenantSlug
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  useEffect(() => {
    // Load PayPal SDK
    const loadPayPalScript = () => {
      if (window.paypal) {
        setPaypalLoaded(true);
        setIsLoading(false);
        renderPayPalButton();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=test&currency=GBP&intent=capture`;
      script.onload = () => {
        setPaypalLoaded(true);
        setIsLoading(false);
        renderPayPalButton();
      };
      script.onerror = () => {
        setIsLoading(false);
        onPaymentError('Failed to load PayPal');
      };
      document.body.appendChild(script);
    };

    loadPayPalScript();
  }, []);

  const renderPayPalButton = () => {
    if (!window.paypal || !paypalLoaded) return;

    // Clear existing PayPal button
    const container = document.getElementById('paypal-button-container');
    if (container) {
      container.innerHTML = '';
    }

    window.paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: amount.toFixed(2),
              currency_code: 'GBP'
            },
            description: `Online Order - ${tenantSlug}`,
            custom_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            invoice_id: `inv_${Date.now()}`,
            soft_descriptor: tenantSlug.substring(0, 22) // Max 22 chars
          }],
          payer: {
            name: {
              given_name: customerName.split(' ')[0] || 'Customer',
              surname: customerName.split(' ').slice(1).join(' ') || 'Name'
            },
            email_address: customerEmail
          },
          application_context: {
            brand_name: tenantSlug,
            user_action: 'PAY_NOW',
            return_url: `${window.location.origin}/${tenantSlug}/order-success`,
            cancel_url: `${window.location.origin}/${tenantSlug}/payment`
          }
        });
      },
      onApprove: async (data: any, actions: any) => {
        setIsProcessing(true);
        try {
          const order = await actions.order.capture();
          
          // Process the successful payment
          const captureId = order.purchase_units[0].payments.captures[0].id;
          
          onPaymentSuccess(captureId);
        } catch (error) {
          console.error('PayPal payment capture error:', error);
          onPaymentError('Payment capture failed');
        } finally {
          setIsProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        onPaymentError('PayPal payment failed');
        setIsProcessing(false);
      },
      onCancel: (data: any) => {
        console.log('PayPal payment cancelled:', data);
        onPaymentError('Payment cancelled');
        setIsProcessing(false);
      },
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal'
      }
    }).render('#paypal-button-container');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
            <span className="text-white text-sm font-bold">PP</span>
          </div>
          PayPal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading PayPal...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 mb-4">
              <p>Pay securely with your PayPal account</p>
              <p className="font-semibold">Total: £{amount.toFixed(2)}</p>
            </div>
            
            <div 
              id="paypal-button-container" 
              className={isProcessing ? 'opacity-50 pointer-events-none' : ''}
            />
            
            {isProcessing && (
              <div className="text-center text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Processing payment...
              </div>
            )}
            
            <div className="text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center">
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Secured by PayPal
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayPalForm;
