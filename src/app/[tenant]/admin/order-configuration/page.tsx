'use client';

import React, { useState, useEffect } from 'react';
import { Save, Clock, Settings, AlertCircle, Calendar, Timer, Users } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import type { RestaurantSettings, OrderThrottlingSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
];

export default function OrderConfigurationPage() {
    const { tenantData, refreshTenantData } = useAdmin();
    const { toast } = useToast();
    
    // Use any to avoid complex typing issues for now
    const [settings, setSettings] = useState<any>({
        orderTypeSettings: {
            collectionEnabled: true,
            deliveryEnabled: true,
            advanceOrderEnabled: true
        },
        collectionTimeSettings: {
            collectionTimeMinutes: 45,
            enabled: true,
            displayMessage: 'Your order will be ready for collection in {time} minutes'
        },
        deliveryTimeSettings: {
            deliveryTimeMinutes: 60,
            enabled: true,
            displayMessage: 'Your order will be delivered in {time} minutes'
        },
        advanceOrderSettings: {
            maxDaysInAdvance: 60,
            minHoursNotice: 4,
            enableTimeSlots: true,
            timeSlotInterval: 30,
            autoAccept: true,
            sendReminders: true
        }
    });
    
    const [throttlingSettings, setThrottlingSettings] = useState<any>({});

    useEffect(() => {
        if (tenantData?.settings) {
            console.log('🔄 Loading settings from tenantData:', tenantData.settings);
            
            // Merge existing settings with defaults to ensure all required fields exist
            setSettings((prev: any) => {
                const newSettings = {
                    ...prev,
                    ...tenantData.settings,
                    orderTypeSettings: {
                        collectionEnabled: true,
                        deliveryEnabled: true,
                        advanceOrderEnabled: true,
                        ...tenantData.settings.orderTypeSettings
                    },
                    collectionTimeSettings: {
                        collectionTimeMinutes: 45,
                        enabled: true,
                        displayMessage: 'Your order will be ready for collection in {time} minutes',
                        ...tenantData.settings.collectionTimeSettings
                    },
                    deliveryTimeSettings: {
                        deliveryTimeMinutes: 60,
                        enabled: true,
                        displayMessage: 'Your order will be delivered in {time} minutes',
                        ...tenantData.settings.deliveryTimeSettings
                    },
                    advanceOrderSettings: {
                        maxDaysInAdvance: 60,
                        minHoursNotice: 4,
                        enableTimeSlots: true,
                        timeSlotInterval: 30,
                        autoAccept: true,
                        sendReminders: true,
                        ...tenantData.settings.advanceOrderSettings
                    }
                };
                
                console.log('📝 Updated settings state:', newSettings);
                return newSettings;
            });
            setThrottlingSettings(tenantData.settings.orderThrottling || {});
        }
    }, [tenantData?.settings]);

    const handleSave = async () => {
        try {
            console.log('💾 Saving settings...');
            console.log('Current settings state:', settings);
            console.log('Delivery time minutes:', settings.deliveryTimeSettings?.deliveryTimeMinutes);
            console.log('Throttling settings:', throttlingSettings);
            console.log('Tenant ID:', tenantData?.id);
            
            if (!tenantData?.id) {
                throw new Error('Tenant ID is required');
            }

            // Merge the current order configuration settings with existing tenant settings
            const payload = {
                ...tenantData.settings, // Preserve all existing settings
                ...settings, // Override with our new settings
                orderThrottling: throttlingSettings
            };

            console.log('🚀 Payload being sent:', payload);
            console.log('🎯 Delivery settings in payload:', payload.deliveryTimeSettings);

            const response = await fetch(`/api/tenant/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify(payload),
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ Error response:', errorData);
                throw new Error(`Failed to save settings: ${response.status} ${errorData}`);
            }

            console.log('🔄 Refreshing tenant data...');
            await refreshTenantData();
            
            toast({
                title: "Order Configuration Saved",
                description: "All order settings have been updated successfully.",
            });
        } catch (error) {
            console.error('❌ Error saving order configuration:', error);
            toast({
                title: "Error",
                description: "Failed to save order configuration. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleOrderTypeChange = (field: string, value: boolean) => {
        setSettings((prev: any) => ({
            ...prev,
            orderTypeSettings: {
                ...prev.orderTypeSettings,
                [field]: value
            }
        }));
    };

    const handleCollectionTimeChange = (field: string, value: any) => {
        setSettings((prev: any) => ({
            ...prev,
            collectionTimeSettings: {
                ...prev.collectionTimeSettings,
                [field]: value
            }
        }));
    };

    const handleDeliveryTimeChange = (field: string, value: any) => {
        console.log(`🚀 Delivery time change: ${field} = ${value}`);
        
        setSettings((prev: any) => {
            const newSettings = {
                ...prev,
                deliveryTimeSettings: {
                    ...prev.deliveryTimeSettings,
                    [field]: value
                }
            };
            
            console.log('📝 New delivery settings:', newSettings.deliveryTimeSettings);
            return newSettings;
        });
    };

    const handleThrottlingChange = (day: string, field: string, value: any) => {
        setThrottlingSettings((prev: any) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Settings className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-slate-900">Order Configuration</h1>
                                <p className="text-slate-600 mt-1">
                                    Configure order types, timing, capacity, and advance order settings
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                            <Save className="w-4 h-4 mr-2" />
                            Save All Changes
                        </Button>
                    </div>
                </div>

                {/* Information Alert */}
                <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                        This centralized configuration controls all order-related settings including types, timing, capacity limits, and advance booking options.
                    </AlertDescription>
                </Alert>

                {/* Order Types Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Order Types & Availability
                        </CardTitle>
                        <CardDescription>
                            Enable or disable different order types for your restaurant
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div>
                                    <Label className="font-medium text-base">Collection Orders</Label>
                                    <p className="text-sm text-slate-600">Customer pickup orders</p>
                                </div>
                                <Switch
                                    checked={settings.orderTypeSettings?.collectionEnabled ?? true}
                                    onCheckedChange={(checked) => handleOrderTypeChange('collectionEnabled', checked)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div>
                                    <Label className="font-medium text-base">Delivery Orders</Label>
                                    <p className="text-sm text-slate-600">Home delivery service</p>
                                </div>
                                <Switch
                                    checked={settings.orderTypeSettings?.deliveryEnabled ?? true}
                                    onCheckedChange={(checked) => handleOrderTypeChange('deliveryEnabled', checked)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div>
                                    <Label className="font-medium text-base">Advance Orders</Label>
                                    <p className="text-sm text-slate-600">Scheduled future orders</p>
                                </div>
                                <Switch
                                    checked={settings.orderTypeSettings?.advanceOrderEnabled ?? true}
                                    onCheckedChange={(checked) => handleOrderTypeChange('advanceOrderEnabled', checked)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Timing Settings */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Collection Time Settings */}
                    {settings.orderTypeSettings?.collectionEnabled && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Timer className="w-5 h-5" />
                                    Collection Timing
                                </CardTitle>
                                <CardDescription>
                                    Configure timing settings for customer collection orders
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base font-medium">Enable Collection Time Display</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Show collection time message to customers
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.collectionTimeSettings?.enabled ?? true}
                                        onCheckedChange={(checked) => handleCollectionTimeChange('enabled', checked)}
                                    />
                                </div>

                                {settings.collectionTimeSettings?.enabled && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="collectionTime">Default Collection Time (minutes)</Label>
                                                <Input
                                                    id="collectionTime"
                                                    type="number"
                                                    min="5"
                                                    max="120"
                                                    value={settings.collectionTimeSettings?.collectionTimeMinutes || 30}
                                                    onChange={(e) => handleCollectionTimeChange('collectionTimeMinutes', parseInt(e.target.value) || 30)}
                                                    className="mt-2 w-32"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Time in minutes customers should wait before collecting their order
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor="collectionMessage">Collection Message Template</Label>
                                                <Textarea
                                                    id="collectionMessage"
                                                    value={settings.collectionTimeSettings?.displayMessage || "Your order will be ready for collection in {time} minutes"}
                                                    onChange={(e) => handleCollectionTimeChange('displayMessage', e.target.value)}
                                                    placeholder="Your order will be ready for collection in {time} minutes"
                                                    className="mt-2"
                                                    rows={3}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Use <code className="bg-gray-100 px-1 rounded">{"{time}"}</code> as placeholder for minutes
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <h4 className="font-medium text-green-900 mb-1">Preview</h4>
                                            <p className="text-green-800 text-sm">
                                                {(settings.collectionTimeSettings?.displayMessage || "Your order will be ready for collection in {time} minutes").replace(
                                                    '{time}', 
                                                    String(settings.collectionTimeSettings?.collectionTimeMinutes || 30)
                                                )}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Delivery Time Settings */}
                    {settings.orderTypeSettings?.deliveryEnabled && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Delivery Timing
                                </CardTitle>
                                <CardDescription>
                                    Configure timing settings for customer delivery orders
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base font-medium">Enable Delivery Time Display</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Show delivery time message to customers
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.deliveryTimeSettings?.enabled ?? true}
                                        onCheckedChange={(checked) => handleDeliveryTimeChange('enabled', checked)}
                                    />
                                </div>

                                {settings.deliveryTimeSettings?.enabled && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="deliveryTime">Default Delivery Time (minutes)</Label>
                                                <Input
                                                    id="deliveryTime"
                                                    type="number"
                                                    min="15"
                                                    max="180"
                                                    value={settings.deliveryTimeSettings?.deliveryTimeMinutes || 45}
                                                    onChange={(e) => handleDeliveryTimeChange('deliveryTimeMinutes', parseInt(e.target.value) || 45)}
                                                    className="mt-2 w-32"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Default delivery time for areas not covered by specific delivery zones
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor="deliveryMessage">Delivery Message Template</Label>
                                                <Textarea
                                                    id="deliveryMessage"
                                                    value={settings.deliveryTimeSettings?.displayMessage || "Your order will be delivered in {time} minutes"}
                                                    onChange={(e) => handleDeliveryTimeChange('displayMessage', e.target.value)}
                                                    placeholder="Your order will be delivered in {time} minutes"
                                                    className="mt-2"
                                                    rows={3}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Use <code className="bg-gray-100 px-1 rounded">{"{time}"}</code> as placeholder for minutes
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <h4 className="font-medium text-blue-900 mb-1">Preview</h4>
                                            <p className="text-blue-800 text-sm">
                                                {(settings.deliveryTimeSettings?.displayMessage || "Your order will be delivered in {time} minutes").replace(
                                                    '{time}', 
                                                    String(settings.deliveryTimeSettings?.deliveryTimeMinutes || 45)
                                                )}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Smart Advance Order Configuration */}
                {settings.orderTypeSettings?.advanceOrderEnabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Smart Advance Order Settings
                            </CardTitle>
                            <CardDescription>
                                Configure intelligent advance booking options for your customers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Advance Booking Window */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-lg">Booking Window</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <Label>Maximum Days in Advance</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="90"
                                                value={settings.advanceOrderSettings?.maxDaysInAdvance || 60}
                                                onChange={(e) => setSettings((prev: any) => ({
                                                    ...prev,
                                                    advanceOrderSettings: {
                                                        ...prev.advanceOrderSettings,
                                                        maxDaysInAdvance: parseInt(e.target.value) || 60
                                                    }
                                                }))}
                                                className="w-24"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                How far ahead customers can place orders (1-90 days)
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <Label>Same-Day Order Lead Time (Hours)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="24"
                                                value={settings.advanceOrderSettings?.minHoursNotice || 4}
                                                onChange={(e) => setSettings((prev: any) => ({
                                                    ...prev,
                                                    advanceOrderSettings: {
                                                        ...prev.advanceOrderSettings,
                                                        minHoursNotice: parseInt(e.target.value) || 4
                                                    }
                                                }))}
                                                className="w-24"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Minimum hours notice for same-day advance orders
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Time Slot Management */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-lg">Time Slot Management</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="font-medium">Enable Time Slots</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Offer specific time slots for advance orders
                                                </p>
                                            </div>
                                            <Switch
                                                checked={settings.advanceOrderSettings?.enableTimeSlots ?? false}
                                                onCheckedChange={(checked) => setSettings((prev: any) => ({
                                                    ...prev,
                                                    advanceOrderSettings: {
                                                        ...prev.advanceOrderSettings,
                                                        enableTimeSlots: checked
                                                    }
                                                }))}
                                            />
                                        </div>
                                        
                                        {settings.advanceOrderSettings?.enableTimeSlots && (
                                            <div>
                                                <Label>Time Slot Interval (minutes)</Label>
                                                <Input
                                                    type="number"
                                                    min="15"
                                                    max="120"
                                                    step="15"
                                                    value={settings.advanceOrderSettings?.timeSlotInterval || 15}
                                                    onChange={(e) => setSettings((prev: any) => ({
                                                        ...prev,
                                                        advanceOrderSettings: {
                                                            ...prev.advanceOrderSettings,
                                                            timeSlotInterval: parseInt(e.target.value) || 15
                                                        }
                                                    }))}
                                                    className="w-24"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Time between available slots (15, 30, 45, 60 minutes)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Features */}
                            <Separator />
                            <div className="space-y-4">
                                <h4 className="font-medium text-lg">Smart Features</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <Label className="font-medium">Auto-Accept Advance Orders</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically accept advance orders without manual approval
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.advanceOrderSettings?.autoAccept ?? true}
                                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                                                ...prev,
                                                advanceOrderSettings: {
                                                    ...prev.advanceOrderSettings,
                                                    autoAccept: checked
                                                }
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <Label className="font-medium">Send Reminder Notifications</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Send reminder emails before scheduled orders
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.advanceOrderSettings?.sendReminders ?? false}
                                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                                                ...prev,
                                                advanceOrderSettings: {
                                                    ...prev.advanceOrderSettings,
                                                    sendReminders: checked
                                                }
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Advance Order Preview */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="font-medium text-purple-900 mb-2">Advance Order Summary</h4>
                                <div className="text-purple-800 text-sm space-y-1">
                                    <p>• Customers can order up to <strong>{settings.advanceOrderSettings?.maxDaysInAdvance || 60} days</strong> in advance</p>
                                    <p>• Same-day orders require <strong>{settings.advanceOrderSettings?.minHoursNotice || 4} hours</strong> lead time</p>
                                    <p>• Time slots can be scheduled <strong>any time of day</strong> (24/7 availability)</p>
                                    {settings.advanceOrderSettings?.enableTimeSlots && (
                                        <p>• Time slots available every <strong>{settings.advanceOrderSettings?.timeSlotInterval || 15} minutes</strong></p>
                                    )}
                                    <p>• Orders are <strong>{settings.advanceOrderSettings?.autoAccept ? 'auto-accepted' : 'manually reviewed'}</strong></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Capacity Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Order Capacity Management
                        </CardTitle>
                        <CardDescription>
                            Set order limits per time interval to manage kitchen capacity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {daysOfWeek.map(day => (
                            <div key={day.key} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-medium">{day.label}</h4>
                                    <Switch
                                        checked={throttlingSettings[day.key]?.enabled || false}
                                        onCheckedChange={(checked) => handleThrottlingChange(day.key, 'enabled', checked)}
                                    />
                                </div>
                                
                                {throttlingSettings[day.key]?.enabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Time Interval (minutes)</Label>
                                            <Input
                                                type="number"
                                                min="5"
                                                max="60"
                                                value={throttlingSettings[day.key]?.interval || 15}
                                                onChange={(e) => handleThrottlingChange(day.key, 'interval', parseInt(e.target.value) || 15)}
                                                placeholder="15"
                                                className="w-32"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Time window for order counting
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Orders per Interval</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={throttlingSettings[day.key]?.ordersPerInterval || 10}
                                                onChange={(e) => handleThrottlingChange(day.key, 'ordersPerInterval', parseInt(e.target.value) || 10)}
                                                placeholder="10"
                                                className="w-32"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Maximum orders accepted per interval
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* How It All Works Together */}
                <Card>
                    <CardHeader>
                        <CardTitle>How Order Configuration Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <h4 className="font-medium">Order Types</h4>
                                <p className="text-sm text-muted-foreground">
                                    Control which order types (collection, delivery, advance) are available to customers.
                                    Disabled types won't appear as options during checkout.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium">Timing & Capacity</h4>
                                <p className="text-sm text-muted-foreground">
                                    Set realistic timing expectations and manage kitchen capacity with intelligent 
                                    throttling to prevent order overload during peak times.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium">Advance Orders</h4>
                                <p className="text-sm text-muted-foreground">
                                    Smart advance booking with time slots, automatic acceptance, and reminder notifications
                                    to improve customer experience and operational efficiency.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
