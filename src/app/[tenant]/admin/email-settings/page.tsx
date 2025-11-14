'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, Send, CheckCircle, XCircle } from 'lucide-react';

interface SMTPSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password?: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: boolean;
}

export default function EmailSettingsPage() {
  const params = useParams();
  const tenant = params?.tenant as string;
  
  const [settings, setSettings] = useState<SMTPSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, [tenant]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/${tenant}/email-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/${tenant}/email-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'SMTP settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/${tenant}/email-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection',
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_secure: settings.smtp_secure,
          smtp_user: settings.smtp_user,
          smtp_password: settings.smtp_password,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Network error occurred' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestEmailResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      setTestEmailResult({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    setSendingTest(true);
    setTestEmailResult(null);

    try {
      const response = await fetch(`/api/${tenant}/email-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_test_email',
          test_email: testEmail,
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_secure: settings.smtp_secure,
          smtp_user: settings.smtp_user,
          smtp_password: settings.smtp_password,
          smtp_from_email: settings.smtp_from_email,
          smtp_from_name: settings.smtp_from_name,
        }),
      });

      const result = await response.json();
      setTestEmailResult(result);
    } catch (error) {
      setTestEmailResult({ success: false, message: 'Network error occurred' });
    } finally {
      setSendingTest(false);
    }
  };

  const updateSetting = (key: keyof SMTPSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setMessage(null);
    setTestResult(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure SMTP settings for your restaurant's email notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SMTP Configuration</CardTitle>
          <CardDescription>
            Set up your email server settings to send order confirmations and notifications
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* SMTP Examples */}
          <Alert className="border-blue-200 bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <div className="font-medium">📧 Common SMTP Settings:</div>
                <div className="text-xs space-y-2">
                  <div><strong>Gmail:</strong> smtp.gmail.com, Port: 587, Use App Password (not regular password)</div>
                  <div><strong>Outlook/Hotmail:</strong> smtp-mail.outlook.com, Port: 587, Use App Password</div>
                  <div><strong>Yahoo:</strong> smtp.mail.yahoo.com, Port: 587 or 465, Use App Password</div>
                  <div><strong>SendGrid:</strong> smtp.sendgrid.net, Port: 587, Use API Key as password</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Enable/Disable SMTP */}
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
            <Switch
              id="smtp_enabled"
              checked={settings.smtp_enabled}
              onCheckedChange={(checked) => updateSetting('smtp_enabled', checked)}
            />
            <Label htmlFor="smtp_enabled" className="font-medium">
              Enable Custom SMTP
            </Label>
          </div>

          {settings.smtp_enabled && (
            <>
              {/* SMTP Server Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host *</Label>
                  <Input
                    id="smtp_host"
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={settings.smtp_host}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) => updateSetting('smtp_port', parseInt(e.target.value) || 587)}
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Username *</Label>
                  <Input
                    id="smtp_user"
                    type="text"
                    placeholder="your-email@gmail.com"
                    value={settings.smtp_user}
                    onChange={(e) => updateSetting('smtp_user', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    placeholder="Enter password"
                    value={settings.smtp_password || ''}
                    onChange={(e) => updateSetting('smtp_password', e.target.value)}
                  />
                </div>
              </div>

              {/* From Email Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">From Email *</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    placeholder="noreply@yourrestaurant.com"
                    value={settings.smtp_from_email}
                    onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input
                    id="smtp_from_name"
                    type="text"
                    placeholder="Your Restaurant"
                    value={settings.smtp_from_name}
                    onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                  />
                </div>
              </div>

              {/* Security Setting */}
              <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Switch
                  id="smtp_secure"
                  checked={settings.smtp_secure}
                  onCheckedChange={(checked) => updateSetting('smtp_secure', checked)}
                />
                <Label htmlFor="smtp_secure" className="text-sm">
                  Use TLS/SSL (Recommended for port 587/465)
                </Label>
              </div>

              {/* Test Connection */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing || !settings.smtp_host || !settings.smtp_user}
                    variant="outline"
                    size="sm"
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  
                  {testResult && (
                    <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
                
                {testResult && !testResult.success && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Connection failed. Please check your SMTP settings and try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Send Test Email */}
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Send Test Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Send a test email to verify your SMTP settings are working correctly.
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <Input
                      type="email"
                      placeholder="Enter test email address"
                      value={testEmail}
                      onChange={(e) => {
                        setTestEmail(e.target.value);
                        setTestEmailResult(null);
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={sendingTest || !settings.smtp_host || !settings.smtp_user || !testEmail.trim()}
                      variant="outline"
                      size="sm"
                    >
                      {sendingTest ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Test
                    </Button>
                  </div>
                  
                  {testEmailResult && (
                    <div className={`flex items-start gap-2 text-sm ${testEmailResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testEmailResult.success ? (
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        {testEmailResult.success ? (
                          <span className="font-medium">{testEmailResult.message}</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-medium">Email Send Failed</div>
                            <div className="text-xs whitespace-pre-line leading-relaxed">
                              {testEmailResult.message}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {testEmailResult && !testEmailResult.success && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <XCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="space-y-2">
                          <div className="font-medium">💡 Quick Troubleshooting Tips:</div>
                          <ul className="text-xs space-y-1 list-disc list-inside">
                            <li>For Gmail: Use App Passwords instead of your regular password</li>
                            <li>For Outlook/Yahoo: Enable 2FA and create App Password</li>
                            <li>Try port 587 (STARTTLS) instead of 465 (SSL)</li>
                            <li>Contact your hosting provider about SMTP restrictions</li>
                            <li>Consider using SendGrid, Mailgun, or AWS SES for better deliverability</li>
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Messages */}
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-24"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Common SMTP Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Gmail:</strong><br />
              Host: smtp.gmail.com<br />
              Port: 587<br />
              TLS: Enabled
            </div>
            <div>
              <strong>Outlook:</strong><br />
              Host: smtp.live.com<br />
              Port: 587<br />
              TLS: Enabled
            </div>
          </div>
          <p className="text-muted-foreground mt-4">
            For Gmail, you'll need to use an App Password instead of your regular password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
