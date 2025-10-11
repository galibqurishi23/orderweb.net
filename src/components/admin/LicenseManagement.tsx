'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Key, 
  AlertCircle, 
  CheckCircle,
  Clock,
  XCircle,
  Pause
} from 'lucide-react';
import { License } from '@/lib/license-service';

interface Restaurant {
  id: number;
  name: string;
  slug: string;
}

export default function LicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [createForm, setCreateForm] = useState({
    tenantId: '',
    expirationDate: '',
    notes: '',
    createType: 'direct' // 'direct' or 'activation'
  });

  const [activationKeyForm, setActivationKeyForm] = useState({
    durationDays: '30',
    notes: ''
  });

  const [pendingActivations, setPendingActivations] = useState<any[]>([]);
  const [generatedKey, setGeneratedKey] = useState<{
    licenseKey: string;
    activationKey: string;
    expirationDate: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [licensesRes, restaurantsRes, pendingRes] = await Promise.all([
        fetch('/api/super-admin/licenses'),
        fetch('/api/super-admin/restaurants'),
        fetch('/api/super-admin/licenses/pending')
      ]);

      if (licensesRes.ok) {
        const licensesData = await licensesRes.json();
        setLicenses(licensesData);
      }

      if (restaurantsRes.ok) {
        const restaurantsData = await restaurantsRes.json();
        setRestaurants(restaurantsData);
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingActivations(pendingData);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setGeneratedKey(null);

    try {
      let requestBody;
      
      if (createForm.createType === 'activation') {
        // Create with activation key
        requestBody = {
          createWithActivation: true,
          durationDays: activationKeyForm.durationDays,
          notes: activationKeyForm.notes || 'License with activation key'
        };
      } else {
        // Direct assignment
        requestBody = createForm;
      }

      const response = await fetch('/api/super-admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        if (createForm.createType === 'activation') {
          setGeneratedKey(result);
          setSuccess('Activation key generated successfully! Share this key with the tenant.');
        } else {
          setSuccess('License created successfully!');
        }
        
        setShowCreateForm(false);
        setCreateForm({ tenantId: '', expirationDate: '', notes: '', createType: 'direct' });
        setActivationKeyForm({ durationDays: '30', notes: '' });
        await loadData();
      } else {
        setError(result.error || 'Failed to create license');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleDeleteLicense = async (licenseId: number) => {
    if (!confirm('Are you sure you want to delete this license?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/super-admin/licenses/${licenseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('License deleted successfully!');
        await loadData();
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete license');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleDeletePendingActivation = async (activationId: number, activationKey: string) => {
    if (!confirm(`Are you sure you want to delete activation key "${activationKey}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/super-admin/licenses/pending/${activationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Activation key deleted successfully!');
        await loadData();
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete activation key');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'grace_period':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'suspended':
        return <Pause className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading licenses...</p>
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
          <p className="text-gray-600">Manage tenant licenses and access control</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Create License
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

      {/* Generated Activation Key Display */}
      {generatedKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Activation Key Generated!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-green-700">Activation Key (Share with tenant):</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-white px-3 py-2 rounded border text-lg font-mono text-green-800 flex-1">
                  {generatedKey.activationKey}
                </code>
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(generatedKey.activationKey)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-green-700">License Key:</Label>
                <code className="bg-white px-2 py-1 rounded border text-xs block mt-1">
                  {generatedKey.licenseKey}
                </code>
              </div>
              <div>
                <Label className="text-green-700">Expires:</Label>
                <p className="mt-1">{new Date(generatedKey.expirationDate).toLocaleDateString()}</p>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The tenant must use this activation key to activate their license. 
                The key will appear in the pending activations section until used.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Create License Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New License</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLicense} className="space-y-4">
              {/* License Type Selection */}
              <div>
                <Label>License Creation Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="createType"
                      value="direct"
                      checked={createForm.createType === 'direct'}
                      onChange={(e) => setCreateForm({ ...createForm, createType: e.target.value })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Direct Assignment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="createType"
                      value="activation"
                      checked={createForm.createType === 'activation'}
                      onChange={(e) => setCreateForm({ ...createForm, createType: e.target.value })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Generate Activation Key</span>
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {createForm.createType === 'direct' 
                    ? 'Assign license directly to a specific restaurant'
                    : 'Generate an activation key that tenants can use to activate their license'
                  }
                </p>
              </div>

              {createForm.createType === 'direct' ? (
                // Direct Assignment Form
                <>
                  <div>
                    <Label htmlFor="tenant">Restaurant</Label>
                    <select
                      id="tenant"
                      value={createForm.tenantId}
                      onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      required
                    >
                      <option value="">Select Restaurant</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name} ({restaurant.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="expiration">Expiration Date</Label>
                    <Input
                      id="expiration"
                      type="date"
                      value={createForm.expirationDate}
                      onChange={(e) => setCreateForm({ ...createForm, expirationDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      type="text"
                      placeholder="License notes or description"
                      value={createForm.notes}
                      onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                // Activation Key Form
                <>
                  <div>
                    <Label htmlFor="duration">License Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="3650"
                      value={activationKeyForm.durationDays}
                      onChange={(e) => setActivationKeyForm({ ...activationKeyForm, durationDays: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      License will be valid for this many days from activation date
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="keyNotes">Notes (Optional)</Label>
                    <Input
                      id="keyNotes"
                      type="text"
                      placeholder="License notes or description"
                      value={activationKeyForm.notes}
                      onChange={(e) => setActivationKeyForm({ ...activationKeyForm, notes: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button type="submit">
                  <Key className="w-4 h-4 mr-2" />
                  {createForm.createType === 'direct' ? 'Create License' : 'Generate Activation Key'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Licenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No licenses found</p>
              <p className="text-sm">Create your first license to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Restaurant</th>
                    <th className="text-left p-3">License Key</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Expires</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => (
                    <tr key={license.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{license.tenant_name}</div>
                          <div className="text-sm text-gray-500">/{license.tenant_slug}</div>
                        </div>
                      </td>
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
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(license.expiration_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteLicense(license.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Activations */}
      {pendingActivations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Activations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Activation Key</th>
                    <th className="text-left p-3">License Key</th>
                    <th className="text-left p-3">Duration</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Valid Until</th>
                    <th className="text-left p-3">Notes</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingActivations.map((pending) => (
                    <tr key={pending.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-mono text-sm">
                            {pending.activation_key}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(pending.activation_key)}
                          >
                            Copy
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {pending.license_key}
                        </code>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {pending.duration_days} days
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(pending.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(pending.expiration_date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {pending.notes || 'No notes'}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePendingActivation(pending.id, pending.activation_key)}
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
