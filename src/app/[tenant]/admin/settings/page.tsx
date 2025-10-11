'use client';

import React, { useState, useEffect } from 'react';
import { Save, Upload, Mail, Phone, MapPin, Settings as SettingsIcon, Image as ImageIcon, KeyRound, Palette } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import type { RestaurantSettings, OpeningHoursPerDay, ThemeSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
];

const colorPalettes = [
  {
    name: 'Default Blue',
    colors: {
      primary: '224 82% 57%',
      primaryForeground: '210 40% 98%',
      background: '210 40% 98%',
      accent: '210 40% 94%',
    },
  },
  {
    name: 'Forest Green',
    colors: {
      primary: '142 68% 24%',
      primaryForeground: '140 100% 97%',
      background: '30 50% 98%',
      accent: '140 85% 96%',
    },
  },
    {
    name: 'Sunset Orange',
    colors: {
      primary: '25 95% 53%',
      primaryForeground: '35 100% 97%',
      background: '0 0% 100%',
      accent: '35 100% 97%',
    },
  },
  {
    name: 'Royal Purple',
    colors: {
      primary: '262 67% 47%',
      primaryForeground: '261 100% 97%',
      background: '0 0% 100%',
      accent: '261 80% 97%',
    },
  },
  {
    name: 'Charcoal',
    colors: {
      primary: '222 47% 11%',
      primaryForeground: '210 40% 98%',
      background: '0 0% 100%',
      accent: '210 40% 96.1%',
    }
  }
];

