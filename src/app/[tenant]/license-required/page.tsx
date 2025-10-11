'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  XCircle, 
  Phone, 
  Mail, 
  AlertTriangle, 
  Clock, 
  MessageCircle,
  RefreshCw,
  Shield,
  CheckCircle,
  Loader2,
  MapPin,
  Key
} from 'lucide-react';

interface PlatformSettings {
  companyName: string;
  appName: string;
  supportPhone: string;
  supportEmail: string;
  companyAddress: string;
  appLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export default function SmartLicenseRequired() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [tenantName, setTenantName] = useState('');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [showActivation, setShowActivation] = useState(false);
  
  const tenant = params.tenant as string;
  const status = searchParams.get('status') || 'expired';
  const statusMessage = searchParams.get('message') || 'No license found for this restaurant';

  // Auto-refresh every 30 seconds to check if license is activated
  useEffect(() => {
    const checkLicenseStatus = async () => {
      try {
        setRefreshing(true);
        const response = await fetch(`/api/tenant/${tenant}/license`);
        if (response.ok) {
          const licenseData = await response.json();
          if (licenseData.current && licenseData.current.status === 'active') {
            // License is now active, redirect to main page
            window.location.href = `/${tenant}`;
            return;
          }
        }
        setLastCheck(new Date());
      } catch (error) {
        console.error('Error checking license status:', error);
      } finally {
        setRefreshing(false);
      }
    };

    // Initial check
    checkLicenseStatus();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(checkLicenseStatus, 30000);

    return () => clearInterval(interval);
  }, [tenant]);

  // Load platform settings and tenant info
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load platform settings
        const settingsResponse = await fetch('/api/platform/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setPlatformSettings(settingsData.settings);
        }

