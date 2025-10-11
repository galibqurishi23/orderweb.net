'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Pause,
  Copy,
  RefreshCw,
  Shield,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { License } from '@/lib/license-service';

interface TenantLicenseManagementProps {
  tenantSlug: string;
}

export default function TenantLicenseManagement({ tenantSlug }: TenantLicenseManagementProps) {
  const [currentLicense, setCurrentLicense] = useState<License | null>(null);
  const [licenseHistory, setLicenseHistory] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activationKey, setActivationKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLicenseData();
  }, [tenantSlug]);

  const loadLicenseData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/license`);
      if (response.ok) {
        const data = await response.json();
        setCurrentLicense(data.current);
        setLicenseHistory(data.history || []);
      } else {
        console.log('No license data found');
      }
    } catch (err) {
      console.error('Error loading license data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationKey.trim()) {
      setError('Please enter an activation key');
      return;
    }

    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/super-admin/licenses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationKey: activationKey.trim().toUpperCase(),
          tenantSlug: tenantSlug
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setActivationKey('');
        await loadLicenseData(); // Refresh license data
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Network error occurred. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const formatActivationKey = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    return formatted.substring(0, 19);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'grace_period':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'suspended':
        return <Pause className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      expired: 'destructive',
      grace_period: 'secondary',
      suspended: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const copyLicenseKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setSuccess('License key copied to clipboard!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteLicense = async () => {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/license/delete`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setShowDeleteModal(false);
        await loadLicenseData(); // Refresh license data to show "No License" state
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Network error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading license information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-600">Manage your restaurant license and activate new keys</p>
        </div>
        <Button onClick={loadLicenseData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Current License Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Current License Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLicense ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">License Active</h3>
                  <p className="text-sm text-gray-600">Your restaurant license is currently active</p>
                </div>
                {getStatusBadge(currentLicense.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">License Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono flex-1">
                      {currentLicense.license_key}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLicenseKey(currentLicense.license_key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Expiration Date</Label>
                  <p className="mt-1 text-sm">
                    {new Date(currentLicense.expiration_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Created Date</Label>
                  <p className="mt-1 text-sm">
                    {new Date(currentLicense.created_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(currentLicense.status)}
                  </div>
                </div>
              </div>

              {currentLicense.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Notes</Label>
                  <p className="mt-1 text-sm text-gray-600">{currentLicense.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active License</h3>
              <p className="text-gray-600 mb-4">Your restaurant doesn't have an active license</p>
              <p className="text-sm text-gray-500">
                Use the activation form below to activate a new license
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Activation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Activate New License
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivation} className="space-y-4">
            <div>
              <Label htmlFor="activationKey">Activation Key</Label>
              <Input
                id="activationKey"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={activationKey}
                onChange={(e) => setActivationKey(formatActivationKey(e.target.value))}
                disabled={activating}
                className="font-mono text-center text-lg tracking-wider"
                maxLength={19}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 16-character activation key provided by OrderWeb Ltd
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={activating || activationKey.replace(/-/g, '').length !== 16}
            >
              {activating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Activating License...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Activate License
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need an activation key?</h4>
            <p className="text-sm text-blue-700">
              Contact OrderWeb Ltd to purchase or renew your license. You will receive an activation key that you can enter above.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* License History */}
      {licenseHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>License History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">License Key</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Expired</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenseHistory.map((license) => (
                    <tr key={license.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {license.license_key}
                        </code>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(license.status)}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(license.created_date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(license.expiration_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLicenseKey(license.license_key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Delete License Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete License
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Are you sure?</h4>
                <p className="text-sm text-red-700">
                  This will permanently delete your current license and immediately deactivate your food ordering system. 
                  Customers will not be able to place orders until you activate a new license.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-1">What happens next:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Food ordering will be blocked immediately</li>
                  <li>• Admin panel will remain accessible</li>
                  <li>• You can activate a new license anytime</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDeleteLicense}
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete License
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
