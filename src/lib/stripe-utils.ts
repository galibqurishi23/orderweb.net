import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface CreatePaymentIntentParams {
  amount: number; // Amount in pence (e.g., 1000 = £10.00)
  currency?: string;
  connectAccountId?: string;
  applicationFeeAmount?: number;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  paymentIntent: Stripe.PaymentIntent;
  clientSecret: string;
}

/**
 * Create a payment intent for Stripe Connect
 * @param params Payment intent parameters
 * @returns Payment intent and client secret
 */
export async function createPaymentIntent({
  amount,
  currency = 'gbp',
  connectAccountId,
  applicationFeeAmount,
  metadata = {}
}: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult> {
  try {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    };

    // If this is a Connect payment, add transfer data and application fee
    if (connectAccountId) {
      paymentIntentData.transfer_data = {
        destination: connectAccountId,
      };
      
      if (applicationFeeAmount) {
        paymentIntentData.application_fee_amount = applicationFeeAmount;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    return {
      paymentIntent,
      clientSecret: paymentIntent.client_secret!
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Retrieve a payment intent
 * @param paymentIntentId Payment intent ID
 * @returns Payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error('Failed to retrieve payment intent');
  }
}

/**
 * Confirm a payment intent
 * @param paymentIntentId Payment intent ID
 * @param paymentMethodId Payment method ID
 * @returns Confirmed payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw new Error('Failed to confirm payment intent');
  }
}

/**
 * Calculate application fee (platform fee)
 * Platform takes a small fee from each transaction
 * @param amount Total amount in pence
 * @returns Application fee in pence
 */
export function calculateApplicationFee(amount: number): number {
  // Take 2.9% + 30p as platform fee (similar to Stripe's standard rate)
  const percentageFee = Math.round(amount * 0.029);
  const fixedFee = 30; // 30 pence
  return percentageFee + fixedFee;
}

/**
 * Convert pounds to pence for Stripe
 * @param pounds Amount in pounds
 * @returns Amount in pence
 */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Convert pence to pounds for display
 * @param pence Amount in pence
 * @returns Amount in pounds
 */
export function penceToPounds(pence: number): number {
  return pence / 100;
}

/**
 * Format currency for display
 * @param amount Amount in pounds
 * @param currency Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate Stripe Connect Account ID format
 * @param accountId Connect account ID
 * @returns Boolean indicating if valid
 */
export function validateConnectAccountId(accountId: string): boolean {
  // Stripe Connect account IDs start with 'acct_'
  return /^acct_[a-zA-Z0-9]{16,}$/.test(accountId);
}

export { stripe };