        // Format tenant name
        setTenantName(
          tenant?.charAt(0).toUpperCase() + tenant?.slice(1).replace('-', ' ') + ' Restaurant' || 'Restaurant'
        );
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenant]);

  // Contact handlers
  const handleCall = () => {
    if (platformSettings?.supportPhone) {
      window.open(`tel:${platformSettings.supportPhone.replace(/\s/g, '')}`);
    }
  };

  const handleEmail = () => {
    if (platformSettings?.supportEmail) {
      const subject = `License Support for ${tenantName}`;
      const body = `Hello,\n\nI need assistance with the license for ${tenantName}.\n\nLicense Key: ${tenant.toUpperCase()}-NOT_FOUND\n\nPlease help me activate my license.\n\nThank you!`;
      window.open(`mailto:${platformSettings.supportEmail}?subject=${subject}&body=${body}`);
    }
  };

  const handleLiveChat = () => {
    // Implement live chat functionality or redirect to chat
    alert('Live chat functionality would be implemented here');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${tenant}/license-check`);
      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          window.location.href = `/${tenant}`;
        }
      }
    } catch (error) {
      console.error('Error refreshing license:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setMessage('Please enter a license key');
      return;
    }

    setIsActivating(true);
    setMessage('');

    try {
      const response = await fetch('/api/tenant/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          tenant: tenant
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('License activated successfully! Redirecting...');
        setTimeout(() => {
          window.location.href = `/${tenant}`;
        }, 2000);
      } else {
        setMessage(data.error || 'Failed to activate license');
      }
    } catch (error) {
      setMessage('Error activating license. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  // Get status styling
  const getStatusInfo = () => {
    switch (status) {
      case 'expired':
        return {
          icon: <XCircle className="w-20 h-20 text-red-500" />,
          title: 'License Issue',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const
        };
      case 'suspended':
        return {
          icon: <AlertTriangle className="w-20 h-20 text-orange-500" />,
          title: 'License Suspended',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'secondary' as const
        };
      case 'grace_period':
        return {
          icon: <Clock className="w-20 h-20 text-yellow-500" />,
          title: 'License Grace Period',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeVariant: 'outline' as const
        };
      default:
        return {
          icon: <XCircle className="w-20 h-20 text-gray-500" />,
          title: 'License Issue',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'outline' as const
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            Last check: {lastCheck.toLocaleTimeString()}
          </p>
        </div>

        {/* Main Status Card */}
        <Card className={`${statusInfo.borderColor} ${statusInfo.bgColor} shadow-lg`}>
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-6">
              {/* Status Icon */}
              <div className="flex justify-center">
                {statusInfo.icon}
              </div>

              {/* Status Badge */}
              <Badge variant={statusInfo.badgeVariant} className="text-sm">
                {statusInfo.title}
              </Badge>

              {/* Tenant Name */}
              <h1 className="text-3xl font-bold text-gray-900">
                {tenantName}
              </h1>

              {/* Warning Alert */}
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {statusMessage}
                </AlertDescription>
              </Alert>

              {/* Service Message */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Service Temporarily Unavailable
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  This restaurant ordering system is currently inactive due to license issues. 
                  Please contact {platformSettings?.companyName || 'OrderWeb Ltd'} to restore service.
                </p>
              </div>

              {/* License Key Display */}
              <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">License Key:</p>
                <code className="text-lg font-mono text-gray-800 bg-white px-3 py-2 rounded border">
                  {tenant.toUpperCase()}-NOT_FOUND
                </code>
              </div>

              {/* Show Activation Form Toggle */}
              <Button
                onClick={() => setShowActivation(!showActivation)}
                variant="outline"
                className="mt-4"
              >
                {showActivation ? 'Hide' : 'Have'} License Key?
              </Button>

              {/* License Activation Form */}
              {showActivation && (
                <div className="space-y-4 mt-6 p-4 bg-white rounded-lg border">
                  <div className="space-y-2">
                    <Label htmlFor="license-key">Enter License Key</Label>
                    <Input
                      id="license-key"
                      type="text"
                      placeholder="OWLTD-XXXXX-XXXXX"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      className="text-center font-mono"
                    />
                  </div>

                  {message && (
                    <Alert className={message.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <AlertDescription className={message.includes('successfully') ? 'text-green-800' : 'text-red-800'}>
                        {message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={handleActivateLicense}
                    disabled={isActivating || !licenseKey.trim()}
                    className="w-full"
                  >
                    {isActivating ? 'Activating...' : 'Activate License'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Options Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              Get Help Immediately
            </CardTitle>
            {platformSettings && (
              <p className="text-gray-600">
                Contact for license support
              </p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Primary Contact Methods */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Phone */}
              <Button 
                onClick={handleCall}
                className="h-16 text-left flex items-center gap-3 bg-green-600 hover:bg-green-700"
                disabled={!platformSettings?.supportPhone}
              >
                <Phone className="w-6 h-6" />
                <div>
                  <div className="font-semibold">Call Now</div>
                  <div className="text-xs opacity-90">
                    {platformSettings?.supportPhone || 'Loading...'}
                  </div>
                </div>
              </Button>

              {/* Email */}
              <Button 
                onClick={handleEmail}
                variant="outline"
                className="h-16 text-left flex items-center gap-3 border-blue-300 hover:bg-blue-50"
                disabled={!platformSettings?.supportEmail}
              >
                <Mail className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-600">Email Support</div>
                  <div className="text-xs text-gray-600">
                    {platformSettings?.supportEmail || 'Loading...'}
                  </div>
                </div>
              </Button>

              {/* Live Chat */}
              <Button 
                onClick={handleLiveChat}
                variant="outline"
                className="h-16 text-left flex items-center gap-3 border-purple-300 hover:bg-purple-50"
              >
                <MessageCircle className="w-6 h-6 text-purple-600" />
                <div>
                  <div className="font-semibold text-purple-600">Live Chat</div>
                  <div className="text-xs text-gray-600">Available 24/7</div>
                </div>
              </Button>
            </div>

            {/* Company Information */}
            {platformSettings && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Shield className="w-8 h-8 text-blue-600 mt-1" />
                  <div className="space-y-3 flex-1">
                    <h4 className="font-semibold text-blue-900 text-lg">
                      {platformSettings.companyName}
                    </h4>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      {platformSettings.supportPhone && (
                        <div className="flex items-center gap-2 text-blue-700">
                          <Phone className="w-4 h-4" />
                          <span>{platformSettings.supportPhone}</span>
                        </div>
                      )}
                      {platformSettings.supportEmail && (
                        <div className="flex items-center gap-2 text-blue-700">
                          <Mail className="w-4 h-4" />
                          <span>{platformSettings.supportEmail}</span>
                        </div>
                      )}
                      {platformSettings.companyAddress && (
                        <div className="flex items-center gap-2 text-blue-700 md:col-span-2">
                          <MapPin className="w-4 h-4" />
                          <span>{platformSettings.companyAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Refresh License Status */}
            <div className="text-center pt-4 border-t">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                className="text-blue-600 hover:text-blue-700"
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Check License Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auto-refresh Notice */}
        <div className="text-center text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 inline mr-1" />
          This page automatically checks for license activation every 30 seconds
        </div>
      </div>
    </div>
  );
}
