'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Mail, 
  PoundSterling, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Building,
  FileText,
  TrendingUp,
  Loader2,
  Download,
  Send,
  Trash2
} from 'lucide-react';

interface InvoiceLineItem {
  id: string;
  description: string;
  amount: string;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  subscription_plan: 'online-order' | 'online-order-pos' | 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'trialing';
}

interface Invoice {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  subscription_plan: 'online-order' | 'online-order-pos' | 'starter' | 'professional' | 'enterprise';
  amount: number;
  currency: string;
  billing_period_start: string;
  billing_period_end: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

const SUBSCRIPTION_PRICING = {
  // Legacy plan mappings for backward compatibility - used for display only
  'online-order': { name: 'Online Order' },
  'online-order-pos': { name: 'Online Order + POS' },
  starter: { name: 'Online Order' },
  professional: { name: 'Online Order + POS' },
  enterprise: { name: 'Online Order + POS' },
  basic: { name: 'Online Order' },
  premium: { name: 'Online Order + POS' },
  pro: { name: 'Online Order + POS' },
  business: { name: 'Online Order + POS' },
  trial: { name: 'Trial' },
  free: { name: 'Free Trial' }
};

export default function BillingManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('invoices');
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([
    { id: '1', description: '', amount: '' }
  ]);
  
  // Simplified pricing for display purposes only
  const pricing = SUBSCRIPTION_PRICING;

