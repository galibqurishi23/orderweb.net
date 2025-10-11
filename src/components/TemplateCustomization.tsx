'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Save, X, Palette, Type, Image, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplateCustomizationProps {
  template: any;
  onSave: (template: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function TemplateCustomization({ template, onSave, onCancel, isOpen }: TemplateCustomizationProps) {
  const [customTemplate, setCustomTemplate] = useState({
    id: template?.id || '',
    name: template?.name || '',
    template_type: template?.template_type || 'order_confirmation',
    subject: template?.subject || '',
    html_content: template?.html_content || '',
    text_content: template?.text_content || '',
    variables: template?.variables || '{}',
    active: template?.active !== false
  });

  const [previewData, setPreviewData] = useState(() => {
    try {
      return JSON.parse(template?.variables || '{}');
    } catch {
      return {};
    }
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('design');
  const { toast } = useToast();

  const handleSave = async () => {
    if (!customTemplate.subject || !customTemplate.html_content) {
      toast({
        title: 'Validation Error',
        description: 'Subject and HTML content are required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(customTemplate);
      toast({
        title: 'Template Saved',
        description: 'Your email template has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save Error',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (colorType: string, color: string) => {
    let updatedContent = customTemplate.html_content;
    
    switch (colorType) {
      case 'primary':
        updatedContent = updatedContent.replace(/#667eea/g, color);
        updatedContent = updatedContent.replace(/#764ba2/g, color);
        break;
      case 'secondary':
        updatedContent = updatedContent.replace(/#27ae60/g, color);
        updatedContent = updatedContent.replace(/#2c3e50/g, color);
        break;
      case 'background':
        updatedContent = updatedContent.replace(/#f4f4f4/g, color);
        updatedContent = updatedContent.replace(/#ecf0f1/g, color);
        break;
    }
    
    setCustomTemplate(prev => ({
      ...prev,
      html_content: updatedContent
    }));
  };

  const handleRestaurantInfoChange = (field: string, value: string) => {
    const updatedPreviewData = { ...previewData, [field]: value };
    setPreviewData(updatedPreviewData);
    
    setCustomTemplate(prev => ({
      ...prev,
      variables: JSON.stringify(updatedPreviewData)
    }));
  };

  const generatePreviewContent = () => {
    let content = customTemplate.html_content;
    
    // Replace template variables with preview data
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    return content;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Customize Email Template: {template?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color Customization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        defaultValue="#667eea"
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">Header & Accents</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        defaultValue="#27ae60"
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">Success & Highlights</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        defaultValue="#f4f4f4"
                        onChange={(e) => handleColorChange('background', e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">Email Background</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Email Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={customTemplate.name}
                    onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={customTemplate.template_type}
                    onValueChange={(value) => setCustomTemplate(prev => ({ ...prev, template_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                      <SelectItem value="order_complete">Order Complete</SelectItem>
                      <SelectItem value="restaurant_notification">Restaurant Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={customTemplate.subject}
                    onChange={(e) => setCustomTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label>HTML Content</Label>
                  <Textarea
                    value={customTemplate.html_content}
                    onChange={(e) => setCustomTemplate(prev => ({ ...prev, html_content: e.target.value }))}
                    placeholder="Enter HTML content"
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Restaurant Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Restaurant Name</Label>
                    <Input
                      value={previewData.restaurant_name || ''}
                      onChange={(e) => handleRestaurantInfoChange('restaurant_name', e.target.value)}
                      placeholder="Your Restaurant Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Restaurant Phone</Label>
                    <Input
                      value={previewData.restaurant_phone || ''}
                      onChange={(e) => handleRestaurantInfoChange('restaurant_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Restaurant Email</Label>
                    <Input
                      value={previewData.restaurant_email || ''}
                      onChange={(e) => handleRestaurantInfoChange('restaurant_email', e.target.value)}
                      placeholder="info@yourrestaurant.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Restaurant Address</Label>
                    <Input
                      value={previewData.restaurant_address || ''}
                      onChange={(e) => handleRestaurantInfoChange('restaurant_address', e.target.value)}
                      placeholder="123 Main St, City, State"
                    />
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These settings will be used as default values in your templates. You can override them in the restaurant settings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Template Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4">
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Email Details:</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Subject:</strong> {customTemplate.subject}</p>
                      <p><strong>Type:</strong> {customTemplate.template_type.replace('_', ' ')}</p>
                      <p><strong>Name:</strong> {customTemplate.name}</p>
                    </div>
                  </div>
                  
                  <div className="border rounded">
                    <div className="bg-gray-100 p-3 border-b">
                      <h4 className="font-medium">Live Preview:</h4>
                    </div>
                    <iframe
                      srcDoc={generatePreviewContent()}
                      className="w-full h-96"
                      title="Template Preview"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
