'use client';

import React, { useState } from 'react';
import { Save, CreditCard, Wallet, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import type { PaymentSettings } from '@/lib/types';
import { useAdmin } from '@/context/AdminContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function PaymentsPage() {
    const { tenantData, refreshTenantData } = useAdmin();
    const [settings, setSettings] = useState<PaymentSettings>(tenantData?.settings?.paymentSettings || {} as PaymentSettings);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        stripe: false,
        globalPayments: false,
        worldpay: false,
        cash: false,
        giftCards: false
    });
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [isTestingConnection, setIsTestingConnection] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    
    // Sync local state when context data changes
    React.useEffect(() => {
        if (tenantData?.settings?.paymentSettings) {
            setSettings(tenantData.settings.paymentSettings);
        }
    }, [tenantData?.settings?.paymentSettings]);

    // Get the currently active payment gateway
    const getActiveGateway = (): 'stripe' | 'globalPayments' | 'worldpay' | null => {
        if (settings.stripe?.enabled) return 'stripe';
        if (settings.globalPayments?.enabled) return 'globalPayments';
        if (settings.worldpay?.enabled) return 'worldpay';
        return null;
    };

    const activeGateway = getActiveGateway();

    // Helper function to check if a gateway is disabled
    const isGatewayDisabled = (gateway: string): boolean => {
        return activeGateway !== null && activeGateway !== gateway;
    };

    const handleSave = async () => {
        try {
            console.log('💾 Saving payment settings:', settings);

            // Prepare the settings with proper structure for Global Payments SDK
            const settingsToSave = {
                ...tenantData?.settings,
                paymentSettings: {
                    ...settings,
                    // Ensure Global Payments settings are properly structured for SDK
                    globalPayments: settings.globalPayments ? {
                        enabled: settings.globalPayments.enabled || false,
                        appId: settings.globalPayments.appId || '',
                        appKey: settings.globalPayments.appKey || '',
                        environment: settings.globalPayments.environment || 'sandbox',
                        merchantId: settings.globalPayments.merchantId || ''
                    } : {
                        enabled: false,
                        appId: '',
                        appKey: '',
                        environment: 'sandbox',
                        merchantId: ''
                    },
                    giftCards: settings.giftCards ? { enabled: !!settings.giftCards.enabled } : { enabled: false }
                }
            };

            const response = await fetch(`/api/tenant/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify(settingsToSave),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save settings');
            }

            await refreshTenantData();
            
            toast({
                title: "Payment Settings Saved",
                description: "Your payment gateway settings have been successfully updated.",
            });

            // Show specific message for Global Payments SDK activation
            if (settings.globalPayments?.enabled) {
                toast({
                    title: "🚀 Global Payments SDK Activated!",
                    description: "Global Payments is now active and will use the new SDK for secure payment processing.",
                });
            }

        } catch (error) {
            console.error('Error saving payment settings:', error);
            toast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "Failed to save payment settings. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handlePaymentSettingsChange = (
        provider: keyof PaymentSettings,
        field: string,
        value: string | boolean
    ) => {
        setSettings(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value,
            },
        }));
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleGatewayToggle = (gateway: 'stripe' | 'globalPayments' | 'worldpay', enabled: boolean) => {
        if (enabled && activeGateway && activeGateway !== gateway) {
            // Show warning that another gateway is active
            const activeGatewayName = activeGateway === 'stripe' ? 'Stripe' : 
                                    activeGateway === 'globalPayments' ? 'Global Payments' : 'Worldpay';
            const newGatewayName = gateway === 'stripe' ? 'Stripe' : 
                                 gateway === 'globalPayments' ? 'Global Payments' : 'Worldpay';
            
            toast({
                title: "Another Gateway Active",
                description: `Please disable ${activeGatewayName} first before enabling ${newGatewayName}.`,
                variant: "destructive",
            });
            return;
        }

        handlePaymentSettingsChange(gateway, 'enabled', enabled);
    };

    const testConnection = async (gateway: 'stripe' | 'globalPayments' | 'worldpay') => {
        // Check if gateway is enabled in current settings (not saved yet)
        const currentGatewaySettings = settings[gateway];
        if (!currentGatewaySettings?.enabled) {
            toast({
                title: "Gateway Not Enabled",
                description: "Please enable this payment gateway first.",
                variant: "destructive",
            });
            return;
        }

        // Save current settings first before testing
        await handleSave();

        setIsTestingConnection(prev => ({ ...prev, [gateway]: true }));
        setTestResults(prev => ({ ...prev, [gateway]: null }));

        try {
            let response;
            
            if (gateway === 'globalPayments') {
                // Use the new SDK API route for Global Payments
                console.log('🔧 Testing Global Payments connection with tenant ID:', tenantData?.id);
                response = await fetch(`/api/payments/global-payments-sdk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        action: 'test-connection',
                        tenantId: tenantData?.id
                    }),
                });
            } else {
                // Use existing API routes for other gateways
                const gatewayPath = gateway === 'stripe' ? 'stripe' : 'worldpay';
                response = await fetch(`/api/tenant/${window.location.pathname.split('/')[1]}/payments/${gatewayPath}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ action: 'test_connection' }),
                });
            }

            const result = await response.json();
            setTestResults(prev => ({ ...prev, [gateway]: result }));

            const gatewayName = gateway === 'stripe' ? 'Stripe' : 
                              gateway === 'globalPayments' ? 'Global Payments' : 'Worldpay';

            if (result.success) {
                toast({
                    title: "Connection Successful",
                    description: `${gatewayName} connection test passed.`,
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: result.error || "Connection test failed",
                    variant: "destructive",
                });
            }
        } catch (error) {
            const errorResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            setTestResults(prev => ({ ...prev, [gateway]: errorResult }));
            toast({
                title: "Test Failed",
                description: "Failed to test connection",
                variant: "destructive",
            });
        } finally {
            setIsTestingConnection(prev => ({ ...prev, [gateway]: false }));
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Payment Settings
                        </CardTitle>
                        <CardDescription>
                            Manage payment gateways and API connections. Only one payment gateway can be active at a time.
                        </CardDescription>
                    </div>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Active Gateway Status */}
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
                        <div className="flex items-center gap-2">
                            {activeGateway ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-green-700">
                                        {activeGateway === 'stripe' ? 'Stripe' : 
                                         activeGateway === 'globalPayments' ? 'Global Payments' : 'Worldpay'} is active
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                    <span className="text-yellow-700">No payment gateway active</span>
                                </>
                            )}
                        </div>
                        {settings.cash?.enabled && (
                            <div className="flex items-center gap-2 mt-2">
                                <Wallet className="h-4 w-4 text-blue-500" />
                                <span className="text-blue-700">Cash payments enabled</span>
                            </div>
                        )}
                    </div>

                    {/* Stripe Payment Gateway */}
                    <div className={cn(
                        "border rounded-lg overflow-hidden transition-all duration-200",
                        activeGateway === 'stripe' ? "border-green-500 bg-green-50" : 
                        isGatewayDisabled('stripe') ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200"
                    )}>
                        <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection('stripe')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className={cn(
                                        "h-6 w-6",
                                        activeGateway === 'stripe' ? "text-green-600" : 
                                        isGatewayDisabled('stripe') ? "text-gray-400" : "text-blue-600"
                                    )} />
                                    <div>
                                        <h3 className={cn(
                                            "font-semibold",
                                            activeGateway === 'stripe' ? "text-green-800" : 
                                            isGatewayDisabled('stripe') ? "text-gray-400" : "text-gray-900"
                                        )}>
                                            Stripe Payment Gateway
                                        </h3>
                                        <p className={cn(
                                            "text-sm",
                                            activeGateway === 'stripe' ? "text-green-600" : 
                                            isGatewayDisabled('stripe') ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            Accept credit cards and digital payments
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={settings.stripe?.enabled || false}
                                        onCheckedChange={(checked) => handleGatewayToggle('stripe', checked)}
                                        disabled={isGatewayDisabled('stripe')}
                                    />
                                    {expandedSections.stripe ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {expandedSections.stripe && (
                            <div className="border-t p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="stripe-publishable-key">Publishable Key</Label>
                                        <Input
                                            id="stripe-publishable-key"
                                            value={settings.stripe?.publishableKey || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('stripe', 'publishableKey', e.target.value)
                                            }
                                            placeholder="pk_test_..."
                                            disabled={isGatewayDisabled('stripe')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="stripe-secret-key">Secret Key</Label>
                                        <Input
                                            id="stripe-secret-key"
                                            type="password"
                                            value={settings.stripe?.secretKey || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('stripe', 'secretKey', e.target.value)
                                            }
                                            placeholder="sk_test_..."
                                            disabled={isGatewayDisabled('stripe')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="stripe-webhook-secret">Webhook Secret</Label>
                                    <Input
                                        id="stripe-webhook-secret"
                                        value={settings.stripe?.webhookSecret || ''}
                                        onChange={(e) => 
                                            handlePaymentSettingsChange('stripe', 'webhookSecret', e.target.value)
                                        }
                                        placeholder="whsec_..."
                                        disabled={isGatewayDisabled('stripe')}
                                    />
                                </div>
                                
                                {/* Test Connection Button */}
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => testConnection('stripe')}
                                        disabled={isTestingConnection.stripe || !settings.stripe?.publishableKey || !settings.stripe?.secretKey}
                                    >
                                        {isTestingConnection.stripe ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    {testResults.stripe && (
                                        <Alert className={cn(
                                            "flex-1",
                                            testResults.stripe.success ? "border-green-500" : "border-red-500"
                                        )}>
                                            <AlertDescription>
                                                {testResults.stripe.success ? 
                                                    "Connection successful!" : 
                                                    `Error: ${testResults.stripe.error}`
                                                }
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Global Payments Gateway */}
                    <div className={cn(
                        "border rounded-lg overflow-hidden transition-all duration-200",
                        activeGateway === 'globalPayments' ? "border-green-500 bg-green-50" : 
                        isGatewayDisabled('globalPayments') ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200"
                    )}>
                        <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection('globalPayments')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className={cn(
                                        "h-6 w-6",
                                        activeGateway === 'globalPayments' ? "text-green-600" : 
                                        isGatewayDisabled('globalPayments') ? "text-gray-400" : "text-orange-600"
                                    )} />
                                    <div>
                                        <h3 className={cn(
                                            "font-semibold",
                                            activeGateway === 'globalPayments' ? "text-green-800" : 
                                            isGatewayDisabled('globalPayments') ? "text-gray-400" : "text-gray-900"
                                        )}>
                                            Global Payments Gateway
                                        </h3>
                                        <p className={cn(
                                            "text-sm",
                                            activeGateway === 'globalPayments' ? "text-green-600" : 
                                            isGatewayDisabled('globalPayments') ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            Accept payments through Global Payments
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={settings.globalPayments?.enabled || false}
                                        onCheckedChange={(checked) => handleGatewayToggle('globalPayments', checked)}
                                        disabled={isGatewayDisabled('globalPayments')}
                                    />
                                    {expandedSections.globalPayments ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {expandedSections.globalPayments && (
                            <div className="border-t p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="gp-app-id">Application ID</Label>
                                        <Input
                                            id="gp-app-id"
                                            value={settings.globalPayments?.appId || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('globalPayments', 'appId', e.target.value)
                                            }
                                            placeholder="Your Application ID"
                                            disabled={isGatewayDisabled('globalPayments')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="gp-app-key">Application Key</Label>
                                        <Input
                                            id="gp-app-key"
                                            type="password"
                                            value={settings.globalPayments?.appKey || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('globalPayments', 'appKey', e.target.value)
                                            }
                                            placeholder="Your Application Key"
                                            disabled={isGatewayDisabled('globalPayments')}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="gp-environment">Environment</Label>
                                        <Select
                                            value={settings.globalPayments?.environment || 'sandbox'}
                                            onValueChange={(value) => 
                                                handlePaymentSettingsChange('globalPayments', 'environment', value)
                                            }
                                            disabled={isGatewayDisabled('globalPayments')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sandbox">Sandbox</SelectItem>
                                                <SelectItem value="production">Production</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="gp-merchant-id">Merchant ID</Label>
                                        <Input
                                            id="gp-merchant-id"
                                            value={settings.globalPayments?.merchantId || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('globalPayments', 'merchantId', e.target.value)
                                            }
                                            placeholder="Your Merchant ID"
                                            disabled={isGatewayDisabled('globalPayments')}
                                        />
                                    </div>
                                </div>
                                
                                {/* Test Connection Button */}
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => testConnection('globalPayments')}
                                        disabled={isTestingConnection.globalPayments || !settings.globalPayments?.appId || !settings.globalPayments?.appKey}
                                    >
                                        {isTestingConnection.globalPayments ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    {testResults.globalPayments && (
                                        <Alert className={cn(
                                            "flex-1",
                                            testResults.globalPayments.success ? "border-green-500" : "border-red-500"
                                        )}>
                                            <AlertDescription>
                                                {testResults.globalPayments.success ? 
                                                    "Connection successful!" : 
                                                    `Error: ${testResults.globalPayments.error}`
                                                }
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Worldpay Payment Gateway */}
                    <div className={cn(
                        "border rounded-lg overflow-hidden transition-all duration-200",
                        activeGateway === 'worldpay' ? "border-green-500 bg-green-50" : 
                        isGatewayDisabled('worldpay') ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200"
                    )}>
                        <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection('worldpay')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className={cn(
                                        "h-6 w-6",
                                        activeGateway === 'worldpay' ? "text-green-600" : 
                                        isGatewayDisabled('worldpay') ? "text-gray-400" : "text-purple-600"
                                    )} />
                                    <div>
                                        <h3 className={cn(
                                            "font-semibold",
                                            activeGateway === 'worldpay' ? "text-green-800" : 
                                            isGatewayDisabled('worldpay') ? "text-gray-400" : "text-gray-900"
                                        )}>
                                            Worldpay Gateway
                                        </h3>
                                        <p className={cn(
                                            "text-sm",
                                            activeGateway === 'worldpay' ? "text-green-600" : 
                                            isGatewayDisabled('worldpay') ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            Accept payments through Worldpay Access
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={settings.worldpay?.enabled || false}
                                        onCheckedChange={(checked) => handleGatewayToggle('worldpay', checked)}
                                        disabled={isGatewayDisabled('worldpay')}
                                    />
                                    {expandedSections.worldpay ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {expandedSections.worldpay && (
                            <div className="border-t p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="worldpay-username">Username</Label>
                                        <Input
                                            id="worldpay-username"
                                            value={settings.worldpay?.username || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('worldpay', 'username', e.target.value)
                                            }
                                            placeholder="Your Worldpay Username"
                                            disabled={isGatewayDisabled('worldpay')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="worldpay-password">Password</Label>
                                        <Input
                                            id="worldpay-password"
                                            type="password"
                                            value={settings.worldpay?.password || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('worldpay', 'password', e.target.value)
                                            }
                                            placeholder="Your Worldpay Password"
                                            disabled={isGatewayDisabled('worldpay')}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="worldpay-environment">Environment</Label>
                                        <Select
                                            value={settings.worldpay?.environment || 'sandbox'}
                                            onValueChange={(value) => 
                                                handlePaymentSettingsChange('worldpay', 'environment', value)
                                            }
                                            disabled={isGatewayDisabled('worldpay')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sandbox">Sandbox</SelectItem>
                                                <SelectItem value="production">Production</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="worldpay-merchant-id">Merchant ID</Label>
                                        <Input
                                            id="worldpay-merchant-id"
                                            value={settings.worldpay?.merchantId || ''}
                                            onChange={(e) => 
                                                handlePaymentSettingsChange('worldpay', 'merchantId', e.target.value)
                                            }
                                            placeholder="Your Merchant ID"
                                            disabled={isGatewayDisabled('worldpay')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="worldpay-entity">Entity</Label>
                                    <Input
                                        id="worldpay-entity"
                                        value={settings.worldpay?.entity || ''}
                                        onChange={(e) => 
                                            handlePaymentSettingsChange('worldpay', 'entity', e.target.value)
                                        }
                                        placeholder="default"
                                        disabled={isGatewayDisabled('worldpay')}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Leave empty to use "default" entity
                                    </p>
                                </div>
                                
                                {/* Test Connection Button */}
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => testConnection('worldpay')}
                                        disabled={isTestingConnection.worldpay || !settings.worldpay?.username || !settings.worldpay?.password}
                                    >
                                        {isTestingConnection.worldpay ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    {testResults.worldpay && (
                                        <Alert className={cn(
                                            "flex-1",
                                            testResults.worldpay.success ? "border-green-500" : "border-red-500"
                                        )}>
                                            <AlertDescription>
                                                {testResults.worldpay.success ? 
                                                    "Connection successful!" : 
                                                    `Error: ${testResults.worldpay.error}`
                                                }
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cash Payments */}
                    <div className={cn(
                        "border rounded-lg overflow-hidden transition-all duration-200",
                        settings.cash?.enabled ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}>
                        <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection('cash')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Wallet className={cn(
                                        "h-6 w-6",
                                        settings.cash?.enabled ? "text-blue-600" : "text-gray-600"
                                    )} />
                                    <div>
                                        <h3 className={cn(
                                            "font-semibold",
                                            settings.cash?.enabled ? "text-blue-800" : "text-gray-900"
                                        )}>
                                            Cash Payments
                                        </h3>
                                        <p className={cn(
                                            "text-sm",
                                            settings.cash?.enabled ? "text-blue-600" : "text-gray-500"
                                        )}>
                                            Accept cash payments at pickup/delivery
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={settings.cash?.enabled || false}
                                        onCheckedChange={(checked) => 
                                            handlePaymentSettingsChange('cash', 'enabled', checked)
                                        }
                                    />
                                    {expandedSections.cash ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {expandedSections.cash && (
                            <div className="border-t p-4">
                                <div className="text-sm text-gray-600">
                                    <p>
                                        When enabled, customers can choose to pay with cash at pickup or delivery.
                                        This option works alongside your selected payment gateway.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Gift Cards */}
                    <div className={cn(
                        "border rounded-lg overflow-hidden transition-all duration-200",
                        settings.giftCards?.enabled ? "border-emerald-500 bg-emerald-50" : "border-gray-200"
                    )}>
                        <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection('giftCards')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Wallet className={cn(
                                        "h-6 w-6",
                                        settings.giftCards?.enabled ? "text-emerald-600" : "text-gray-600"
                                    )} />
                                    <div>
                                        <h3 className={cn(
                                            "font-semibold",
                                            settings.giftCards?.enabled ? "text-emerald-800" : "text-gray-900"
                                        )}>
                                            Gift Cards
                                        </h3>
                                        <p className={cn(
                                            "text-sm",
                                            settings.giftCards?.enabled ? "text-emerald-700" : "text-gray-500"
                                        )}>
                                            Allow customers to pay using gift cards
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={settings.giftCards?.enabled || false}
                                        onCheckedChange={(checked) => 
                                            handlePaymentSettingsChange('giftCards' as any, 'enabled', checked)
                                        }
                                    />
                                    {expandedSections.giftCards ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {expandedSections.giftCards && (
                            <div className="border-t p-4">
                                <div className="text-sm text-gray-600">
                                    <p>
                                        When enabled, a Gift Card option appears at checkout. Customers must enter
                                        a valid gift card code with sufficient balance to complete payment.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
