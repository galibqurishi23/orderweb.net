'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Copy,
  Trash2,
  Power,
  AlertCircle,
  Activity
} from "lucide-react";

interface POSDevice {
  id: number;
  device_id: string;
  device_name: string;
  api_key: string;
  is_active: boolean;
  last_seen_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
}

interface DeviceHealth {
  device_id: string;
  device_name: string;
  status: 'online' | 'offline' | 'disabled';
  last_seen_minutes_ago: number | null;
  orders_processed: number;
}

export default function POSDevices({ params }: { params: { tenant: string } }) {
  const tenantSlug = params.tenant;
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [healthData, setHealthData] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_id: '', device_name: '' });
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // Fetch devices list
      const devicesRes = await fetch(`/api/admin/pos-devices?tenant=${tenantSlug}`);
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data.devices || []);
      }

      // Fetch health status
      const healthRes = await fetch(`/api/admin/pos-health?tenant=${tenantSlug}`);
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealthData(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  const handleAddDevice = async () => {
    if (!newDevice.device_id || !newDevice.device_name) {
      alert('Please fill in all fields');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/pos-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantSlug,
          device_id: newDevice.device_id,
          device_name: newDevice.device_name
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedApiKey(data.api_key);
        setNewDevice({ device_id: '', device_name: '' });
        fetchDevices();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || 'Failed to create device'}`);
      }
    } catch (error) {
      console.error('Error adding device:', error);
      alert('Failed to add device');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleDevice = async (deviceId: string, currentStatus: boolean) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/pos-devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantSlug,
          device_id: deviceId,
          is_active: !currentStatus
        })
      });

      if (res.ok) {
        fetchDevices();
      } else {
        alert('Failed to update device status');
      }
    } catch (error) {
      console.error('Error toggling device:', error);
      alert('Failed to update device');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(`Are you sure you want to delete device ${deviceId}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/pos-devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantSlug,
          device_id: deviceId
        })
      });

      if (res.ok) {
        fetchDevices();
      } else {
        alert('Failed to delete device');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getDeviceHealth = (deviceId: string): DeviceHealth | undefined => {
    return healthData.find(h => h.device_id === deviceId);
  };

  const getStatusBadge = (device: POSDevice) => {
    const health = getDeviceHealth(device.device_id);
    
    if (!device.is_active) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    if (!health) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    switch (health.status) {
      case 'online':
        return <Badge className="bg-green-500">🟢 Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">🔴 Offline</Badge>;
      default:
        return <Badge variant="outline">{health.status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const onlineCount = devices.filter(d => {
    const health = getDeviceHealth(d.device_id);
    return d.is_active && health?.status === 'online';
  }).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Devices</h1>
          <p className="text-gray-500 mt-1">Manage POS terminals and API keys</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Device
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{onlineCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offline/Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-400">{devices.length - onlineCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Devices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No devices configured yet.</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Device
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const health = getDeviceHealth(device.device_id);
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Activity className={`w-8 h-8 ${device.is_active && health?.status === 'online' ? 'text-green-500' : 'text-gray-400'}`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{device.device_name}</h3>
                          {getStatusBadge(device)}
                        </div>
                        <p className="text-sm text-gray-500">{device.device_id}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Last seen: {formatTimestamp(device.last_seen_at)}</span>
                          {health && (
                            <span>Orders: {health.orders_processed}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Copy API Key */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(device.api_key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      {/* Enable/Disable */}
                      <Button
                        variant={device.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleDevice(device.device_id, device.is_active)}
                        disabled={processing}
                      >
                        <Power className="w-4 h-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDevice(device.device_id)}
                        disabled={processing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Success Toast */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          API Key copied to clipboard!
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New POS Device</DialogTitle>
            <DialogDescription>
              Configure a new POS terminal. A unique API key will be generated.
            </DialogDescription>
          </DialogHeader>

          {!generatedApiKey ? (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="device_id">Device ID</Label>
                  <Input
                    id="device_id"
                    placeholder="POS-KITCHEN-01"
                    value={newDevice.device_id}
                    onChange={(e) => setNewDevice({ ...newDevice, device_id: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier for this device</p>
                </div>

                <div>
                  <Label htmlFor="device_name">Device Name</Label>
                  <Input
                    id="device_name"
                    placeholder="Kitchen Display 1"
                    value={newDevice.device_name}
                    onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Human-readable name</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDevice} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Device'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Device created successfully! Save the API key below - it won't be shown again.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 py-4">
                <div>
                  <Label>API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={generatedApiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(generatedApiKey)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use this API key in your POS terminal configuration
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Copy this API key now. For security reasons, it cannot be retrieved later.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setGeneratedApiKey(null);
                    setShowAddDialog(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