  // Helper function to get plan display name
  const getPlanDisplayName = (planKey: string) => {
    const plan = pricing[planKey as keyof typeof pricing];
    if (plan && (plan as any).name) {
      return (plan as any).name;
    }
    // Fallback formatting
    return planKey.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Load data on component mount
  useEffect(() => {
    loadTenants();
    loadInvoices();
  }, []);

  // Helper functions for managing line items
  const addLineItem = () => {
    const newId = (invoiceLineItems.length + 1).toString();
    setInvoiceLineItems([...invoiceLineItems, { id: newId, description: '', amount: '' }]);
  };

  const removeLineItem = (id: string) => {
    if (invoiceLineItems.length > 1) {
      setInvoiceLineItems(invoiceLineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: 'description' | 'amount', value: string) => {
    setInvoiceLineItems(invoiceLineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotalAmount = () => {
    return invoiceLineItems.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const isFormValid = () => {
    if (!selectedTenant) return false;
    
    const validItems = invoiceLineItems.filter(item => 
      item.description.trim() && item.amount.trim() && parseFloat(item.amount) > 0
    );
    
    return validItems.length > 0;
  };

  const loadTenants = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data || []); // Use 'data' property from API response
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/super-admin/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const generateInvoice = async () => {
    if (!selectedTenant) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a restaurant to generate invoice for',
      });
      return;
    }

    if (!isFormValid()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Invoice Items',
        description: 'Please add at least one valid line item with description and amount',
      });
      return;
    }

    setIsLoading(true);
    try {
      const tenant = tenants.find(t => t.id === selectedTenant);
      if (!tenant) return;

      // Filter valid line items
      const validLineItems = invoiceLineItems.filter(item => 
        item.description.trim() && item.amount.trim() && parseFloat(item.amount) > 0
      );

      const totalAmount = calculateTotalAmount();
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // Default 30 days

      // Create description from line items
      const description = validLineItems.map(item => 
        `${item.description}: £${parseFloat(item.amount).toFixed(2)}`
      ).join('; ');

      const invoiceData = {
        tenantId: selectedTenant,
        subscriptionPlan: 'starter', // Use existing plan instead of 'custom'
        amount: totalAmount,
        currency: 'GBP',
        billingPeriodStart: startDate.toISOString().split('T')[0],
        billingPeriodEnd: endDate.toISOString().split('T')[0],
        description: description,
        isCustomInvoice: true,
        lineItems: validLineItems
      };

      const response = await fetch('/api/super-admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invoice');
      }

      const result = await response.json();
      
      toast({
        title: 'Invoice Generated Successfully',
        description: `Invoice #${result.invoice.id.slice(0, 8)} has been created and sent to ${tenant.name}`,
      });

      // Refresh invoices list
      loadInvoices();
      
      // Reset form
      setSelectedTenant('');
      setInvoiceLineItems([{ id: '1', description: '', amount: '' }]);

    } catch (error) {
      console.error('Invoice generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Invoice Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate invoice',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string, paymentMethod?: string) => {
    try {
      const response = await fetch(`/api/super-admin/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paymentMethod })
      });

      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }

      const result = await response.json();
      
      toast({
        title: 'Invoice Updated',
        description: result.message,
      });

      // Refresh invoices list to update revenue calculations
      await loadInvoices();

      // Show revenue update notification if marked as paid
      if (status === 'paid') {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          toast({
            title: '💰 Revenue Updated!',
            description: `${formatCurrency(invoice.amount, 'GBP')} added to total revenue`,
          });
        }
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update invoice',
      });
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/super-admin/invoices/${invoiceId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Started',
        description: 'Invoice download has started',
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
      });
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/super-admin/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }

      const result = await response.json();
      
      toast({
        title: 'Invoice Sent',
        description: result.message || 'Invoice has been sent successfully',
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: error instanceof Error ? error.message : 'Failed to send invoice',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <Badge className={`${config?.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Handle NaN, null, undefined, or invalid numbers
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(validAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate billing statistics with enhanced reporting
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.toDateString();

  // All-time revenue (paid invoices) - ensure amounts are numbers
  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => {
    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  // Current month revenue
  const thisMonthRevenue = invoices.filter(inv => {
    if (inv.status !== 'paid') return false;
    const invoiceDate = new Date(inv.created_at);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }).reduce((sum, inv) => {
    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Today's revenue
  const todayRevenue = invoices.filter(inv => {
    if (inv.status !== 'paid') return false;
    return new Date(inv.created_at).toDateString() === today;
  }).reduce((sum, inv) => {
    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // This year's revenue
  const thisYearRevenue = invoices.filter(inv => {
    if (inv.status !== 'paid') return false;
    return new Date(inv.created_at).getFullYear() === currentYear;
  }).reduce((sum, inv) => {
    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Pending amount (unpaid invoices)
  const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => {
    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  // Invoice counts
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const totalInvoices = invoices.length;
  const thisMonthInvoices = invoices.filter(inv => {
    const invoiceDate = new Date(inv.created_at);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Invoice Management</h1>
        <p className="text-gray-600">Generate invoices, manage payments, and track subscription billing</p>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Revenue (All Time)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue, 'GBP')}</p>
                <p className="text-xs text-gray-500">{paidInvoices} paid invoices</p>
              </div>
              <PoundSterling className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(thisMonthRevenue, 'GBP')}</p>
                <p className="text-xs text-gray-500">{thisMonthInvoices} invoices</p>
              </div>
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(todayRevenue, 'GBP')}</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(pendingAmount, 'GBP')}</p>
                <p className="text-xs text-gray-500">{totalInvoices - paidInvoices} pending</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">This Year</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(thisYearRevenue, 'GBP')}</p>
                <p className="text-xs text-gray-500">{currentYear}</p>
              </div>
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoice Management</TabsTrigger>
          <TabsTrigger value="generate">Generate New Invoice</TabsTrigger>
          <TabsTrigger value="reports">Revenue Reports</TabsTrigger>
        </TabsList>

        {/* Invoice Management Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No invoices found</p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">#{invoice.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-500">{invoice.tenant_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              {getPlanDisplayName(invoice.subscription_plan || 'online-order')} Plan
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                          <p className="text-sm text-gray-500">{formatDate(invoice.created_at)}</p>
                        </div>
                        
                        {getStatusBadge(invoice.status)}
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadInvoice(invoice.id)}
                            className="flex items-center gap-1"
                            title="Download Invoice"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendInvoice(invoice.id)}
                            className="flex items-center gap-1"
                            title="Send Invoice"
                          >
                            <Send className="h-3 w-3" />
                            Send
                          </Button>
                          
                          {invoice.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateInvoiceStatus(invoice.id, 'paid', 'manual')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Invoice Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Generate Custom Invoice
              </CardTitle>
              <CardDescription>
                Create a fully customizable invoice for any restaurant with your own pricing and description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurant">Select Restaurant</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{tenant.name}</span>
                          <Badge variant="outline">
                            {tenant.subscription_plan || 'starter'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Invoice Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                {invoiceLineItems.map((item, index) => (
                  <div key={item.id} className="flex gap-3 items-start p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`description-${item.id}`} className="text-sm">
                          Description
                        </Label>
                        <Input
                          id={`description-${item.id}`}
                          placeholder="e.g., Setup fee, Monthly subscription, Training"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      
                      <div className="w-32">
                        <Label htmlFor={`amount-${item.id}`} className="text-sm">
                          Amount (£)
                        </Label>
                        <Input
                          id={`amount-${item.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {invoiceLineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 mt-6"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Total Display */}
                <div className="flex justify-end">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-right">
                      <p className="text-sm text-blue-700">Total Amount:</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(calculateTotalAmount(), 'GBP')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTenant && isFormValid() && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Invoice Preview</h3>
                  {(() => {
                    const tenant = tenants.find(t => t.id === selectedTenant);
                    if (!tenant) return null;
                    
                    const validItems = invoiceLineItems.filter(item => 
                      item.description.trim() && item.amount.trim() && parseFloat(item.amount) > 0
                    );
                    const totalAmount = calculateTotalAmount();
                      
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Restaurant:</span>
                          <span className="font-medium">{tenant.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Email:</span>
                          <span className="font-medium">{tenant.email}</span>
                        </div>
                        
                        <div className="mt-3">
                          <span className="text-blue-700 font-medium">Invoice Items:</span>
                          <div className="mt-1 space-y-1">
                            {validItems.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm bg-white p-2 rounded">
                                <span>{item.description}</span>
                                <span className="font-medium">£{parseFloat(item.amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg">
                            <span className="text-blue-700 font-medium">Total Amount:</span>
                            <span className="font-bold text-blue-900">
                              {formatCurrency(totalAmount, 'GBP')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={generateInvoice}
                  disabled={!selectedTenant || isLoading || !isFormValid()}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Generate Invoice
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">📧 What happens next?</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Custom invoice will be created in the system</li>
                  <li>• Email will be sent automatically to the restaurant admin</li>
                  <li>• Restaurant can contact billing team for payment</li>
                  <li>• You can manually mark the invoice as paid when payment is received</li>
                  <li>• Invoice will appear in the management section above</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">All Time Revenue</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue, 'GBP')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-800">This Year ({currentYear})</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(thisYearRevenue, 'GBP')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium text-purple-800">This Month ({new Date().toLocaleDateString('en-GB', { month: 'long' })})</span>
                    <span className="text-lg font-bold text-purple-600">{formatCurrency(thisMonthRevenue, 'GBP')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <span className="font-medium text-indigo-800">Today ({new Date().toLocaleDateString('en-GB')})</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(todayRevenue, 'GBP')}</span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="font-medium text-yellow-800">Pending Revenue</span>
                      <span className="text-lg font-bold text-yellow-600">{formatCurrency(pendingAmount, 'GBP')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Analytics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{paidInvoices}</p>
                      <p className="text-sm text-green-800">Paid Invoices</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{totalInvoices - paidInvoices}</p>
                      <p className="text-sm text-yellow-800">Pending Invoices</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{paidInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : 0}%</p>
                      <p className="text-sm text-blue-800">Payment Rate</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-xl font-bold text-indigo-600">
                        {paidInvoices > 0 ? formatCurrency(totalRevenue / paidInvoices, 'GBP') : '£0.00'}
                      </p>
                      <p className="text-sm text-indigo-800">Average Invoice Value</p>
                    </div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{thisMonthInvoices}</p>
                    <p className="text-sm text-green-800">Invoices This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Revenue Breakdown ({currentYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, index) => {
                  const monthRevenue = invoices.filter(inv => {
                    if (inv.status !== 'paid') return false;
                    const invoiceDate = new Date(inv.created_at);
                    return invoiceDate.getMonth() === index && invoiceDate.getFullYear() === currentYear;
                  }).reduce((sum, inv) => {
                    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
                    return sum + (isNaN(amount) ? 0 : amount);
                  }, 0);

                  const monthName = new Date(currentYear, index).toLocaleDateString('en-GB', { month: 'short' });
                  const isCurrentMonth = index === currentMonth;

                  return (
                    <div key={index} className={`p-4 rounded-lg text-center ${
                      isCurrentMonth ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'
                    }`}>
                      <p className="font-medium text-gray-900">{monthName}</p>
                      <p className={`text-lg font-bold ${
                        isCurrentMonth ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {formatCurrency(monthRevenue, 'GBP')}
                      </p>
                      {isCurrentMonth && (
                        <p className="text-xs text-blue-600 mt-1">Current</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Goals & Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <p className="text-lg font-medium text-green-800">Monthly Average</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(thisYearRevenue / Math.max(currentMonth + 1, 1), 'GBP')}
                  </p>
                  <p className="text-sm text-green-700 mt-2">Based on {currentMonth + 1} months</p>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <p className="text-lg font-medium text-blue-800">Projected Year End</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency((thisYearRevenue / Math.max(currentMonth + 1, 1)) * 12, 'GBP')}
                  </p>
                  <p className="text-sm text-blue-700 mt-2">At current rate</p>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <p className="text-lg font-medium text-purple-800">Growth Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {currentMonth > 0 && thisYearRevenue > 0 ? (
                      ((thisMonthRevenue / (thisYearRevenue / (currentMonth + 1))) * 100 - 100).toFixed(1)
                    ) : 0}%
                  </p>
                  <p className="text-sm text-purple-700 mt-2">vs monthly average</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
