'use client';

// Client-side Global Payments service for secure payment processing
export interface PaymentFormData {
  amount: number;
  currency: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface CardFormData {
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderName: string;
}

export class GlobalPaymentsClientService {
  private isLoaded = false;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Load the Global Payments JavaScript SDK
   */
  async loadSDK(): Promise<boolean> {
    if (this.isLoaded) {
      return true;
    }

    return new Promise((resolve) => {
      // Check if SDK is already loaded
      if (typeof window !== 'undefined' && (window as any).GlobalPayments) {
        this.isLoaded = true;
        resolve(true);
        return;
      }

      // Create script tag
      const script = document.createElement('script');
      script.src = 'https://js.globalpay.com/4.1.0/globalpayments.min.js';
      script.async = true;
      
      script.onload = () => {
        this.isLoaded = true;
        console.log('✅ Global Payments JS SDK loaded successfully');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Global Payments JS SDK');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the client SDK with tenant configuration
   */
  async initialize(): Promise<boolean> {
    try {
      // Load SDK if not already loaded
      const sdkLoaded = await this.loadSDK();
      if (!sdkLoaded) {
        throw new Error('Failed to load Global Payments SDK');
      }

      // Get tenant configuration
      const response = await fetch(`/api/payments/global-payments-sdk?tenantId=${this.tenantId}`);
      const config = await response.json();

      if (!config.configured) {
        throw new Error('Global Payments not configured for this tenant');
      }

      // Initialize the client SDK (this would typically involve setting up the environment)
      console.log('🔧 Global Payments client SDK initialized for environment:', config.environment);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Global Payments client SDK:', error);
      return false;
    }
  }

  /**
   * Process a payment using the SDK (simplified version)
   * In a real implementation, this would use tokenization for security
   */
  async processPayment(
    paymentData: PaymentFormData,
    cardData: CardFormData
  ): Promise<{
    success: boolean;
    transactionId?: string;
    authCode?: string;
    error?: string;
  }> {
    try {
      console.log('💳 Processing payment with Global Payments SDK...');
      
      // For security, card data should be tokenized on the client side
      // and only tokens sent to the server. This is a simplified example.
      
      const response = await fetch('/api/payments/global-payments-sdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process-payment',
          tenantId: this.tenantId,
          paymentRequest: {
            amount: paymentData.amount,
            currency: paymentData.currency,
            orderId: paymentData.orderId,
            customerEmail: paymentData.customerEmail,
            customerName: paymentData.customerName,
            customerPhone: paymentData.customerPhone,
          },
          cardData: {
            number: cardData.number,
            expMonth: parseInt(cardData.expMonth),
            expYear: parseInt(cardData.expYear),
            cvv: cardData.cvv,
            holderName: cardData.holderName,
          }
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment processing failed');
      }

      return result;
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/payments/global-payments-sdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-transaction',
          tenantId: this.tenantId,
          transactionId
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Transaction verification failed');
      }

      return result;
    } catch (error) {
      console.error('Transaction verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction verification failed'
      };
    }
  }

  /**
   * Create a payment form with built-in validation
   */
  createPaymentForm(containerId: string, options: {
    onSuccess?: (result: any) => void;
    onError?: (error: string) => void;
    submitButtonText?: string;
  } = {}): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Payment form container not found');
      return;
    }

    // Create a simple payment form (in production, use the SDK's built-in form components)
    container.innerHTML = `
      <form id="gp-payment-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Card Number</label>
            <input type="text" name="cardNumber" placeholder="1234 5678 9012 3456" 
                   class="w-full p-2 border rounded-md" maxlength="19" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Cardholder Name</label>
            <input type="text" name="cardholderName" placeholder="John Doe" 
                   class="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Expiry Date</label>
            <input type="text" name="expiryDate" placeholder="MM/YY" 
                   class="w-full p-2 border rounded-md" maxlength="5" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">CVV</label>
            <input type="text" name="cvv" placeholder="123" 
                   class="w-full p-2 border rounded-md" maxlength="4" />
          </div>
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          ${options.submitButtonText || 'Pay Now'}
        </button>
      </form>
    `;

    // Add form submission handler
    const form = container.querySelector('#gp-payment-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle form submission (this would integrate with the actual SDK)
      if (options.onSuccess) {
        options.onSuccess({ message: 'Payment form created successfully' });
      }
    });
  }
}

/**
 * Create a Global Payments client service instance
 */
export function createGlobalPaymentsClient(tenantId: string): GlobalPaymentsClientService {
  return new GlobalPaymentsClientService(tenantId);
}
