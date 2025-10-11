import { NextRequest, NextResponse } from 'next/server';
import { getTenantSettingsBySlug } from '@/lib/tenant-service';
import { createStripeService } from '@/lib/stripe-service';
import { headers } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant } = await params;
    
    // Get tenant settings
    const tenantSettings = await getTenantSettingsBySlug(tenant);
    
    if (!tenantSettings) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if Stripe is enabled
    const stripeConfig = tenantSettings.paymentSettings?.stripe;
    if (!stripeConfig?.enabled) {
      return NextResponse.json(
        { error: 'Stripe not enabled' },
        { status: 400 }
      );
    }

    if (!stripeConfig.webhookSecret) {
      return NextResponse.json(
        { error: 'Stripe webhook secret not configured' },
        { status: 400 }
      );
    }

    // Create Stripe service instance
    const stripeService = createStripeService({
      publishableKey: stripeConfig.publishableKey!,
      secretKey: stripeConfig.secretKey!,
      environment: stripeConfig.environment || 'sandbox'
    });

    // Get the raw body and signature
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const event = stripeService.verifyWebhookSignature(
      body,
      signature,
      stripeConfig.webhookSecret
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Received Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, tenant);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event, tenant);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event, tenant);
        break;
      
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event, tenant);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(event: any, tenant: string) {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;
  
  console.log('Payment succeeded for order:', orderId);
  
  // TODO: Update order status in database
  // Example: await updateOrderStatus(orderId, 'paid');
  
  // TODO: Send confirmation email to customer
  // Example: await sendOrderConfirmationEmail(orderId);
  
  // TODO: Trigger kitchen printer if needed
  // Example: await printKitchenOrder(orderId);
}

async function handlePaymentIntentFailed(event: any, tenant: string) {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;
  
  console.log('Payment failed for order:', orderId);
  
  // TODO: Update order status in database
  // Example: await updateOrderStatus(orderId, 'payment_failed');
  
  // TODO: Send notification to customer about payment failure
  // Example: await sendPaymentFailureNotification(orderId);
}

async function handlePaymentIntentCanceled(event: any, tenant: string) {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;
  
  console.log('Payment canceled for order:', orderId);
  
  // TODO: Update order status in database
  // Example: await updateOrderStatus(orderId, 'canceled');
}

async function handlePaymentIntentRequiresAction(event: any, tenant: string) {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;
  
  console.log('Payment requires action for order:', orderId);
  
  // TODO: Handle 3D Secure or other authentication requirements
  // This might involve notifying the customer to complete authentication
}
