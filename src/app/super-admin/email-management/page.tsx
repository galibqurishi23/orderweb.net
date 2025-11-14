'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Settings, Beaker, Users, FileText, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface EmailLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  status: 'success' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
}

interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState('send');
  
  // Manual Email Sending
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Email Testing
  const [testEmail, setTestEmail] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState<SMTPSettings>({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: 'noreply@orderweb.com'
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  
  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to OrderWeb - {{restaurantName}}',
      content: `Dear {{adminName}},

Welcome to OrderWeb! Your restaurant "{{restaurantName}}" has been successfully set up.

Login Details:
- Admin Dashboard: {{dashboardUrl}}
- Username: {{adminEmail}}  
- Password: {{password}}

You can start managing your restaurant immediately by logging into the admin panel.

Best regards,
OrderWeb Team`
    },
    {
      id: 'notification',
      name: 'General Notification',
      subject: 'Important Update from OrderWeb',
      content: `Dear Restaurant Owner,

We have an important update to share with you regarding your OrderWeb account.

{{content}}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
OrderWeb Team`
    },
    {
      id: 'test',
      name: 'Test Email',
      subject: 'OrderWeb SMTP Test Email',
      content: `This is a test email from OrderWeb SMTP service.

If you received this email, the SMTP configuration is working correctly.

Timestamp: {{timestamp}}

Best regards,
OrderWeb Team`
    }
  ]);
  
  // Email Logs
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchEmailLogs();
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/smtp-settings');
      if (response.ok) {
        const data = await response.json();
        setSmtpSettings({
          enabled: data.enabled || false,
          host: data.host || '',
          port: data.port || 587,
          secure: data.secure || false,
          user: data.user || '',
          password: data.password || '',
          from: data.from || 'noreply@orderweb.com'
        });
      }
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
    }
  };

  const saveSmtpSettings = async () => {
    setIsSavingSmtp(true);
    try {
      console.log('💾 Saving SMTP settings:', { ...smtpSettings, password: '***' });
      
      const response = await fetch('/api/super-admin/smtp-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: result.message || "SMTP settings saved successfully. Email service has been reinitialized.",
        });
        
        // Refresh settings to confirm save
        await fetchSmtpSettings();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save SMTP settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      toast({
        title: "Error",
        description: "Failed to save SMTP settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const fetchEmailLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/super-admin/email-logs');
      if (response.ok) {
        const result = await response.json();
        setEmailLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendManualEmail = async () => {
    if (!recipientEmail || !emailSubject || !emailContent) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      console.log('🚀 Sending manual email:', { recipientEmail, emailSubject });
      
      const response = await fetch('/api/super-admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          content: emailContent
        })
      });

      const result = await response.json();
      console.log('📧 Email send result:', result);

      if (result.success) {
        toast({
          title: "Success",
          description: `Email sent successfully to ${recipientEmail}! Message ID: ${result.messageId || 'N/A'}`,
        });
        
        // Clear form
        setRecipientEmail('');
        setEmailSubject('');
        setEmailContent('');
        
        // Refresh email logs
        fetchEmailLogs();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send email",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      console.log('🧪 Testing SMTP connection to:', testEmail);
      
      const response = await fetch('/api/super-admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });

      const result = await response.json();
      console.log('🔧 SMTP test result:', result);
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Success",
          description: "SMTP test email sent successfully! Check your inbox.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "SMTP test failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing SMTP:', error);
      toast({
        title: "Error",
        description: "Failed to test SMTP connection",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    setActiveTab('send');
    
    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied. You can customize it before sending.`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
          <p className="text-muted-foreground">
            Send emails, test SMTP connection, and manage email templates
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Email
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Test SMTP
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            SMTP Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Manual Email
              </CardTitle>
              <CardDescription>
                Send a custom email to any recipient using the OrderWeb SMTP service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Email *</Label>
                <Input
                  id="recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter recipient email address"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content *</Label>
                <Textarea
                  id="content"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter your email message here..."
                  className="w-full min-h-[200px]"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This email will be sent using the OrderWeb SMTP service ({smtpSettings.from || 'SMTP not configured'}).
                  Make sure the recipient email is valid before sending.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSendManualEmail} 
                  disabled={isSending || !recipientEmail || !emailSubject || !emailContent}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Email
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRecipientEmail('');
                    setEmailSubject('');
                    setEmailContent('');
                  }}
                  disabled={isSending}
                >
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Test SMTP Connection
              </CardTitle>
              <CardDescription>
                Send a test email to verify the SMTP configuration is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email Address *</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to receive test message"
                  className="w-full"
                />
              </div>

              <Button 
                onClick={handleTestConnection} 
                disabled={isTestingConnection || !testEmail}
                className="flex items-center gap-2"
              >
                {isTestingConnection ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Beaker className="h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>

              {testResult && (
                <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMTP server settings for sending emails. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label htmlFor="smtp-enabled" className="text-base font-medium">
                    Enable Email Service
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on/off email functionality for the system
                  </p>
                </div>
                <Switch
                  id="smtp-enabled"
                  checked={smtpSettings.enabled}
                  onCheckedChange={(checked) => setSmtpSettings({ ...smtpSettings, enabled: checked })}
                />
              </div>

              {smtpSettings.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">SMTP Host *</Label>
                      <Input
                        id="smtp-host"
                        value={smtpSettings.host}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                        placeholder="smtp.example.com"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">SMTP Port *</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={smtpSettings.port}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) || 587 })}
                        placeholder="587"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="smtp-secure" className="text-base font-medium">
                        Use SSL/TLS
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable secure connection (use for port 465)
                      </p>
                    </div>
                    <Switch
                      id="smtp-secure"
                      checked={smtpSettings.secure}
                      onCheckedChange={(checked) => setSmtpSettings({ ...smtpSettings, secure: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">SMTP Username *</Label>
                    <Input
                      id="smtp-user"
                      type="email"
                      value={smtpSettings.user}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                      placeholder="your-email@example.com"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">SMTP Password *</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={smtpSettings.password}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                      placeholder="Enter your SMTP password"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-from">From Email/Name *</Label>
                    <Input
                      id="smtp-from"
                      value={smtpSettings.from}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                      placeholder="Your Name or noreply@example.com"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will appear as the sender name or email address
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Current Configuration:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>Host: <span className="font-mono">{smtpSettings.host || 'Not configured'}</span></div>
                        <div>Port: <span className="font-mono">{smtpSettings.port}</span> ({smtpSettings.secure ? 'SSL/TLS' : 'No SSL'})</div>
                        <div>User: <span className="font-mono">{smtpSettings.user || 'Not configured'}</span></div>
                        <div>From: <span className="font-mono">{smtpSettings.from}</span></div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={saveSmtpSettings} 
                  disabled={isSavingSmtp || !smtpSettings.enabled || !smtpSettings.host || !smtpSettings.user || !smtpSettings.password}
                  className="flex items-center gap-2"
                >
                  {isSavingSmtp ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Save SMTP Settings
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={fetchSmtpSettings}
                  disabled={isSavingSmtp}
                >
                  Reset to Saved
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Pre-built email templates that you can use and customize
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {emailTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {template.content.substring(0, 100)}...
                      </div>
                      <Button 
                        onClick={() => useTemplate(template)}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Email Logs
              </CardTitle>
              <CardDescription>
                Recent email activity and delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin mr-2" />
                  Loading email logs...
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No email logs available yet. Send some emails to see them here.
                </div>
              ) : (
                <div className="space-y-2">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="font-medium">{log.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            To: {log.to} • {log.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                          {log.status}
                        </Badge>
                        {log.messageId && (
                          <Badge variant="outline" className="text-xs">
                            ID: {log.messageId.substring(0, 8)}...
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <Button onClick={fetchEmailLogs} variant="outline" size="sm">
                  Refresh Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
