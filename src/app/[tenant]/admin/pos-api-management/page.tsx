'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw, AlertTriangle, Info, Plug, Key, Database, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface POSConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  has_api_key: boolean;
  api_key_preview: string | null;
  full_api_key?: string;
  integration_status: 'configured' | 'not_configured';
  database_config?: {
    host: string;
    database: string;
    username: string;
    password: string;
    port: number;
    status: 'active' | 'inactive';
  };
}

interface ConnectionStatus {
  connected: boolean;
  connectionCount: number;
  status: 'connected' | 'disconnected' | 'error';
  timestamp: string;
  details?: {
    tenant: string;
    activeDevices: number;
  };
}

export default function POSApiManagementPage({ params }: { params: { tenant: string } }) {
  const [config, setConfig] = useState<POSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/tenant/${params.tenant}/pos-config`);
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
        if (result.data.full_api_key) {
          setCurrentApiKey(result.data.full_api_key);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load POS configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch(`/api/tenant/${params.tenant}/pos-connection-status`);
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus(result);
      } else {
        setConnectionStatus({
          connected: false,
          connectionCount: 0,
          status: 'error',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        connectionCount: 0,
        status: 'error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setCheckingConnection(false);
    }
  };

  const generateApiKey = async (regenerate = false) => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/tenant/${params.tenant}/pos-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regenerate,
          description: `POS API Integration for ${config?.tenant.name || params.tenant}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentApiKey(result.data.api_key);
        await fetchConfig();
        
        toast({
          title: "Success",
          description: regenerate ? "API key regenerated successfully" : "API key generated successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${regenerate ? 'regenerate' : 'generate'} API key`,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  useEffect(() => {
    fetchConfig();
    checkConnectionStatus();

    // Poll connection status every 15 seconds
    const intervalId = setInterval(() => {
      checkConnectionStatus();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [params.tenant]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load POS configuration. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3 mb-2">
          <Plug className="w-8 h-8 text-blue-600" />
          Live Order System - POS Integration
        </h1>
        <p className="text-gray-600">
          Get orders instantly (0 seconds) instead of waiting 30+ seconds
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Essential credentials for POS integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Restaurant ID */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Restaurant ID:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.tenant.slug}
                className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                readOnly
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(config.tenant.slug)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">API Key:</label>
            {!config.has_api_key ? (
              <div className="space-y-3">
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-md text-center">
                  <p className="text-gray-500 mb-3">No API key generated yet</p>
                  <Button 
                    onClick={() => generateApiKey(false)}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Generate API Key
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentApiKey || config.api_key_preview || 'pos_****...'}
                    className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(currentApiKey || config.api_key_preview || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateApiKey(true)}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate API Key'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* API Endpoint */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">API Endpoint (Current - Slow):</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value="https://orderweb.net/api/pos/pull-orders"
                className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                readOnly
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard("https://orderweb.net/api/pos/pull-orders")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* POS Integration Configuration - Kitchen Restaurant Only */}
      {config.tenant.slug === 'kitchen' && (
        <Card className="mb-6 border-purple-300 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Plug className="w-6 h-6 text-purple-600" />
              POS Integration Configuration
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Configure your POS to receive live orders, manage gift cards, and loyalty points
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">

            {/* Connection Status */}
            <div className="mb-6 p-4 bg-white border-2 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {connectionStatus?.connected ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-green-700">
                          POS Status: Connected
                        </span>
                        <span className="text-xs text-gray-500">
                          {connectionStatus.connectionCount} device{connectionStatus.connectionCount !== 1 ? 's' : ''} active
                        </span>
                      </div>
                    </>
                  ) : connectionStatus?.status === 'error' ? (
                    <>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-yellow-700">
                          POS Status: Server Error
                        </span>
                        <span className="text-xs text-gray-500">
                          Cannot reach WebSocket server
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">
                          POS Status: Disconnected
                        </span>
                        <span className="text-xs text-gray-500">
                          No active connections
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {connectionStatus?.timestamp && 
                      `Updated ${new Date(connectionStatus.timestamp).toLocaleTimeString()}`
                    }
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkConnectionStatus}
                    disabled={checkingConnection}
                  >
                    {checkingConnection ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* WebSocket Connection Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                  📡 WebSocket Connection
                </h3>
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                  INSTANT - 0.1s
                </span>
              </div>

              <Alert className="mb-4 border-green-200 bg-green-100">
                <Info className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-green-800 text-sm">
                  Real-time push notifications for new orders, gift cards, and loyalty points
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {/* WebSocket URL */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">WebSocket URL:</label>
                  <input
                    type="text"
                    value={`wss://orderweb.net/ws/pos/${config.tenant.slug}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(`wss://orderweb.net/ws/pos/${config.tenant.slug}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* Restaurant ID */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Restaurant ID:</label>
                  <input
                    type="text"
                    value={config.tenant.slug}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(config.tenant.slug)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* API Key */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">API Key:</label>
                  <input
                    type="text"
                    value={currentApiKey || config.api_key_preview || 'pos_31c6ea6cf5f4bd718898e61091b14633...'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(currentApiKey || config.api_key_preview || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* WebSocket Events */}
              <div className="mt-4 p-3 bg-white rounded-md border border-green-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">WebSocket Events Your POS Will Receive:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <code className="font-mono">new_order</code>
                    <span className="text-gray-500 text-[10px] ml-auto">Online orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <code className="font-mono">order_updated</code>
                    <span className="text-gray-500 text-[10px] ml-auto">Status changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <code className="font-mono">gift_card_purchased</code>
                    <span className="text-gray-500 text-[10px] ml-auto">Online purchases</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <code className="font-mono">loyalty_updated</code>
                    <span className="text-gray-500 text-[10px] ml-auto">Points earned</span>
                  </div>
                </div>
              </div>
            </div>

            {/* REST API Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  🔗 REST API
                </h3>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  BACKUP - 2-4s
                </span>
              </div>

              <Alert className="mb-4 border-blue-200 bg-blue-100">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertDescription className="text-blue-800 text-sm">
                  Use for gift card balance checks, loyalty points, and manual order pulls
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {/* API Base URL */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">API Base URL:</label>
                  <input
                    type="text"
                    value={`https://orderweb.net/api/${config.tenant.slug}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(`https://orderweb.net/api/${config.tenant.slug}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* Restaurant ID */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Restaurant ID:</label>
                  <input
                    type="text"
                    value={config.tenant.slug}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(config.tenant.slug)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* API Key */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">API Key:</label>
                  <input
                    type="text"
                    value={currentApiKey || config.api_key_preview || 'pos_31c6ea6cf5f4bd718898e61091b14633...'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(currentApiKey || config.api_key_preview || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Authentication Headers */}
              <div className="mt-4 p-3 bg-white rounded-md border border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Authentication Headers (Include in all API requests):</p>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span><strong>X-Tenant-ID:</strong> {config.tenant.slug}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(`X-Tenant-ID: ${config.tenant.slug}`)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span><strong>X-API-Key:</strong> {config.api_key_preview || 'pos_31c6ea6...'}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(`X-API-Key: ${currentApiKey || config.api_key_preview || ''}`)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Available Endpoints */}
              <div className="mt-4 p-3 bg-white rounded-md border border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Available Endpoints:</p>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">GET</span>
                    <span>/health</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Health check</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">GET</span>
                    <span>/orders/pending</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Get pending orders</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">GET</span>
                    <span>/gift-cards/{'{card_number}'}/balance</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Check balance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">POST</span>
                    <span>/gift-cards/{'{card_number}'}/deduct</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Deduct amount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">GET</span>
                    <span>/loyalty/{'{phone}'}/points</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Check points</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">POST</span>
                    <span>/loyalty/{'{phone}'}/add</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Add points</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">POST</span>
                    <span>/loyalty/{'{phone}'}/redeem</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Redeem points</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">POST</span>
                    <span>/reports/daily</span>
                    <span className="text-gray-500 text-[10px] ml-auto">Upload daily report</span>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => {
                  const apiDocs = `API Base URL: https://orderweb.net/api/${config.tenant.slug}
Headers:
  X-Tenant-ID: ${config.tenant.slug}
  X-API-Key: ${currentApiKey || config.api_key_preview || ''}

Endpoints:
  GET  /health
  GET  /orders/pending
  GET  /gift-cards/{card_number}/balance
  POST /gift-cards/{card_number}/deduct
  GET  /loyalty/{phone}/points
  POST /loyalty/{phone}/add
  POST /loyalty/{phone}/redeem
  POST /reports/daily`;
                  copyToClipboard(apiDocs);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All API Documentation
              </Button>
            </div>

            {/* Regenerate API Key */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">Security</h4>
                  <p className="text-xs text-gray-600">Regenerate your API key if you suspect it has been compromised</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-yellow-300 hover:bg-yellow-100"
                  onClick={() => generateApiKey(true)}
                  disabled={generating}
                >
                  {generating ? 'Regenerating...' : 'Regenerate API Key'}
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
