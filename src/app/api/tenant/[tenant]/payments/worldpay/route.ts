import { NextRequest, NextResponse } from 'next/server';
import { createWorldpayService, WorldpayPaymentRequest } from '@/lib/worldpay-service';
import { getTenantSettingsBySlug } from '@/lib/tenant-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
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

    // Check if Worldpay is enabled
    const worldpayConfig = tenantSettings.paymentSettings?.worldpay;
    if (!worldpayConfig?.enabled) {
      return NextResponse.json(
        { error: 'Worldpay not enabled' },
        { status: 400 }
      );
    }

    if (!worldpayConfig.username || !worldpayConfig.password) {
      return NextResponse.json(
        { error: 'Worldpay not configured properly. Missing username or password.' },
        { status: 400 }
      );
    }

    // Return configuration status
    return NextResponse.json({
      enabled: worldpayConfig.enabled,
      configured: true,
      environment: worldpayConfig.environment || 'sandbox',
      merchantId: worldpayConfig.merchantId || 'default',
      entity: worldpayConfig.entity || 'default'
    });

  } catch (error) {
    console.error('Error fetching Worldpay configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant } = await params;
    const body = await request.json();
    
    // Get tenant settings
    const tenantSettings = await getTenantSettingsBySlug(tenant);
    
    if (!tenantSettings) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if Worldpay is enabled
    const worldpayConfig = tenantSettings.paymentSettings?.worldpay;
    if (!worldpayConfig?.enabled) {
      return NextResponse.json(
        { error: 'Worldpay not enabled' },
        { status: 400 }
      );
    }

    if (!worldpayConfig.username || !worldpayConfig.password) {
      return NextResponse.json(
        { error: 'Worldpay not configured properly. Missing username or password.' },
        { status: 400 }
      );
    }

    // Create Worldpay service instance
    const worldpayService = createWorldpayService({
      merchantId: worldpayConfig.merchantId || 'default',
      username: worldpayConfig.username,
      password: worldpayConfig.password,
      environment: worldpayConfig.environment || 'sandbox',
      entity: worldpayConfig.entity || 'default'
    });

    if (body.action === 'test_connection') {
      try {
        // Test the connection
        const result = await worldpayService.testConnection();
        
        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Worldpay connection test successful' : result.error,
          result: result
        });
      } catch (error) {
        console.error('Worldpay connection test failed:', error);
        return NextResponse.json(
          { 
            error: 'Worldpay connection test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle payment processing
    if (body.action === 'process_payment') {
      try {
        const { amount, orderId, paymentMethod } = body;
        
        if (!amount || !orderId || !paymentMethod) {
          return NextResponse.json(
            { error: 'Missing required fields: amount, orderId, and paymentMethod are required' },
            { status: 400 }
          );
        }

        // Create payment request for Worldpay
        const paymentRequest: WorldpayPaymentRequest = {
          amount: parseFloat(amount.toString()),
          currency: 'USD',
          orderId: orderId.toString(),
          card: {
            number: paymentMethod.card.number,
            expiry_month: paymentMethod.card.exp_month.toString().padStart(2, '0'),
            expiry_year: paymentMethod.card.exp_year.toString(),
            cvv: paymentMethod.card.cvc,
            cardholder_name: paymentMethod.billing_details?.name || 'Unknown'
          },
          billing_address: paymentMethod.billing_details?.address ? {
            line1: paymentMethod.billing_details.address.line1,
            line2: paymentMethod.billing_details.address.line2,
            city: paymentMethod.billing_details.address.city,
            state: paymentMethod.billing_details.address.state,
            postal_code: paymentMethod.billing_details.address.postal_code,
            country: paymentMethod.billing_details.address.country
          } : undefined,
          description: `Order #${orderId}`
        };

        console.log('Processing Worldpay payment:', {
          orderId: paymentRequest.orderId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          cardLastFour: paymentRequest.card.number.slice(-4)
        });

        const result = await worldpayService.processPayment(paymentRequest);

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            id: result.paymentId,
            status: result.outcome,
            amount: result.amount,
            currency: result.currency,
            reference: result.transactionReference,
            auth_code: result.authorizationCode,
            command_id: result.commandId,
            card_brand: result.cardBrand,
            last_four: result.lastFour
          } : undefined,
          error: result.success ? undefined : result.error
        });
      } catch (error) {
        console.error('Worldpay payment processing failed:', error);
        return NextResponse.json(
          { 
            error: 'Payment processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle authorization (pre-auth)
    if (body.action === 'authorize_payment') {
      try {
        const { amount, orderId, paymentMethod } = body;
        
        if (!amount || !orderId || !paymentMethod) {
          return NextResponse.json(
            { error: 'Missing required fields: amount, orderId, and paymentMethod are required' },
            { status: 400 }
          );
        }

        const authRequest: WorldpayPaymentRequest = {
          amount: parseFloat(amount.toString()),
          currency: 'USD',
          orderId: orderId.toString(),
          card: {
            number: paymentMethod.card.number,
            expiry_month: paymentMethod.card.exp_month.toString().padStart(2, '0'),
            expiry_year: paymentMethod.card.exp_year.toString(),
            cvv: paymentMethod.card.cvc,
            cardholder_name: paymentMethod.billing_details?.name || 'Unknown'
          },
          description: `Order #${orderId} - Authorization`
        };

        const result = await worldpayService.authorize(authRequest);

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            id: result.paymentId,
            status: result.outcome,
            amount: result.amount,
            currency: result.currency,
            reference: result.transactionReference,
            auth_code: result.authorizationCode,
            command_id: result.commandId,
            card_brand: result.cardBrand,
            last_four: result.lastFour
          } : undefined,
          error: result.success ? undefined : result.error
        });
      } catch (error) {
        console.error('Worldpay authorization failed:', error);
        return NextResponse.json(
          { 
            error: 'Authorization failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle payment status query
    if (body.action === 'get_payment_status') {
      try {
        const { paymentId } = body;
        
        if (!paymentId) {
          return NextResponse.json(
            { error: 'Payment ID is required' },
            { status: 400 }
          );
        }

        const result = await worldpayService.getPaymentStatus(paymentId);

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            id: result.paymentId,
            status: result.outcome
          } : undefined,
          error: result.success ? undefined : result.error
        });
      } catch (error) {
        console.error('Worldpay status query failed:', error);
        return NextResponse.json(
          { 
            error: 'Status query failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle refund
    if (body.action === 'refund_payment') {
      try {
        const { paymentId, amount } = body;
        
        if (!paymentId) {
          return NextResponse.json(
            { error: 'Payment ID is required for refunds' },
            { status: 400 }
          );
        }

        const result = await worldpayService.refund(paymentId, amount);

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            id: result.paymentId,
            status: result.outcome,
            amount: result.amount,
            currency: result.currency
          } : undefined,
          error: result.success ? undefined : result.error
        });
      } catch (error) {
        console.error('Worldpay refund failed:', error);
        return NextResponse.json(
          { 
            error: 'Refund failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle other actions here
    return NextResponse.json(
      { error: 'Action not supported' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in Worldpay API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
