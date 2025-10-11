import { NextRequest, NextResponse } from 'next/server';
import { getTenantSettingsBySlug } from '@/lib/tenant-service';
import { createGlobalPaymentsService } from '@/lib/global-payments-rest-service';

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

    // Check if Global Payments is enabled
    const gpConfig = tenantSettings.paymentSettings?.globalPayments;
    if (!gpConfig?.enabled) {
      return NextResponse.json(
        { error: 'Global Payments not enabled' },
        { status: 400 }
      );
    }

    if (!gpConfig.appId || !gpConfig.appKey) {
      return NextResponse.json(
        { error: 'Global Payments not configured properly. Missing application ID or API key.' },
        { status: 400 }
      );
    }

    // Return configuration status
    return NextResponse.json({
      enabled: gpConfig.enabled,
      configured: true,
      merchantId: gpConfig.appId.substring(0, 8) + '...' // Partial for security
    });

  } catch (error) {
    console.error('Error fetching Global Payments configuration:', error);
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

    // Check if Global Payments is enabled
    const gpConfig = tenantSettings.paymentSettings?.globalPayments;
    if (!gpConfig?.enabled) {
      return NextResponse.json(
        { error: 'Global Payments not enabled' },
        { status: 400 }
      );
    }

    if (!gpConfig.appId || !gpConfig.appKey) {
      return NextResponse.json(
        { error: 'Global Payments not configured properly. Missing application ID or API key.' },
        { status: 400 }
      );
    }

    // Create Global Payments service instance with corrected credential mapping
    const globalPaymentsService = createGlobalPaymentsService({
      appId: gpConfig.appId,
      appKey: gpConfig.appKey,
      environment: gpConfig.environment || 'sandbox'
    });

    if (body.action === 'test_connection') {
      try {
        // Test the connection by attempting to get an access token
        const result = await globalPaymentsService.testConnection();
        
        return NextResponse.json({
          success: true,
          message: 'Global Payments connection test successful',
          result: result
        });
      } catch (error) {
        console.error('Global Payments connection test failed:', error);
        return NextResponse.json(
          { 
            error: 'Global Payments connection test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    }

    // Handle payment processing
    if (body.action === 'process_payment') {
      try {
        console.log('🔄 Global Payments processing request:', {
          action: body.action,
          amount: body.amount,
          orderId: body.orderId,
          hasPaymentMethod: !!body.paymentMethod
        });
        
        const { amount, orderId, paymentMethod } = body;
        
        if (!amount || !orderId || !paymentMethod) {
          console.error('❌ Missing required fields:', { amount, orderId, paymentMethod });
          return NextResponse.json(
            { error: 'Missing required fields: amount, orderId, and paymentMethod are required' },
            { status: 400 }
          );
        }

        // Create payment request for Global Payments
        const paymentRequest = {
          amount: amount, // Keep as decimal, service will convert to cents
          currency: 'GBP', // Change from USD to GBP for UK
          reference: orderId,
          card: {
            number: paymentMethod.card.number,
            expiry_month: paymentMethod.card.exp_month,
            expiry_year: paymentMethod.card.exp_year,
            cvv: paymentMethod.card.cvc,
            cardholder_name: paymentMethod.billing_details?.name || 'Unknown'
          },
          billing_address: paymentMethod.billing_details?.address ? {
            line_1: paymentMethod.billing_details.address.line1,
            line_2: paymentMethod.billing_details.address.line2,
            city: paymentMethod.billing_details.address.city,
            state: paymentMethod.billing_details.address.state,
            postal_code: paymentMethod.billing_details.address.postal_code,
            country: paymentMethod.billing_details.address.country
          } : undefined,
          description: `Order #${orderId}`
        };

        console.log('💳 Sending payment request to Global Payments:', {
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          reference: paymentRequest.reference,
          cardLastFour: paymentRequest.card.number.slice(-4),
          cardholderName: paymentRequest.card.cardholder_name
        });

        const result = await globalPaymentsService.charge(paymentRequest);

        console.log('🏦 Global Payments response:', {
          success: result.success,
          status: result.status,
          error: result.error,
          message: result.message
        });

        return NextResponse.json({
          success: result.success,
          data: result.success ? {
            id: result.id,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            reference: result.reference,
            auth_code: result.auth_code
          } : undefined,
          error: result.success ? undefined : result.error,
          message: result.message
        });
      } catch (error) {
        console.error('❌ Global Payments processing failed:', error);
        return NextResponse.json(
          { 
            error: 'Payment processing failed',
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
    console.error('Error in Global Payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
