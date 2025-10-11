'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { 
  Upload, 
  Save, 
  Eye, 
  Trash2, 
  Building,
  Globe,
  Mail,
  Phone,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  MapPin
} from 'lucide-react';
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from '@/lib/currency-utils';

interface ApplicationSettings {
  appName: string;
  appLogo: string;
  defaultCurrency: string;
  supportEmail: string;
  supportPhone: string;
  companyName: string;
  companyAddress: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function BusinessInfo() {
  const { toast } = useToast();
  const { settings: globalSettings, updateSettings: updateGlobalSettings, refreshSettings } = useGlobalSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [settings, setSettings] = useState<ApplicationSettings>({
    appName: 'OrderWeb Restaurant System',
    appLogo: '/icons/logo.svg',
    defaultCurrency: 'GBP',
    supportEmail: 'support@orderweb.ltd',
    supportPhone: '+44 20 1234 5678',
    companyName: 'OrderWeb Ltd',
    companyAddress: 'London, United Kingdom',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#3b82f6'
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Update logo preview when globalSettings change
  useEffect(() => {
    if (globalSettings.appLogo && globalSettings.appLogo !== '/icons/logo.svg') {
      setLogoPreview(globalSettings.appLogo);
    }
  }, [globalSettings.appLogo]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/platform/settings');
      
      if (response.ok) {
        const data = await response.json();
        const loadedSettings = data.settings;
        
        setSettings({
          ...settings,
          appName: loadedSettings.appName,
          appLogo: loadedSettings.appLogo,
          defaultCurrency: loadedSettings.defaultCurrency || 'GBP',
          supportEmail: loadedSettings.supportEmail,
          supportPhone: loadedSettings.supportPhone,
          companyName: loadedSettings.companyName,
          companyAddress: loadedSettings.companyAddress,
          primaryColor: loadedSettings.primaryColor || '#6366f1',
          secondaryColor: loadedSettings.secondaryColor || '#8b5cf6',
          accentColor: loadedSettings.accentColor || '#3b82f6'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof ApplicationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid image file (JPG, PNG, GIF, or WebP)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await fetch('/api/platform/upload/logo', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return data.logoUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      let finalSettings = { ...settings };

      // Upload logo if a new one is selected
      if (logoFile) {
        const logoUrl = await uploadLogo();
        if (logoUrl) {
          finalSettings.appLogo = logoUrl;
        }
      } else if (logoPreview && logoPreview !== settings.appLogo) {
        finalSettings.appLogo = logoPreview;
      }

      // Save settings to database
      const response = await fetch('/api/platform/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalSettings)
      });

      if (response.ok) {
        // Update global settings context
        await updateGlobalSettings({
          appName: finalSettings.appName,
          appLogo: finalSettings.appLogo,
          companyName: finalSettings.companyName,
          supportPhone: finalSettings.supportPhone,
          supportEmail: finalSettings.supportEmail,
          companyAddress: finalSettings.companyAddress
        });

        setSettings(finalSettings);
        setLogoFile(null);

        toast({
          title: 'Success',
          description: 'Business information saved successfully',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save business information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSettings(prev => ({
      ...prev,
      appLogo: '/icons/logo.svg'
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-900">Business Information</h1>
                <p className="text-gray-600 mt-1">
                  Manage your company details, branding, and contact information
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Changes to your business information will be reflected across the entire platform and customer-facing interfaces.
              </AlertDescription>
            </Alert>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-gray-50 p-1 border-b border-gray-200 rounded-t-lg">
                <TabsTrigger value="general" className="flex items-center gap-2 flex-1 justify-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Building className="w-4 h-4" />
                  General Information
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                {/* General Information Tab */}
                <TabsContent value="general" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Application Details
              </CardTitle>
              <CardDescription>
                Configure your platform's basic information and default currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => handleSettingChange('appName', e.target.value)}
                    placeholder="Enter application name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select
                    value={settings.defaultCurrency}
                    onValueChange={(value) => handleSettingChange('defaultCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map(currency => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {getCurrencySymbol(currency.value)} {currency.value} - {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Your company details for legal documents and customer support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => handleSettingChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Input
                    id="companyAddress"
                    value={settings.companyAddress}
                    onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                    placeholder="Enter company address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Support Contact Information
              </CardTitle>
              <CardDescription>
                Contact details for customer support and platform communications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    type="tel"
                    value={settings.supportPhone}
                    onChange={(e) => handleSettingChange('supportPhone', e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



              </div>
            </Tabs>
          </div>

          {/* Save Button */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={isLoading}
                size="lg"
                className="flex items-center space-x-2 px-8"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
