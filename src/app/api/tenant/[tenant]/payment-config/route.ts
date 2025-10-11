import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getDemoRestaurantSettings } from '@/lib/demo-settings';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;

        // Use file-based settings for 'restaurant' or 'demo' tenant 
        if (tenant === 'restaurant' || tenant === 'demo') {
            const demoSettings = getDemoRestaurantSettings();
            const paymentSettings = demoSettings.paymentSettings;

            let activeGateway = null; // No default - only set when actually enabled
            let gatewayName = 'Payment System';
            let isConfigured = false;

            // Determine active gateway based on enabled settings - NO DEFAULT
            if (paymentSettings.globalPayments?.enabled) {
                activeGateway = 'global_payments';
                gatewayName = 'Global Payments';
                isConfigured = true;
            } else if (paymentSettings.worldpay?.enabled) {
                activeGateway = 'worldpay';
                gatewayName = 'Worldpay';
                isConfigured = true;
            } else if (paymentSettings.stripe?.enabled) {
                activeGateway = 'stripe';
                gatewayName = 'Stripe';
                isConfigured = true;
            }

            console.log(`🎯 Demo payment config - Active gateway: ${activeGateway}, Gateway name: ${gatewayName}, Configured: ${isConfigured}`);

            return NextResponse.json({
                configured: isConfigured,
                activeGateway: activeGateway,
                gatewayName: gatewayName,
                stripeMode: 'test',
                globalPaymentsEnvironment: paymentSettings.globalPayments?.environment || 'sandbox'
            });
        }

        // Original database-based logic for other tenants
        // First, get the tenant ID from the slug
        const [tenantRows] = await db.execute(
            'SELECT id FROM tenants WHERE slug = ?',
            [tenant]
        );

        if (!tenantRows || (tenantRows as any[]).length === 0) {
            return NextResponse.json({
                configured: false,
                activeGateway: null,
                error: 'Tenant not found'
            });
        }

        const tenantId = (tenantRows as any[])[0].id;

        // Get tenant's payment configuration
        const [rows] = await db.execute(
            'SELECT active_payment_gateway, stripe_publishable_key, stripe_secret_key, stripe_mode, global_payments_app_id, global_payments_app_key, global_payments_environment FROM tenant_settings WHERE tenant_id = ?',
            [tenantId]
        );

        const settings = (rows as any[])[0];
        
        if (!settings) {
            return NextResponse.json({
                configured: false,
                activeGateway: null,
                error: 'Tenant not found'
            });
        }

        const activeGateway = settings.active_payment_gateway || null; // No default gateway
        
        // Check if the active gateway is properly configured
        let isConfigured = false;
        let gatewayName = 'Payment System';
        
        if (activeGateway === 'stripe') {
            isConfigured = !!(settings.stripe_publishable_key && settings.stripe_secret_key);
            gatewayName = 'Stripe';
        } else if (activeGateway === 'global_payments') {
            isConfigured = !!(settings.global_payments_app_id && settings.global_payments_app_key);
            gatewayName = 'Global Payments';
        } else if (activeGateway === 'worldpay') {
            isConfigured = !!(settings.worldpay_installation_id && settings.worldpay_account_id);
            gatewayName = 'Worldpay';
        } else if (activeGateway === 'paypal') {
            isConfigured = !!(settings.paypal_client_id && settings.paypal_client_secret);
            gatewayName = 'PayPal';
        }

        return NextResponse.json({
            configured: isConfigured,
            activeGateway: activeGateway,
            gatewayName: gatewayName,
            stripeMode: settings.stripe_mode || 'test',
            globalPaymentsEnvironment: settings.global_payments_environment || 'sandbox'
        });

    } catch (error) {
        console.error('Error fetching payment configuration:', error);
        return NextResponse.json(
            { 
                configured: false,
                activeGateway: null,
                error: 'Failed to fetch payment configuration'
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        const body = await request.json();
        const { activeGateway } = body;

        if (!activeGateway || !['stripe', 'global_payments'].includes(activeGateway)) {
            return NextResponse.json(
                { error: 'Invalid payment gateway. Must be "stripe" or "global_payments"' },
                { status: 400 }
            );
        }

        // First, get the tenant ID from the slug
        const [tenantRows] = await db.execute(
            'SELECT id FROM tenants WHERE slug = ?',
            [tenant]
        );

        if (!tenantRows || (tenantRows as any[]).length === 0) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }

        const tenantId = (tenantRows as any[])[0].id;

        // Update tenant's active payment gateway
        await db.execute(
            'UPDATE tenant_settings SET active_payment_gateway = ? WHERE tenant_id = ?',
            [activeGateway, tenantId]
        );

        return NextResponse.json({
            success: true,
            message: `Payment gateway updated to ${activeGateway}`
        });

    } catch (error) {
        console.error('Error updating payment gateway:', error);
        return NextResponse.json(
            { error: 'Failed to update payment gateway' },
            { status: 500 }
        );
    }
}
