import Stripe from 'stripe';

interface StripeCredentials {
  publishableKey: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
}

export class StripeService {
  private stripe: Stripe;
  private publishableKey: string;
  private environment: string;

  constructor(credentials: StripeCredentials) {
    this.stripe = new Stripe(credentials.secretKey, {
      // apiVersion: '2024-06-20',
      typescript: true,
    });
    this.publishableKey = credentials.publishableKey;
    this.environment = credentials.environment;
  }

  /**
   * Test the connection to Stripe API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    accountId?: string;
    balance?: any;
  }> {
    try {
      console.log('Testing Stripe connection...');
      
      // Get account information to verify connection
      const account = await this.stripe.accounts.retrieve();
      console.log('Stripe account retrieved successfully:', account.id);
      
      // Get balance to verify API access
      const balance = await this.stripe.balance.retrieve();
      console.log('Stripe balance retrieved successfully');
      
      return {
        success: true,
        message: 'Stripe connection successful',
        accountId: account.id,
        balance: balance
      };
    } catch (error) {
      console.error('Stripe connection test failed:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        message: `Stripe connection failed: ${errorMessage}`
      };
    }
  }

  /**
   * Create a Payment Intent for restaurant order
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    orderId: string;
    customerEmail?: string;
    customerName?: string;
    description?: string;
    metadata?: Record<string, string>;
    receiptEmail?: string;
    automaticPaymentMethods?: boolean;
  }): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      console.log('Creating Stripe Payment Intent for order:', params.orderId);
      
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        description: params.description || `Order #${params.orderId}`,
        metadata: {
          orderId: params.orderId,
          ...(params.metadata || {})
        },
        receipt_email: params.receiptEmail || params.customerEmail,
        automatic_payment_methods: {
          enabled: params.automaticPaymentMethods !== false
        }
      };

      // Add customer information if provided
      if (params.customerEmail || params.customerName) {
        let customer: Stripe.Customer;
        
        if (params.customerEmail) {
          // Try to find existing customer
          const existingCustomers = await this.stripe.customers.list({
            email: params.customerEmail,
            limit: 1
          });
          
          if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            // Create new customer
            customer = await this.stripe.customers.create({
              email: params.customerEmail,
              name: params.customerName,
              metadata: {
                orderId: params.orderId
              }
            });
          }
          
          paymentIntentParams.customer = customer.id;
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
      
      console.log('Payment Intent created successfully:', paymentIntent.id);
      
      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret!
      };
    } catch (error) {
      console.error('Failed to create Payment Intent:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Update Payment Intent (for order changes)
   */
  async updatePaymentIntent(
    paymentIntentId: string,
    params: {
      amount?: number;
      description?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    error?: string;
  }> {
    try {
      console.log('Updating Payment Intent:', paymentIntentId);
      
      const updateParams: Stripe.PaymentIntentUpdateParams = {};
      
      if (params.amount !== undefined) {
        updateParams.amount = params.amount;
      }
      
      if (params.description !== undefined) {
        updateParams.description = params.description;
      }
      
      if (params.metadata !== undefined) {
        updateParams.metadata = params.metadata;
      }
      
      const paymentIntent = await this.stripe.paymentIntents.update(
        paymentIntentId,
        updateParams
      );
      
      console.log('Payment Intent updated successfully');
      
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Failed to update Payment Intent:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Cancel Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    error?: string;
  }> {
    try {
      console.log('Canceling Payment Intent:', paymentIntentId);
      
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      
      console.log('Payment Intent canceled successfully');
      
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Failed to cancel Payment Intent:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Retrieve Payment Intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    error?: string;
  }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Failed to retrieve Payment Intent:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // in cents, optional for partial refunds
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    refund?: Stripe.Refund;
    error?: string;
  }> {
    try {
      console.log('Creating refund for Payment Intent:', params.paymentIntentId);
      
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        reason: params.reason,
        metadata: params.metadata
      };
      
      if (params.amount !== undefined) {
        refundParams.amount = params.amount;
      }
      
      const refund = await this.stripe.refunds.create(refundParams);
      
      console.log('Refund created successfully:', refund.id);
      
      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Failed to create refund:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string
  ): Stripe.Event | null {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  /**
   * Get publishable key for frontend
   */
  getPublishableKey(): string {
    return this.publishableKey;
  }

  /**
   * Get environment
   */
  getEnvironment(): string {
    return this.environment;
  }
}

/**
 * Create a Stripe service instance
 */
export function createStripeService(credentials: StripeCredentials): StripeService {
  return new StripeService(credentials);
}
