'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, TestTube, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_from: string;
  has_config: boolean;
}

interface TenantEmailConfigProps {
  tenantId: string;
  tenantName: string;
}

export default function TenantEmailConfig({ tenantId, tenantName }: TenantEmailConfigProps) {
  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_from: '',
    has_config: false
  });
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadEmailConfig();
  }, [tenantId]);

  const loadEmailConfig = async () => {
    try {
      const response = await fetch(`/api/tenant/email-config?tenantId=${tenantId}`);
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const handleConfigChange = (field: keyof EmailConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveConfig = async () => {
    if (!config.smtp_host || !config.smtp_user || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/tenant/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_secure: config.smtp_secure,
          smtp_user: config.smtp_user,
          smtp_password: password,
          smtp_from: config.smtp_from || `${tenantName} <${config.smtp_user}>`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "SMTP configuration saved successfully"
        });
        setHasChanges(false);
        await loadEmailConfig();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save SMTP configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save SMTP configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConfig = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/tenant/email-config/test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, testEmail })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Test email sent successfully! Check your inbox."
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send test email",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test email configuration",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Email Configuration</h2>
        {config.has_config && (
          <Badge variant="secondary" className="ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        )}
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            SMTP Configuration
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Test Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Server Settings</CardTitle>
              <CardDescription>
                Configure your own SMTP server for sending emails from your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Your SMTP credentials are encrypted and stored securely. 
                  We recommend using app-specific passwords when available.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host *</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={config.smtp_host}
                    onChange={(e) => handleConfigChange('smtp_host', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={config.smtp_port}
                    onChange={(e) => handleConfigChange('smtp_port', parseInt(e.target.value) || 587)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Email Address *</Label>
                  <Input
                    id="smtp_user"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={config.smtp_user}
                    onChange={(e) => handleConfigChange('smtp_user', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your email password or app password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="smtp_from">From Email Address</Label>
                  <Input
                    id="smtp_from"
                    placeholder={`${tenantName} <${config.smtp_user}>`}
                    value={config.smtp_from}
                    onChange={(e) => handleConfigChange('smtp_from', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    How emails will appear to be sent from (optional)
                  </p>
                </div>

                <div className="flex items-center space-x-2 col-span-2">
                  <Switch
                    id="smtp_secure"
                    checked={config.smtp_secure}
                    onCheckedChange={(checked) => handleConfigChange('smtp_secure', checked)}
                  />
                  <Label htmlFor="smtp_secure">Use SSL/TLS (Recommended for ports 465, 993)</Label>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button
                  onClick={handleSaveConfig}
                  disabled={isLoading || !hasChanges}
                  className="min-w-[120px]"
                >
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
                
                {hasChanges && (
                  <Badge variant="outline" className="text-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
              </div>

              <Alert className="mt-4">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Common SMTP Settings:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Gmail: smtp.gmail.com, Port 587, SSL/TLS</li>
                    <li>• Outlook: smtp-mail.outlook.com, Port 587, STARTTLS</li>
                    <li>• Yahoo: smtp.mail.yahoo.com, Port 587, SSL/TLS</li>
                    <li>• Hostinger: smtp.hostinger.com, Port 465, SSL/TLS</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Email Configuration</CardTitle>
              <CardDescription>
                Send a test email to verify your SMTP configuration is working
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config.has_config && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please configure your SMTP settings first before testing.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="Enter email address to test"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={!config.has_config}
                />
              </div>

              <Button
                onClick={handleTestConfig}
                disabled={isTesting || !config.has_config || !testEmail}
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Sending Test Email...' : 'Send Test Email'}
              </Button>

              {config.has_config && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    SMTP configuration is set up. You can now send test emails and use this configuration for order confirmations and notifications.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
