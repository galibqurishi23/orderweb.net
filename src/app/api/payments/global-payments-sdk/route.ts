import { NextRequest, NextResponse } from 'next/server';
import { createGlobalPaymentsSDKService } from '@/lib/global-payments-sdk-service';
import db from '@/lib/db';

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    const { action, tenantId, ...params } = await request.json();
    
    console.log('🔧 Global Payments SDK API called with:', { action, tenantId, params });

    if (!tenantId) {
      console.error('❌ No tenant ID provided in request');
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant's payment settings
    const [rows]: any[] = await db.execute(
      'SELECT global_payments_app_id, global_payments_app_key, global_payments_environment FROM tenant_settings WHERE tenant_id = ?',
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].global_payments_app_id) {
      return NextResponse.json(
        { error: 'Global Payments not configured for this tenant' },
        { status: 400 }
      );
    }

    const settings = rows[0];
    
    // Create SDK service instance
    const paymentService = createGlobalPaymentsSDKService({
      appId: settings.global_payments_app_id,
      appKey: settings.global_payments_app_key,
      environment: settings.global_payments_environment || 'sandbox'
    });

    // Handle different actions
    switch (action) {
      case 'test-connection':
        try {
          const testResult = await paymentService.testConnection();
          console.log('✅ Test connection result:', testResult);
          return NextResponse.json(testResult);
        } catch (error) {
          console.error('❌ Test connection failed:', error);
          
          // Ensure we always return a proper error message
          let errorMessage = 'Test connection failed';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          return NextResponse.json(
            { 
              success: false, 
              message: errorMessage,
              error: errorMessage
            },
            { status: 200 } // Return 200 but with error in body
          );
        }

      case 'process-payment':
        const { paymentRequest, cardData } = params;
        if (!paymentRequest || !cardData) {
          return NextResponse.json(
            { error: 'Payment request and card data are required' },
            { status: 400 }
          );
        }

        const paymentResult = await paymentService.processCardPayment(paymentRequest, cardData);
        return NextResponse.json(paymentResult);

      case 'verify-transaction':
        const { transactionId } = params;
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID is required' },
            { status: 400 }
          );
        }

        const verificationResult = await paymentService.verifyTransaction(transactionId);
        return NextResponse.json(verificationResult);

      case 'refund-transaction':
        const { transactionId: refundTxId, amount } = params;
        if (!refundTxId) {
          return NextResponse.json(
            { error: 'Transaction ID is required' },
            { status: 400 }
          );
        }

        const refundResult = await paymentService.refundTransaction(refundTxId, amount);
        return NextResponse.json(refundResult);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Global Payments SDK API error:', error);
    return NextResponse.json(
      { 
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for configuration testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant's payment settings
    const [rows]: any[] = await db.execute(
      'SELECT global_payments_app_id, global_payments_environment FROM tenant_settings WHERE tenant_id = ?',
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].global_payments_app_id) {
      return NextResponse.json({
        configured: false,
        message: 'Global Payments not configured for this tenant'
      });
    }

    return NextResponse.json({
      configured: true,
      environment: rows[0].global_payments_environment || 'sandbox',
      appId: rows[0].global_payments_app_id ? 'configured' : 'not configured'
    });

  } catch (error) {
    console.error('Global Payments SDK config check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