const ColorPickerInput = ({
    label,
    description,
    hslValue,
    onHslChange,
}: {
    label: string;
    description: string;
    hslValue: string;
    onHslChange: (newHslValue: string) => void;
}) => {
    // Memoize the conversion to avoid re-calculating on every render
    const hexValue = React.useMemo(() => {
        if (!hslValue?.trim()) return '#000000';
        try {
            const [h, s, l] = hslValue.replace(/%/g, '').split(' ').map(Number);
            const l_dec = l / 100;
            const a = (s * Math.min(l_dec, 1 - l_dec)) / 100;
            const f = (n: number) => {
                const k = (n + h / 30) % 12;
                const color = l_dec - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        } catch {
            return '#000000';
        }
    }, [hslValue]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        const h_final = Math.round(h * 360);
        const s_final = Math.round(s * 100);
        const l_final = Math.round(l * 100);
        onHslChange(`${h_final} ${s_final}% ${l_final}%`);
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <p className="text-sm font-mono text-muted-foreground">{hexValue.toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-4 mt-1">
                <input
                    type="color"
                    value={hexValue}
                    onChange={handleHexChange}
                    className="w-10 h-10 p-0 border-none bg-transparent rounded-md cursor-pointer"
                    title={`Select ${label}`}
                />
                <div className="flex-grow">
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { tenantData, refreshTenantData } = useAdmin();
    const { updateTheme, applyTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
    const { toast } = useToast();

    // Fetch restaurant settings
    useEffect(() => {
        async function fetchSettings() {
            if (!tenantData?.id) return;
            
            try {
                setLoading(true);
                const response = await fetch(`/api/tenant/settings?tenantId=${tenantData.id}`, {
                    headers: {
                        'X-Tenant-ID': tenantData.id
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setRestaurantSettings(result.data);
                    }
                } else {
                    const errorData = await response.json();
                    console.error('Settings API error:', errorData);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                toast({
                    title: "Error",
                    description: "Failed to load settings",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();
    }, [tenantData?.id, toast]);

    // Save settings function
    const saveSettings = async (settings: RestaurantSettings) => {
        if (!tenantData?.id) {
            toast({
                title: "Error",
                description: "No tenant ID available",
                variant: "destructive",
            });
            return;
        }
        
        try {
            const response = await fetch('/api/tenant/settings', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setRestaurantSettings(settings);
                    await refreshTenantData();
                    toast({
                        title: "Success",
                        description: "Settings saved successfully",
                    });
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save settings",
                variant: "destructive",
            });
        }
    };
    
    // Create proper default settings
    const defaultSettings: RestaurantSettings = {
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        currency: 'GBP',
        // No taxRate - application is tax-free
        website: '',
        logo: '',
        logoHint: '',
        coverImage: '',
        coverImageHint: '',
        favicon: '',
        openingHours: {
            monday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            tuesday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            wednesday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            thursday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            friday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            saturday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' },
            sunday: { closed: false, timeMode: 'single', openTime: '09:00', closeTime: '17:00' }
        },
        orderThrottling: {
            monday: { interval: 15, ordersPerInterval: 10, enabled: false },
            tuesday: { interval: 15, ordersPerInterval: 10, enabled: false },
            wednesday: { interval: 15, ordersPerInterval: 10, enabled: false },
            thursday: { interval: 15, ordersPerInterval: 10, enabled: false },
            friday: { interval: 15, ordersPerInterval: 10, enabled: false },
            saturday: { interval: 15, ordersPerInterval: 10, enabled: false },
            sunday: { interval: 15, ordersPerInterval: 10, enabled: false }
        },
        paymentSettings: {
            cash: { enabled: true },
            stripe: { enabled: false, apiKey: '', apiSecret: '', merchantId: '' },
            globalPayments: { enabled: false, apiKey: '', apiSecret: '', merchantId: '' },
            worldpay: { enabled: false, apiKey: '', apiSecret: '', merchantId: '' }
        },
        orderTypeSettings: {
            deliveryEnabled: true,
            advanceOrderEnabled: true,
            collectionEnabled: true
        },
        collectionTimeSettings: {
            collectionTimeMinutes: 30,
            enabled: true,
            displayMessage: "Your order will be ready for collection in {time} minutes"
        },
        deliveryTimeSettings: {
            deliveryTimeMinutes: 45,
            enabled: true,
            displayMessage: "Your order will be delivered in {time} minutes"
        },
        advanceOrderSettings: {
            maxDaysInAdvance: 60,
            minHoursNotice: 4,
            enableTimeSlots: true,
            timeSlotInterval: 30,
            autoAccept: false,
            sendReminders: true
        },
        theme: {
            primary: '224 82% 57%',
            primaryForeground: '210 40% 98%',
            background: '210 40% 98%',
            accent: '210 40% 94%'
        }
    };
    
    const [settings, setSettings] = useState<RestaurantSettings>(() => {
        // Merge defaults with actual settings, ensuring all fields are defined
        return {
            ...defaultSettings,
            ...restaurantSettings
        };
    });
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [emailData, setEmailData] = useState({
        newEmail: '',
        passwordForEmail: '',
    });
    
    // Sync local state when context data changes
    React.useEffect(() => {
        if (restaurantSettings) {
            // Ensure all opening hours have proper defaults
            const settingsWithDefaults = {
                ...defaultSettings,
                ...restaurantSettings,
                currency: 'GBP', // Always use GBP
                openingHours: {
                    ...defaultSettings.openingHours,
                    ...restaurantSettings.openingHours,
                    monday: ensureHoursDefaults(restaurantSettings.openingHours?.monday),
                    tuesday: ensureHoursDefaults(restaurantSettings.openingHours?.tuesday),
                    wednesday: ensureHoursDefaults(restaurantSettings.openingHours?.wednesday),
                    thursday: ensureHoursDefaults(restaurantSettings.openingHours?.thursday),
                    friday: ensureHoursDefaults(restaurantSettings.openingHours?.friday),
                    saturday: ensureHoursDefaults(restaurantSettings.openingHours?.saturday),
                    sunday: ensureHoursDefaults(restaurantSettings.openingHours?.sunday),
                }
            };
            setSettings(settingsWithDefaults);
        }
    }, [restaurantSettings]);
    
    // Helper function to ensure hours have all required defaults
    const ensureHoursDefaults = (hours: any) => ({
        closed: hours?.closed ?? false,
        timeMode: hours?.timeMode ?? 'single',
        openTime: hours?.openTime ?? '09:00',
        closeTime: hours?.closeTime ?? '22:00',
        morningOpen: hours?.morningOpen ?? '09:00',
        morningClose: hours?.morningClose ?? '14:00',
        eveningOpen: hours?.eveningOpen ?? '17:00',
        eveningClose: hours?.eveningClose ?? '22:00',
    });

    const handleSave = async () => {
        try {
            const settingsToSave = {
                ...settings,
                currency: 'GBP' // Always force GBP
            };
            
            console.log('💾 Saving settings:', settingsToSave);
            await saveSettings(settingsToSave);
            
            toast({
                title: "Settings Saved",
                description: "Your restaurant settings have been successfully updated.",
            });
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Failed to save settings. Please try again.",
            });
        }
    };

    const handleInputChange = (field: keyof RestaurantSettings, value: any) => {
        setSettings(prev => ({ 
            ...prev, 
            [field]: value,
            currency: 'GBP' // Always force GBP
        }));
    };

    const handleThemeChange = (field: keyof ThemeSettings, value: string) => {
        const newThemeValue = { [field]: value };
        
        // Update local state
        setSettings(prev => ({
            ...prev,
            theme: {
                ...prev.theme,
                [field]: value,
            }
        }));
        
        // Apply theme immediately for real-time preview
        updateTheme(newThemeValue);
    };
    
    const handlePasswordInputChange = (field: string, value: string) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleEmailInputChange = (field: string, value: string) => {
        setEmailData(prev => ({ ...prev, [field]: value }));
    };

    const handleChangePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
             toast({
                variant: 'destructive',
                title: 'Missing Fields',
                description: 'Please fill out all password fields.',
            });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords Do Not Match',
                description: 'Your new password and confirmation password must match.',
            });
            return;
        }
         if (passwordData.newPassword.length < 6) {
            toast({
                variant: 'destructive',
                title: 'Password Too Short',
                description: 'Your new password must be at least 6 characters long.',
            });
            return;
        }
        
        try {
            const response = await fetch('/api/tenant/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast({
                    title: 'Password Updated',
                    description: 'Your password has been successfully updated.',
                });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Password Change Failed',
                    description: result.error || 'An error occurred while changing your password.',
                });
            }
        } catch (error) {
            console.error('Password change error:', error);
            toast({
                variant: 'destructive',
                title: 'Password Change Failed',
                description: 'An error occurred while changing your password.',
            });
        }
    };

    const handleChangeEmail = async () => {
        if (!emailData.newEmail || !emailData.passwordForEmail) {
            toast({
                variant: 'destructive',
                title: 'Missing Fields',
                description: 'Please provide your new email and current password.',
            });
            return;
        }
        if (!/\S+@\S+\.\S+/.test(emailData.newEmail)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please enter a valid email address.',
            });
            return;
        }
        
        try {
            const response = await fetch('/api/tenant/auth/change-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify({
                    newEmail: emailData.newEmail,
                    currentPassword: emailData.passwordForEmail
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast({
                    title: 'Email Updated',
                    description: `Your admin email has been changed to ${emailData.newEmail}.`,
                });
                setEmailData({ newEmail: '', passwordForEmail: '' });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Email Change Failed',
                    description: result.error || 'An error occurred while changing your email.',
                });
            }
        } catch (error) {
            console.error('Email change error:', error);
            toast({
                variant: 'destructive',
                title: 'Email Change Failed',
                description: 'An error occurred while changing your email.',
            });
        }
    };

    const handleHoursChange = (dayKey: string, field: keyof OpeningHoursPerDay, value: string | boolean) => {
        console.log(`⏰ Updating ${dayKey} ${field} to:`, value);
        setSettings(prev => {
            const newSettings = {
                ...prev,
                currency: 'GBP', // Always force GBP
                openingHours: {
                    ...prev.openingHours,
                    [dayKey]: {
                        ...ensureHoursDefaults(prev.openingHours[dayKey]),
                        [field]: value,
                    }
                }
            };
            console.log(`⏰ New ${dayKey} hours:`, newSettings.openingHours[dayKey]);
            return newSettings;
        });
    };

    const handleTimeModeChange = (dayKey: string, mode: 'single' | 'split') => {
        setSettings(prev => ({
            ...prev,
            currency: 'GBP', // Always force GBP
            openingHours: {
                ...prev.openingHours,
                [dayKey]: {
                    ...ensureHoursDefaults(prev.openingHours[dayKey]),
                    timeMode: mode,
                    // Clear fields that don't apply to the new mode
                    ...(mode === 'single' ? {
                        morningOpen: undefined,
                        morningClose: undefined,
                        eveningOpen: undefined,
                        eveningClose: undefined,
                        openTime: prev.openingHours[dayKey]?.openTime || '09:00',
                        closeTime: prev.openingHours[dayKey]?.closeTime || '22:00'
                    } : {
                        openTime: undefined,
                        closeTime: undefined,
                        morningOpen: prev.openingHours[dayKey]?.morningOpen || '09:00',
                        morningClose: prev.openingHours[dayKey]?.morningClose || '14:00',
                        eveningOpen: prev.openingHours[dayKey]?.eveningOpen || '17:00',
                        eveningClose: prev.openingHours[dayKey]?.eveningClose || '22:00'
                    })
                }
            }
        }));
    };

    const applyTimePreset = (preset: 'standard' | 'weekend') => {
        let newHours = { ...settings.openingHours };
        if (preset === 'standard') {
            daysOfWeek.forEach(day => {
                newHours[day.key] = { 
                    timeMode: 'split', 
                    morningOpen: '09:00', 
                    morningClose: '14:00', 
                    eveningOpen: '17:00', 
                    eveningClose: '22:00', 
                    closed: false 
                };
            });
        } else {
             daysOfWeek.forEach(day => {
                const isWeekend = day.key === 'saturday' || day.key === 'sunday';
                newHours[day.key] = { 
                    timeMode: 'split',
                    morningOpen: isWeekend ? '10:00' : '09:00', 
                    morningClose: isWeekend ? '15:00' : '14:00', 
                    eveningOpen: isWeekend ? '18:00' : '17:00', 
                    eveningClose: isWeekend ? '23:00' : '22:00', 
                    closed: false 
                };
            });
        }
        setSettings(prev => ({ 
            ...prev, 
            openingHours: newHours,
            currency: 'GBP' // Always force GBP
        }));
        toast({ title: 'Preset Applied', description: 'Opening hours have been updated.' });
    };

    const triggerClasses = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold";

    // Helper to validate image size and dimensions
    function validateImage(file: File, maxSizeMB: number, requiredWidth: number, requiredHeight: number, onError: (msg: string) => void, onSuccess: (dataUrl: string) => void) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError(`Image is too large. Maximum allowed size is ${maxSizeMB}MB.`);
        return;
      }
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return;
        img.onload = () => {
          if (img.width !== requiredWidth || img.height !== requiredHeight) {
            onError(`Image dimensions must be exactly ${requiredWidth}x${requiredHeight}px.`);
          } else {
            if (e.target?.result) {
              onSuccess(e.target.result as string);
            }
          }
        };
        img.onerror = () => onError('Invalid image file.');
        img.src = e.target.result as string;
      };
      reader.readAsDataURL(file);
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-4">
                            <SettingsIcon className="w-8 h-8" />
                            <span className="text-2xl font-bold">Restaurant Settings</span>
                        </CardTitle>
                        <CardDescription>Manage your restaurant information and preferences.</CardDescription>
                    </div>
                     <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2"/>
                        Save Changes
                    </Button>
                </CardHeader>
            </Card>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
                    <TabsTrigger value="general" className={triggerClasses}>General</TabsTrigger>
                    <TabsTrigger value="theme" className={triggerClasses}>Theme</TabsTrigger>
                    <TabsTrigger value="hours" className={triggerClasses}>Opening Hours</TabsTrigger>
                    <TabsTrigger value="contact" className={triggerClasses}>Contact & Location</TabsTrigger>
                    <TabsTrigger value="security" className={triggerClasses}>Security</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                            <CardDescription>Basic details about your restaurant.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name">Restaurant Name</Label>
                                    <Input id="name" value={settings.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                                </div>
                                {/* Tax Rate field removed - application is tax-free */}
                                <div className="md:col-span-2">
                                     <Label htmlFor="description">Description</Label>
                                     <Textarea id="description" value={settings.description || ''} onChange={e => handleInputChange('description', e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" type="url" value={settings.website || ''} onChange={e => handleInputChange('website', e.target.value)} placeholder="https://example.com" />
                                </div>
                            </div>
                            <div>
                                <Label>Restaurant Logo</Label>
                                <Card className="mt-2">
                                    <CardContent className="p-4 flex items-center gap-6">
                                        {settings.logo ? 
                                            <Image src={settings.logo} data-ai-hint={settings.logoHint} alt="Logo" width={80} height={80} className="rounded-lg object-cover" /> :
                                            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground"/></div>
                                        }
                                        <div className="flex-grow">
                                            <p className="text-sm text-muted-foreground mb-2">Upload a new logo. Recommended size: 200x200px.</p>
                                            <div className="flex gap-2">
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  style={{ display: 'none' }}
                                                  id="logo-upload"
                                                  onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    validateImage(
                                                      file,
                                                      1, // 1MB max size
                                                      200,
                                                      200,
                                                      (msg) => toast({ title: 'Logo Upload Error', description: msg, variant: 'destructive' }),
                                                      (dataUrl) => handleInputChange('logo', dataUrl)
                                                    );
                                                  }}
                                                />
                                                <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Change Logo</Button>
                                                {settings.logo && <Button variant="outline" onClick={() => handleInputChange('logo', '')} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 transition-all duration-200">Remove</Button>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div>
                                <Label>Restaurant Cover Image</Label>
                                <Card className="mt-2">
                                    <CardContent className="p-4 flex items-center gap-6">
                                        {settings.coverImage ? 
                                            <Image src={settings.coverImage} data-ai-hint={settings.coverImageHint} alt="Cover Image" width={160} height={40} className="rounded-lg object-cover" /> :
                                            <div className="w-40 h-10 bg-muted rounded-lg flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>
                                        }
                                        <div className="flex-grow">
                                            <p className="text-sm text-muted-foreground mb-2">Upload a cover image for the customer page. Recommended: 1600x400px.</p>
                                            <div className="flex gap-2">
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  style={{ display: 'none' }}
                                                  id="cover-upload"
                                                  onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    validateImage(
                                                      file,
                                                      2, // 2MB max size
                                                      1600,
                                                      400,
                                                      (msg) => toast({ title: 'Cover Upload Error', description: msg, variant: 'destructive' }),
                                                      (dataUrl) => handleInputChange('coverImage', dataUrl)
                                                    );
                                                  }}
                                                />
                                                <Button variant="outline" onClick={() => document.getElementById('cover-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Change Cover</Button>
                                                {settings.coverImage && <Button variant="outline" onClick={() => handleInputChange('coverImage', '')} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 transition-all duration-200">Remove</Button>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="theme">
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme Customization</CardTitle>
                            <CardDescription>Adjust the colors of your app. Changes will apply globally.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Live Preview Section */}
                            <div className="p-4 border rounded-lg bg-background">
                                <Label className="text-sm font-medium mb-3 block">Live Preview</Label>
                                <div className="space-y-3">
                                    <Button className="w-full">Primary Button Preview</Button>
                                    <Button variant="outline" className="w-full">Outline Button Preview</Button>
                                    <div className="p-3 bg-accent rounded">
                                        <p className="text-accent-foreground text-sm">This is how accent backgrounds will look</p>
                                    </div>
                                    <div className="p-3 bg-card border rounded">
                                        <p className="text-card-foreground text-sm">Card content with current theme colors</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ColorPickerInput
                                    label="Primary Color"
                                    description="Used for buttons and major highlights."
                                    hslValue={settings.theme.primary}
                                    onHslChange={(value) => handleThemeChange('primary', value)}
                                />
                                <ColorPickerInput
                                    label="Primary Foreground"
                                    description="Text color on top of the primary color."
                                    hslValue={settings.theme.primaryForeground}
                                    onHslChange={(value) => handleThemeChange('primaryForeground', value)}
                                />
                                <ColorPickerInput
                                    label="Background Color"
                                    description="The main background of the app."
                                    hslValue={settings.theme.background}
                                    onHslChange={(value) => handleThemeChange('background', value)}
                                />
                                <ColorPickerInput
                                    label="Accent Color"
                                    description="Used for subtle highlights and hover states."
                                    hslValue={settings.theme.accent}
                                    onHslChange={(value) => handleThemeChange('accent', value)}
                                />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Color Palettes</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const defaultTheme = {
                                                primary: '224 82% 57%',
                                                primaryForeground: '210 40% 98%',
                                                background: '210 40% 98%',
                                                accent: '210 40% 94%',
                                            };
                                            
                                            setSettings(prev => ({
                                                ...prev,
                                                theme: defaultTheme
                                            }));
                                            
                                            applyTheme(defaultTheme);
                                            
                                            toast({ title: 'Theme Reset', description: 'Colors have been reset to default values.' });
                                        }}
                                    >
                                        Reset to Default
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">Select a preset palette to get started.</p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {colorPalettes.map(palette => (
                                        <Button
                                            key={palette.name}
                                            variant="outline"
                                            onClick={() => {
                                                // Update all theme colors at once
                                                const newTheme = {
                                                    primary: palette.colors.primary,
                                                    primaryForeground: palette.colors.primaryForeground,
                                                    background: palette.colors.background,
                                                    accent: palette.colors.accent,
                                                };
                                                
                                                // Update local state
                                                setSettings(prev => ({
                                                    ...prev,
                                                    theme: newTheme
                                                }));
                                                
                                                // Apply theme immediately
                                                applyTheme(newTheme);
                                                
                                                toast({ title: 'Palette Applied', description: `${palette.name} colors have been set.` });
                                            }}
                                        >
                                            <div className="w-4 h-4 rounded-full mr-2" style={{ background: `hsl(${palette.colors.primary})` }} />
                                            {palette.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="hours">
                    <Card>
                        <CardHeader>
                            <CardTitle>Opening Hours</CardTitle>
                            <CardDescription>Configure your restaurant's opening hours. Choose between single time slots or split morning/evening sessions.</CardDescription>
                        </CardHeader>
                                        <CardContent className="space-y-4">
                            {daysOfWeek.map(day => {
                                const dayHours = settings.openingHours[day.key] || ensureHoursDefaults(null);
                                return (
                                    <Card key={day.key} className={cn(dayHours.closed && "bg-muted/50")}>
                                        <CardHeader className="flex flex-row items-center justify-between p-4">
                                            <h4 className="font-semibold">{day.label}</h4>
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor={`closed-${day.key}`} className="text-sm">Closed Today</Label>
                                                <Switch 
                                                    id={`closed-${day.key}`} 
                                                    checked={dayHours.closed || false} 
                                                    onCheckedChange={(checked) => handleHoursChange(day.key, 'closed', checked)} 
                                                />
                                            </div>
                                        </CardHeader>
                                        {!dayHours.closed && (
                                            <CardContent className="p-4 pt-0 space-y-4">
                                                {/* Time Mode Selection */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Time Format</Label>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant={dayHours.timeMode === 'single' ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => handleTimeModeChange(day.key, 'single')}
                                                        >
                                                            Single Time
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={dayHours.timeMode === 'split' ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => handleTimeModeChange(day.key, 'split')}
                                                        >
                                                            Morning & Evening
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Single Time Mode */}
                                                {dayHours.timeMode === 'single' && (
                                                    <div className="space-y-2">
                                                        <Label>Opening Hours</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input 
                                                                type="time" 
                                                                value={dayHours.openTime ?? '09:00'} 
                                                                onChange={e => handleHoursChange(day.key, 'openTime', e.target.value)} 
                                                                className="flex-1"
                                                            />
                                                            <span className="text-muted-foreground">to</span>
                                                            <Input 
                                                                type="time" 
                                                                value={dayHours.closeTime ?? '22:00'} 
                                                                onChange={e => handleHoursChange(day.key, 'closeTime', e.target.value)} 
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Split Time Mode */}
                                                {dayHours.timeMode === 'split' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <Label>Morning Slot</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    type="time" 
                                                                    value={dayHours.morningOpen ?? '09:00'} 
                                                                    onChange={e => handleHoursChange(day.key, 'morningOpen', e.target.value)} 
                                                                />
                                                                <span>-</span>
                                                                <Input 
                                                                    type="time" 
                                                                    value={dayHours.morningClose ?? '14:00'} 
                                                                    onChange={e => handleHoursChange(day.key, 'morningClose', e.target.value)} 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Evening Slot</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    type="time" 
                                                                    value={dayHours.eveningOpen ?? '17:00'} 
                                                                    onChange={e => handleHoursChange(day.key, 'eveningOpen', e.target.value)} 
                                                                />
                                                                <span>-</span>
                                                                <Input 
                                                                    type="time" 
                                                                    value={dayHours.eveningClose ?? '22:00'} 
                                                                    onChange={e => handleHoursChange(day.key, 'eveningClose', e.target.value)} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </CardContent>
                        <CardFooter>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => applyTimePreset('standard')}>Apply Standard Week</Button>
                                <Button variant="secondary" onClick={() => applyTimePreset('weekend')}>Apply Weekend Hours</Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
                
                <TabsContent value="contact">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contact & Location</CardTitle>
                            <CardDescription>How customers can reach you and find your restaurant.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="phone"><Phone className="inline w-4 h-4 mr-2"/>Phone Number</Label>
                                    <Input id="phone" type="tel" value={settings.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} />
                                </div>
                                 <div>
                                    <Label htmlFor="email"><Mail className="inline w-4 h-4 mr-2"/>Email Address</Label>
                                    <Input id="email" type="email" value={settings.email || ''} onChange={e => handleInputChange('email', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor="address"><MapPin className="inline w-4 h-4 mr-2"/>Full Address</Label>
                                    <Textarea id="address" value={settings.address || ''} onChange={e => handleInputChange('address', e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                                
                 <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>Manage your account security, including your password and email address.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-4 max-w-md">
                                <h3 className="text-lg font-medium flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Change Password</h3>
                                <div>
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={passwordData.currentPassword || ''}
                                        onChange={e => handlePasswordInputChange('currentPassword', e.target.value)}
                                        placeholder="Enter your current password"
                                    />
                                </div>
                                 <div>
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={passwordData.newPassword || ''}
                                        onChange={e => handlePasswordInputChange('newPassword', e.target.value)}
                                        placeholder="Enter a new password"
                                    />
                                </div>
                                 <div>
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={passwordData.confirmPassword || ''}
                                        onChange={e => handlePasswordInputChange('confirmPassword', e.target.value)}
                                        placeholder="Confirm your new password"
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4 max-w-md">
                                <h3 className="text-lg font-medium flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Change Email Address</h3>
                                 <div>
                                    <Label htmlFor="new-email">New Email Address</Label>
                                    <Input
                                        id="new-email"
                                        type="email"
                                        value={emailData.newEmail || ''}
                                        onChange={e => handleEmailInputChange('newEmail', e.target.value)}
                                        placeholder="your.new.email@example.com"
                                    />
                                </div>
                                 <div>
                                    <Label htmlFor="password-for-email">Current Password</Label>
                                    <Input
                                        id="password-for-email"
                                        type="password"
                                        value={emailData.passwordForEmail || ''}
                                        onChange={e => handleEmailInputChange('passwordForEmail', e.target.value)}
                                        placeholder="Enter password to confirm change"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-4">
                            <Button onClick={handleChangePassword}>
                                <KeyRound className="w-4 h-4 mr-2"/>
                                Change Password
                            </Button>
                             <Button onClick={handleChangeEmail}>
                                <Mail className="w-4 h-4 mr-2"/>
                                Update Email
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
