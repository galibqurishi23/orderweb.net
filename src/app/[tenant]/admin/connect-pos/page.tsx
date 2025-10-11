'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface POSConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  has_api_key: boolean;
  api_key_preview: string | null;
  pending_orders_count: number;
  integration_status: 'configured' | 'not_configured';
  integration_urls: {
    pending_orders: string;
    confirm_order: string;
    daily_report: string;
  } | null;
}

export default function ConnectPOSPage({ params }: { params: { tenant: string } }) {
  const [config, setConfig] = useState<POSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/tenant/${params.tenant}/pos-config`);
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
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
          description: `POS Integration for ${config?.tenant.name}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setNewApiKey(result.data.api_key);
        await fetchConfig(); // Refresh config
        
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Integration</h1>
          <p className="text-gray-600 mt-2">
            Connect your Point of Sale system to receive online orders automatically
          </p>
        </div>
        
        <Badge variant={config.integration_status === 'configured' ? 'default' : 'secondary'}>
          {config.integration_status === 'configured' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              Configured
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-1" />
              Not Configured
            </>
          )}
        </Badge>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-600">API Key Status</div>
              <div className="text-lg font-semibold">
                {config.has_api_key ? (
                  <span className="text-green-600">Generated</span>
                ) : (
                  <span className="text-orange-600">Not Generated</span>
                )}
              </div>
              {config.api_key_preview && (
                <div className="text-xs text-gray-500 mt-1">
                  Key: {config.api_key_preview}
                </div>
              )}
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-600">Pending Orders</div>
              <div className="text-lg font-semibold">
                {config.pending_orders_count} orders waiting
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Orders waiting for POS pickup
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>
            Generate or regenerate your POS API key for secure authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config.has_api_key ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Key Generated</h3>
              <p className="text-gray-600 mb-4">
                Generate an API key to start connecting your POS system
              </p>
              <Button 
                onClick={() => generateApiKey(false)}
                disabled={generating}
                size="lg"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate API Key'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {newApiKey && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold">New API Key Generated:</div>
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded font-mono text-sm">
                        <code className="flex-1">{newApiKey}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(newApiKey)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-amber-600">
                        ⚠️ Save this key securely. It will not be shown again in full.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => generateApiKey(true)}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Key
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={fetchConfig}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Instructions */}
      {config.has_api_key && config.integration_urls && (
        <Card>
          <CardHeader>
            <CardTitle>POS Developer Instructions</CardTitle>
            <CardDescription>
              Share these details with your POS system developer for integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Setup */}
            <div>
              <h4 className="font-semibold mb-3">Quick Setup Information</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">Restaurant Slug</div>
                    <div className="text-sm text-gray-600">Use this in API URLs</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-gray-100 rounded">{config.tenant.slug}</code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(config.tenant.slug)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">API Key</div>
                    <div className="text-sm text-gray-600">Bearer token for authentication</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-gray-100 rounded">{config.api_key_preview}</code>
                    <Button variant="outline" size="sm" disabled>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* API Endpoints */}
            <div>
              <h4 className="font-semibold mb-3">API Endpoints</h4>
              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">1. Fetch Pending Orders</div>
                      <div className="text-sm text-gray-600">Poll every 60 seconds for new orders</div>
                    </div>
                    <Badge variant="outline">GET</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded">
                      {config.integration_urls.pending_orders}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(config.integration_urls!.pending_orders)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">2. Confirm Order Receipt</div>
                      <div className="text-sm text-gray-600">Confirm order was received by POS</div>
                    </div>
                    <Badge variant="outline">POST</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded">
                      {config.integration_urls.confirm_order}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(config.integration_urls!.confirm_order)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">3. Send Daily Report (Optional)</div>
                      <div className="text-sm text-gray-600">Send daily sales data back to platform</div>
                    </div>
                    <Badge variant="outline">POST</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded">
                      {config.integration_urls.daily_report}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(config.integration_urls!.daily_report)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Authentication Example */}
            <div>
              <h4 className="font-semibold mb-3">Authentication Example</h4>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm font-mono">
                  <div>curl -H "Authorization: Bearer [YOUR_API_KEY]" \</div>
                  <div className="ml-4">{config.integration_urls.pending_orders}</div>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Need Help?</div>
                  <div>Contact your POS system provider with these integration details.</div>
                  <div>Most modern POS systems can implement this integration in 1-2 hours.</div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
