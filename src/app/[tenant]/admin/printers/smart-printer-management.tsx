'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Zap,
  Eye,
  Copy
} from 'lucide-react';

interface POSConfig {
  endpointUrl: string;
  apiKey: string;
  timeout: number;
  enabled: boolean;
}

interface FailedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  retryCount: number;
  lastRetryAt?: Date;
  fireSchedule?: {
    fireTime: Date;
    customerDesiredTime: Date;
    status: 'HOLD' | 'FIRED' | 'FAILED' | 'PRINTED';
  };
}

interface AdvanceOrderWithSchedule {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  scheduledTime: Date;
  fireSchedule?: {
    fireTime: Date;
    status: 'HOLD' | 'READY_TO_FIRE' | 'FIRED' | 'PRINTED' | 'FAILED';
    retryCount: number;
  };
}

export default function SmartPrinterManagementPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { toast } = useToast();

  // State management
  const [posConfig, setPOSConfig] = useState<POSConfig>({
    endpointUrl: '',
    apiKey: '',
    timeout: 30,
    enabled: false
  });
  
  const [failedOrders, setFailedOrders] = useState<FailedOrder[]>([]);
  const [advanceOrders, setAdvanceOrders] = useState<AdvanceOrderWithSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<FailedOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadPOSConfig();
    loadFailedOrders();
    loadAdvanceOrders();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadFailedOrders();
      loadAdvanceOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [tenantSlug]);

  /**
   * Load POS configuration
   */
  const loadPOSConfig = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/pos-config`);
      if (response.ok) {
        const config = await response.json();
        setPOSConfig(config);
      }
    } catch (error) {
      console.error('Error loading POS config:', error);
    }
  };

  /**
   * Save POS configuration
   */
  const savePOSConfig = async () => {
    try {
      setConfigSaving(true);
      
      const response = await fetch(`/api/${tenantSlug}/pos-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posConfig)
      });
      
      if (response.ok) {
        toast({
          title: 'Configuration Saved',
          description: 'POS integration settings have been updated successfully.'
        });
      } else {
        throw new Error('Failed to save configuration');
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save POS configuration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setConfigSaving(false);
    }
  };

  /**
   * Test POS connection
   */
  const testPOSConnection = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/${tenantSlug}/pos-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posConfig)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to POS system.'
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message || 'Could not connect to POS system.',
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Failed to test POS connection. Please check your settings.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load failed orders
   */
  const loadFailedOrders = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/failed-orders`);
      if (response.ok) {
        const orders = await response.json();
        setFailedOrders(orders);
      }
    } catch (error) {
      console.error('Error loading failed orders:', error);
    }
  };

  /**
   * Load advance orders with schedules
   */
  const loadAdvanceOrders = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/advance-orders-scheduled`);
      if (response.ok) {
        const orders = await response.json();
        setAdvanceOrders(orders);
      }
    } catch (error) {
      console.error('Error loading advance orders:', error);
    }
  };

  /**
   * Manual retry for failed order
   */
  const manualRetry = async (orderId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/${tenantSlug}/manual-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      
      if (response.ok) {
        toast({
          title: 'Retry Initiated',
          description: 'Order has been sent to POS system for printing.'
        });
        
        // Refresh failed orders list
        loadFailedOrders();
      } else {
        throw new Error('Failed to retry order');
      }
      
    } catch (error) {
      toast({
        title: 'Retry Failed',
        description: 'Could not retry the order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * View order details
   */
  const viewOrderDetails = (order: FailedOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'HOLD': return 'secondary';
      case 'READY_TO_FIRE': return 'outline';
      case 'FIRED': return 'default';
      case 'PRINTED': return 'default';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HOLD': return <Clock className="w-4 h-4" />;
      case 'READY_TO_FIRE': return <Zap className="w-4 h-4" />;
      case 'FIRED': return <Activity className="w-4 h-4" />;
      case 'PRINTED': return <CheckCircle className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Printer Management</h1>
          <p className="text-muted-foreground">
            Automated POS integration with intelligent order processing
          </p>
        </div>
        <Button
          onClick={() => {
            loadFailedOrders();
            loadAdvanceOrders();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pos-config">POS Configuration</TabsTrigger>
          <TabsTrigger value="failed-orders">Failed Orders</TabsTrigger>
          <TabsTrigger value="advance-orders">Advance Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">POS Status</CardTitle>
                {posConfig.enabled ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {posConfig.enabled ? 'Connected' : 'Disconnected'}
                </div>
                <p className="text-xs text-muted-foreground">
                  POS integration status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Orders</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{failedOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  Require manual attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Advance Orders</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{advanceOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled for auto-fire
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                How the smart automation system works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">🤖 Automated Process</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Orders automatically fire 90 minutes before customer pickup time</li>
                    <li>• POS system handles all printing and receipt formatting</li>
                    <li>• Failed prints retry 3 times with 2-minute intervals</li>
                    <li>• Daily email alerts sent at 8 AM for advance orders</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3">🔧 Manual Intervention</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Only failed orders appear in manual print area</li>
                    <li>• Successful orders move directly to "All Orders"</li>
                    <li>• Real-time status updates from POS system</li>
                    <li>• Order conflict detection and alerts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS Configuration Tab */}
        <TabsContent value="pos-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                POS System Configuration
              </CardTitle>
              <CardDescription>
                Configure your .NET POS system connection for automatic printing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="endpointUrl">POS API Endpoint URL</Label>
                    <Input
                      id="endpointUrl"
                      value={posConfig.endpointUrl}
                      onChange={(e) => setPOSConfig(prev => ({ ...prev, endpointUrl: e.target.value }))}
                      placeholder="http://your-pos-system:8080"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The URL where your POS system API is running
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key (Optional)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={posConfig.apiKey}
                      onChange={(e) => setPOSConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API key if required"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Authentication key for secure API access
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="5"
                      max="120"
                      value={posConfig.timeout}
                      onChange={(e) => setPOSConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum time to wait for POS response
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      <strong>POS System Requirements:</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• API endpoint: POST /api/print-order</li>
                        <li>• Status endpoint: GET /api/print-status/[jobId]</li>
                        <li>• Accepts JSON order data</li>
                        <li>• Returns print job ID and status</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={posConfig.enabled}
                      onChange={(e) => setPOSConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="enabled">Enable POS Integration</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button 
                  onClick={savePOSConfig}
                  disabled={configSaving}
                >
                  {configSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={testPOSConnection}
                  disabled={loading || !posConfig.endpointUrl}
                >
                  {loading ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Orders Tab */}
        <TabsContent value="failed-orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Failed Print Orders
              </CardTitle>
              <CardDescription>
                Orders that failed to print automatically - require manual intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-medium mb-2">All Orders Printed Successfully!</h3>
                  <p className="text-muted-foreground">
                    No failed orders found. All orders are printing automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Retry Count</TableHead>
                        <TableHead>Last Attempt</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.orderNumber}</div>
                              <Badge variant="destructive" className="text-xs">
                                Failed
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>£{order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.retryCount}/3
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.lastRetryAt 
                              ? new Date(order.lastRetryAt).toLocaleString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => manualRetry(order.id)}
                                disabled={loading}
                              >
                                Retry Print
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewOrderDetails(order)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advance Orders Tab */}
        <TabsContent value="advance-orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Advance Order Schedule
              </CardTitle>
              <CardDescription>
                View advance orders and their automatic fire times
              </CardDescription>
            </CardHeader>
            <CardContent>
              {advanceOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Advance Orders</h3>
                  <p className="text-muted-foreground">
                    No advance orders scheduled at this time.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Customer Time</TableHead>
                        <TableHead>Fire Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advanceOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="font-medium">{order.orderNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-sm text-muted-foreground">
                                {order.customerPhone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(order.scheduledTime).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.fireSchedule?.fireTime 
                                ? new Date(order.fireSchedule.fireTime).toLocaleString()
                                : 'TBD'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={getStatusBadgeVariant(order.fireSchedule?.status || 'HOLD')}
                              className="flex items-center gap-1"
                            >
                              {getStatusIcon(order.fireSchedule?.status || 'HOLD')}
                              {order.fireSchedule?.status || 'HOLD'}
                            </Badge>
                          </TableCell>
                          <TableCell>£{order.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Detailed information for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Order Number:</strong> {selectedOrder.orderNumber}</div>
                <div><strong>Customer:</strong> {selectedOrder.customerName}</div>
                <div><strong>Total:</strong> £{selectedOrder.total.toFixed(2)}</div>
                <div><strong>Status:</strong> {selectedOrder.status}</div>
                <div><strong>Retry Count:</strong> {selectedOrder.retryCount}/3</div>
                <div>
                  <strong>Last Retry:</strong> {
                    selectedOrder.lastRetryAt 
                      ? new Date(selectedOrder.lastRetryAt).toLocaleString()
                      : 'Never'
                  }
                </div>
              </div>
              
              {selectedOrder.fireSchedule && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Fire Schedule Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Customer Desired Time:</strong> {new Date(selectedOrder.fireSchedule.customerDesiredTime).toLocaleString()}</div>
                    <div><strong>Kitchen Fire Time:</strong> {new Date(selectedOrder.fireSchedule.fireTime).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
