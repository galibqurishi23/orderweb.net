'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Search, 
  Mail,
  Phone,
  Calendar,
  Gift,
  ShoppingBag,
  CreditCard,
  Plus,
  UserPlus,
  Star,
  Trash2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { useTenant } from '@/context/TenantContext';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  total_orders: number;
  total_spent: number;
  points_balance?: number;
  tier_level?: string;
  created_at: string;
  last_order_date?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getTierIcon = (tier?: string) => {
  switch (tier?.toLowerCase()) {
    case 'bronze':
      return <span className="text-amber-600">🥉</span>;
    case 'silver':
      return <span className="text-gray-500">🥈</span>;
    case 'gold':
      return <span className="text-yellow-500">🥇</span>;
    case 'platinum':
      return <span className="text-purple-600">💎</span>;
    default:
      return <span className="text-gray-400">⭐</span>;
  }
};

const getTierColor = (tier?: string) => {
  switch (tier?.toLowerCase()) {
    case 'bronze':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'silver':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'gold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'platinum':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function CustomersPage() {
  const { tenantData } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  
  // Loyalty Points Dialog State
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState('');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [addingPoints, setAddingPoints] = useState(false);

  useEffect(() => {
    if (tenantData) {
      fetchCustomers();
    }
  }, [tenantData]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/admin/customers?tenantId=${tenantData?.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.customers) {
        // Ensure customers have required fields with defaults
        const safeCustomers = data.customers.map((customer: any) => ({
          ...customer,
          name: customer.name || 'Unknown Customer',
          email: customer.email || '',
          phone: customer.phone || '',
          total_orders: customer.total_orders || 0,
          total_spent: customer.total_spent || 0,
          points_balance: customer.points_balance || 0,
          tier_level: customer.tier_level || 'bronze'
        }));
        setCustomers(safeCustomers);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (customerId: number, customerName: string) => {
    if (!confirm(`⚠️ Are you sure you want to delete customer "${customerName}"?\n\nThis will permanently delete:\n• Customer profile\n• All customer addresses\n• Customer loyalty points and transactions\n• All order history\n\nThis action cannot be undone!`)) {
      return;
    }

    setDeletingCustomerId(customerId);
    try {
      console.log('🗑️ Deleting customer:', customerName);
      
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: tenantData?.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove customer from local state
        setCustomers(customers.filter(customer => customer.id !== customerId));
        alert(`✅ Customer "${customerName}" and all associated data have been deleted successfully.`);
        console.log('✅ Customer deleted successfully');
      } else {
        console.error('❌ Delete failed:', result);
        alert(`❌ Failed to delete customer: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      alert('❌ Failed to delete customer. Please check your connection and try again.');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const openLoyaltyDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoyaltyPoints('');
    setLoyaltyReason('');
    setLoyaltyDialogOpen(true);
  };

  const addLoyaltyPoints = async () => {
    if (!selectedCustomer || !loyaltyPoints || !tenantData) {
      return;
    }

    const points = parseInt(loyaltyPoints);
    if (isNaN(points) || points <= 0) {
      alert('Please enter a valid number of points greater than 0');
      return;
    }

    setAddingPoints(true);
    try {
      const response = await fetch('/api/admin/loyalty-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          points: points,
          reason: loyaltyReason || 'Admin awarded points',
          tenantId: tenantData.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the customer in the local state
        setCustomers(customers.map(customer => 
          customer.id === selectedCustomer.id 
            ? { 
                ...customer, 
                points_balance: result.loyaltyUpdate.newBalance,
                tier_level: result.loyaltyUpdate.tierLevel
              }
            : customer
        ));

        alert(`Successfully added ${points} points to ${selectedCustomer.name}!`);
        setLoyaltyDialogOpen(false);
      } else {
        alert(`Failed to add loyalty points: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      alert('Failed to add loyalty points. Please try again.');
    } finally {
      setAddingPoints(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone'];
    
    const csvData = filteredCustomers.map(customer => [
      customer.name || '',
      customer.email || '',
      customer.phone || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  });

  const totalCustomers = customers.length;
  const newCustomersThisMonth = customers.filter(customer => {
    const created = new Date(customer.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-2">Manage your customer database and contact information</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportToCSV}>
            <FileText className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{newCustomersThisMonth.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Customer List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                All customers who have signed up through your website
              </CardDescription>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Customer Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                        {customer.tier_level && (
                          <Badge className={`${getTierColor(customer.tier_level)} border`}>
                            <span className="flex items-center space-x-1">
                              {getTierIcon(customer.tier_level)}
                              <span className="capitalize">{customer.tier_level}</span>
                            </span>
                          </Badge>
                        )}
                      </div>
                      
                      {/* Contact Info */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-1">
                        {customer.email && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </span>
                        )}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{customer.total_orders || 0} orders</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3" />
                          <span>{formatCurrency(customer.total_spent || 0)} spent</span>
                        </span>
                        {customer.points_balance !== undefined && customer.points_balance > 0 && (
                          <span className="flex items-center space-x-1">
                            <Gift className="w-3 h-3" />
                            <span>{customer.points_balance} points</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {formatDate(customer.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openLoyaltyDialog(customer)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <Gift className="w-4 h-4 mr-1" />
                      Add Points
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteCustomer(customer.id, customer.name)}
                      disabled={deletingCustomerId === customer.id}
                      className="text-red-600 hover:text-white hover:bg-red-600 border-red-300 hover:border-red-600 disabled:hover:bg-red-100 disabled:hover:text-red-600 transition-all duration-200"
                    >
                      {deletingCustomerId === customer.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No customers found' : 'No customers yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Customer signups will appear here automatically'
                  }
                </p>
                {!searchTerm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-blue-700 text-sm">
                      <strong>💡 Tip:</strong> When customers sign up through your website, 
                      their details will automatically appear here with their contact information 
                      and loyalty points.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Loyalty Points Dialog */}
      <Dialog open={loyaltyDialogOpen} onOpenChange={setLoyaltyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Loyalty Points</DialogTitle>
            <DialogDescription>
              Award loyalty points to {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Points
              </Label>
              <Input
                id="points"
                type="number"
                min="1"
                placeholder="Enter points to add"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Optional reason for awarding points"
                value={loyaltyReason}
                onChange={(e) => setLoyaltyReason(e.target.value)}
                className="col-span-3"
                rows={3}
              />
            </div>
            {selectedCustomer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Customer:</strong> {selectedCustomer.name}<br />
                  <strong>Current Points:</strong> {selectedCustomer.points_balance || 0}<br />
                  <strong>Current Tier:</strong> <span className="capitalize">{selectedCustomer.tier_level || 'bronze'}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLoyaltyDialogOpen(false)}
              disabled={addingPoints}
            >
              Cancel
            </Button>
            <Button 
              onClick={addLoyaltyPoints}
              disabled={addingPoints || !loyaltyPoints}
            >
              {addingPoints ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Add Points
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
