import { NextRequest, NextResponse } from 'next/server';
import { getDemoRestaurantSettings } from '@/lib/demo-settings';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        
        if (tenant === 'demo') {
            const demoSettings = getDemoRestaurantSettings();
            const paymentSettings = demoSettings.paymentSettings;

            let activeGateway = null; // No default gateway
            let isConfigured = false;

            // Determine active gateway based on enabled settings - NO DEFAULT
            if (paymentSettings.globalPayments?.enabled) {
                activeGateway = 'global_payments';
                isConfigured = true;
            } else if (paymentSettings.worldpay?.enabled) {
                activeGateway = 'worldpay';
                isConfigured = true;
            } else if (paymentSettings.stripe?.enabled) {
                activeGateway = 'stripe';
                isConfigured = true;
            }

            // Simulate frontend logic
            const isCardPaymentEnabled = isConfigured && activeGateway;
            const availablePaymentMethods = [];
            
            if (paymentSettings.cash?.enabled) {
                availablePaymentMethods.push('cash');
            }
            
            if (isCardPaymentEnabled) {
                availablePaymentMethods.push('card');
            }

            return NextResponse.json({
                tenant: tenant,
                timestamp: new Date().toISOString(),
                paymentSettings: paymentSettings,
                paymentConfig: {
                    configured: isConfigured,
                    activeGateway: activeGateway
                },
                frontend_simulation: {
                    isCardPaymentEnabled: isCardPaymentEnabled,
                    availablePaymentMethods: availablePaymentMethods
                },
                summary: {
                    cash_enabled: paymentSettings.cash?.enabled,
                    stripe_enabled: paymentSettings.stripe?.enabled,
                    global_payments_enabled: paymentSettings.globalPayments?.enabled,
                    worldpay_enabled: paymentSettings.worldpay?.enabled,
                    any_card_gateway_enabled: isConfigured,
                    payment_methods_available: availablePaymentMethods,
                    expected_behavior: availablePaymentMethods.length === 1 && availablePaymentMethods.includes('cash') ? 
                        'ONLY_CASH_PAYMENT' : 
                        availablePaymentMethods.length === 0 ? 
                        'NO_PAYMENT_METHODS' : 
                        'MULTIPLE_METHODS'
                }
            });
        }

        return NextResponse.json({ error: 'Only demo tenant supported' }, { status: 400 });
    } catch (error) {
        console.error('Debug status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
