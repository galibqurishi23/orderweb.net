'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Store, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink,
  AlertCircle,
  Loader2,
  Calendar,
  Mail,
  Phone,
  AlertTriangle,
  MapPin,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  Shield,
  Key,
  User,
  Building
} from "lucide-react";
import Link from 'next/link';
import type { Tenant } from '@/lib/types';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [deletingRestaurantId, setDeletingRestaurantId] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [isAssigningLicense, setIsAssigningLicense] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    ownerEmail: '',
    ownerPassword: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminUsername: '',
    adminPassword: ''
  });

  useEffect(() => {
    console.log('🎯 RestaurantsPage mounted, fetching restaurants...');
    fetchRestaurants();
    
    // Force a refresh if still loading after 5 seconds
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Still loading after 5 seconds, retrying...');
        fetchRestaurants();
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  const fetchRestaurants = async () => {
    console.log('🔄 fetchRestaurants called, loading:', loading);
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching restaurants from API...');
      const response = await fetch('/api/super-admin/tenants', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📄 Result:', result);
      
      if (result.success) {
        console.log('✅ Setting restaurants:', result.data);
        setRestaurants(result.data);
        setError(null);
      } else {
        console.error('❌ API returned error:', result.error);
        setError(result.error || 'Failed to fetch restaurants');
      }
    } catch (err) {
      console.error('❌ Error fetching restaurants:', err);
      setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    console.log('🚀 Form submission started with data:', formData);

    try {
      console.log('📤 Sending POST request to /api/super-admin/tenants');
      const response = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📄 Response data:', result);

      if (result.success) {
        console.log('✅ Restaurant created successfully!');
        await fetchRestaurants(); // Refresh the list
        setShowCreateDialog(false);
        
        // Show success message with admin login details
        setSuccessMessage(
          `✅ Restaurant "${formData.name}" created successfully! ` +
          `Admin can login with email: ${formData.ownerEmail}. ` +
          `Dashboard URL: /${formData.slug}/admin. ` +
          `📧 Welcome email has been sent to ${formData.ownerEmail}!`
        );
        
        // Clear success message after 10 seconds
        setTimeout(() => setSuccessMessage(null), 10000);
        
        setFormData({
          name: '',
          slug: '',
          email: '',
          phone: '',
          address: '',
          ownerEmail: '',
          ownerPassword: ''
        });
      } else {
        console.error('❌ Restaurant creation failed:', result.error);
        setError(result.error || 'Failed to create restaurant');
      }
    } catch (err) {
      console.error('💥 Error during restaurant creation:', err);
      setError('Failed to create restaurant');
      console.error('Error creating restaurant:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditRestaurant = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${restaurantId}`);
      const result = await response.json();
      
      if (result.success) {
        setEditingRestaurant(result.data);
        setEditFormData({
          name: result.data.name || '',
          slug: result.data.slug || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          address: result.data.address || '',
          adminName: result.data.admin_name || '',
          adminUsername: result.data.admin_username || '',
          adminPassword: ''
        });
        setShowEditDialog(true);
      } else {
        setError(result.error || 'Failed to fetch restaurant details');
      }
    } catch (err) {
      setError('Failed to fetch restaurant details');
      console.error('Error fetching restaurant details:', err);
    }
  };

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/tenants/${editingRestaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success) {
        await fetchRestaurants(); // Refresh the list
        setShowEditDialog(false);
        setEditingRestaurant(null);
        
        setSuccessMessage(
          `✅ Restaurant "${editFormData.name}" updated successfully!`
        );
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Failed to update restaurant');
      }
    } catch (err) {
      setError('Failed to update restaurant');
      console.error('Error updating restaurant:', err);
    } finally {
      setIsEditing(false);
    }
  };

  const updateTenantStatus = async (tenantId: string, status: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchRestaurants(); // Refresh the list
        setSuccessMessage(`Restaurant status updated to ${status}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to update restaurant status');
      }
    } catch (err) {
      setError('Failed to update restaurant status');
      console.error('Error updating restaurant status:', err);
    }
  };

  const deleteRestaurant = async (restaurantId: string) => {
    setDeletingRestaurantId(restaurantId);
    
    try {
      const response = await fetch(`/api/super-admin/tenants/${restaurantId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchRestaurants(); // Refresh the list
        setError(null); // Clear any previous errors
        setSuccessMessage('Restaurant deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete restaurant');
      }
    } catch (err) {
      setError('Failed to delete restaurant');
      console.error('Error deleting restaurant:', err);
    } finally {
      setDeletingRestaurantId(null);
    }
  };

  const handleAssignLicense = async () => {
    if (!licenseKey.trim() || !selectedRestaurant) {
      setError('Please enter a license key');
      return;
    }

    setIsAssigningLicense(true);
    setError(null);

    try {
      const response = await fetch('/api/tenant/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim().toUpperCase(),
          tenantId: selectedRestaurant.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`License key assigned successfully to ${selectedRestaurant.name}`);
        setShowLicenseDialog(false);
        setLicenseKey('');
        setSelectedRestaurant(null);
        await fetchRestaurants(); // Refresh the list
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to assign license key');
      }
    } catch (err) {
      setError('Failed to assign license key');
      console.error('Error assigning license:', err);
    } finally {
      setIsAssigningLicense(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
      // Auto-generate a secure password when restaurant name changes
      ownerPassword: prev.ownerPassword || generatePassword()
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'trial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'trial': return '🔵';
      case 'suspended': return '🔴';
      case 'cancelled': return '⚫';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading restaurants...</h3>
              <p className="text-gray-600">Please wait while we fetch your restaurant data.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50"></div>
          <div className="relative p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between">
              <div className="mb-6 lg:mb-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Restaurant Management</h1>
                </div>
                <p className="text-gray-600 text-lg">
                  Manage all restaurants on your platform with powerful tools and analytics
                </p>
                <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Store className="h-4 w-4" />
                    <span>{restaurants.length} restaurants</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>{restaurants.filter(r => r.status === 'active').length} active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{restaurants.filter(r => r.status === 'trial').length} in trial</span>
                  </div>
                </div>
              </div>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Restaurant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Create New Restaurant</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Add a new restaurant to your platform. An admin account will be created automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateRestaurant} className="space-y-6">
                    {/* Restaurant Details Section */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold mb-4 text-gray-800 flex items-center">
                        <Store className="h-5 w-5 mr-2" />
                        Restaurant Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Restaurant Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., Mario's Italian Bistro"
                            required
                            className="border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug">URL Slug *</Label>
                          <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="e.g., marios-bistro"
                            required
                            className="border-gray-300"
                          />
                          <p className="text-xs text-gray-500">
                            URL: yoursite.com/<strong>{formData.slug || 'restaurant-slug'}</strong>
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Restaurant Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="contact@restaurant.com"
                            required
                            className="border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                            className="border-gray-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="123 Main St, City, State 12345"
                          rows={2}
                          className="border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Admin Account Section */}
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h4 className="font-semibold mb-4 text-blue-800 flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Admin Account Credentials
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ownerEmail">Admin Email *</Label>
                            <Input
                              id="ownerEmail"
                              type="email"
                              value={formData.ownerEmail}
                              onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                              placeholder="e.g., admin@restaurant.com"
                              required
                              className="border-blue-300 bg-white"
                            />
                            <p className="text-xs text-blue-600">
                              <Key className="h-3 w-3 inline mr-1" />
                              This email will be used to login to the admin panel
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ownerPassword">Admin Password *</Label>
                            <div className="flex space-x-2">
                              <div className="relative flex-1">
                                <Input
                                  id="ownerPassword"
                                  type={showCreatePassword ? "text" : "password"}
                                  value={formData.ownerPassword}
                                  onChange={(e) => setFormData(prev => ({ ...prev, ownerPassword: e.target.value }))}
                                  placeholder="Secure password"
                                  required
                                  className="border-blue-300 bg-white pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                                >
                                  {showCreatePassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFormData(prev => ({ ...prev, ownerPassword: generatePassword() }))}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                Generate
                              </Button>
                            </div>
                            <p className="text-xs text-blue-600">
                              <User className="h-3 w-3 inline mr-1" />
                              Admin will use these credentials to access the restaurant panel
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Restaurant...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Restaurant
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-emerald-100 rounded-full">
                <AlertCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Success!</p>
                <p className="text-emerald-700 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !showCreateDialog && !showEditDialog && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Restaurant Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit Restaurant</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update restaurant details and admin credentials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateRestaurant} className="space-y-6">
              {/* Restaurant Details Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-4 text-gray-800 flex items-center">
                  <Store className="h-5 w-5 mr-2" />
                  Restaurant Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Restaurant Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Mario's Italian Bistro"
                      required
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">URL Slug *</Label>
                    <Input
                      id="edit-slug"
                      value={editFormData.slug}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g., marios-bistro"
                      required
                      className="border-gray-300"
                    />
                    <p className="text-xs text-gray-500">
                      URL: yoursite.com/<strong>{editFormData.slug || 'restaurant-slug'}</strong>
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Restaurant Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@restaurant.com"
                      required
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                    className="border-gray-300"
                  />
                </div>
              </div>

              {/* Admin Account Section */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold mb-4 text-blue-800 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Admin Account Credentials
                </h4>
                
                {/* Current Login Info */}
                {editingRestaurant && (
                  <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                    <p className="text-sm font-medium text-blue-800 mb-1">Current Admin Login:</p>
                    <div className="text-sm text-blue-700">
                      <span className="font-medium">Username:</span> {editingRestaurant.admin_username || 'Not set'} 
                      <span className="mx-2">•</span>
                      <span className="font-medium">URL:</span> /{editingRestaurant.slug}/admin
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-adminName">Admin Full Name</Label>
                    <Input
                      id="edit-adminName"
                      value={editFormData.adminName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, adminName: e.target.value }))}
                      placeholder="e.g., John Doe"
                      className="border-blue-300 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-adminUsername">Admin Username</Label>
                      <Input
                        id="edit-adminUsername"
                        value={editFormData.adminUsername}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, adminUsername: e.target.value }))}
                        placeholder="e.g., admin or johndoe"
                        className="border-blue-300 bg-white"
                      />
                      <p className="text-xs text-blue-600">
                        <Key className="h-3 w-3 inline mr-1" />
                        This username is used to login to the admin panel
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-adminPassword">New Password (Optional)</Label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Input
                            id="edit-adminPassword"
                            type={showEditPassword ? "text" : "password"}
                            value={editFormData.adminPassword}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                            placeholder="Leave empty to keep current password"
                            className="border-blue-300 bg-white pr-10"
                          />
                          {editFormData.adminPassword && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                            >
                              {showEditPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditFormData(prev => ({ ...prev, adminPassword: generatePassword() }))}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          Generate
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600">
                        <User className="h-3 w-3 inline mr-1" />
                        Leave empty to keep the current password
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {setShowEditDialog(false); setEditingRestaurant(null);}}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditing} className="bg-blue-600 hover:bg-blue-700">
                  {isEditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Restaurant...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Update Restaurant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Restaurants List */}
        {restaurants.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="p-4 bg-gray-100 rounded-full inline-block mb-6">
                <Store className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No restaurants yet</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                Create your first restaurant to start building your multi-tenant platform. Each restaurant will have its own admin dashboard and customer interface.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Restaurant
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="group hover:shadow-xl transition-all duration-300 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {restaurant.name}
                      </CardTitle>
                      <CardDescription className="text-gray-500 font-medium">
                        /{restaurant.slug}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(restaurant.status)} font-medium`}>
                      {getStatusIcon(restaurant.status)} {restaurant.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{restaurant.email}</span>
                    </div>
                    {restaurant.phone && (
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{restaurant.phone}</span>
                      </div>
                    )}
                    {restaurant.address && (
                      <div className="flex items-start space-x-3 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="line-clamp-2">{restaurant.address}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Created {new Date(restaurant.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* License Information - Prominent Display */}
                  {restaurant.license_expires_at && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Key className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-700">License Status</span>
                        </div>
                        <Badge 
                          className={`${
                            (restaurant.licenseDaysRemaining ?? 0) <= 0 ? 'bg-red-100 text-red-800 border-red-300' :
                            (restaurant.licenseDaysRemaining ?? 0) <= 7 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            (restaurant.licenseDaysRemaining ?? 0) <= 30 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                            'bg-green-100 text-green-800 border-green-300'
                          } font-semibold`}
                        >
                          {(restaurant.licenseDaysRemaining ?? 0) <= 0 ? '🔴 Expired' :
                           (restaurant.licenseDaysRemaining ?? 0) <= 7 ? '🟠 Expiring Soon' :
                           '🟢 Active'}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        {restaurant.license_key && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Key:</span> {restaurant.license_key}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            <span className="font-medium">Expires:</span> {new Date(restaurant.license_expires_at).toLocaleDateString()}
                          </span>
                          {restaurant.licenseDaysRemaining !== undefined && restaurant.licenseDaysRemaining > 0 && (
                            <span className={`font-bold ${
                              restaurant.licenseDaysRemaining <= 7 ? 'text-red-600' :
                              restaurant.licenseDaysRemaining <= 30 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {restaurant.licenseDaysRemaining} days left
                            </span>
                          )}
                          {restaurant.licenseDaysRemaining !== undefined && restaurant.licenseDaysRemaining <= 0 && (
                            <span className="font-bold text-red-600">
                              License Expired!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!restaurant.license_expires_at && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-300">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-600">No License Assigned</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Click the key icon below to assign a license</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    
                    {restaurant.isTrialActive && (
                      <div className="flex items-center space-x-3 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-orange-600">
                          Trial: {restaurant.trialDaysRemaining} day(s) remaining
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Info */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Badge variant="outline" className="text-xs">
                      {restaurant.subscription_plan || 'Free'}
                    </Badge>
                    <Badge variant={restaurant.overallStatus === 'licensed' ? 'default' : 
                                   restaurant.overallStatus === 'trial' ? 'secondary' : 'destructive'} 
                           className="text-xs">
                      {restaurant.overallStatus}
                    </Badge>
                    {restaurant.licenseStatus && restaurant.licenseStatus !== 'none' && (
                      <Badge variant={restaurant.licenseStatus === 'active' ? 'default' : 'destructive'} 
                             className="text-xs">
                        License: {restaurant.licenseStatus}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-100">
                    {/* Quick Links */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button asChild variant="outline" size="sm" className="text-xs h-8">
                        <Link href={`/${restaurant.slug}/admin`} target="_blank" className="flex items-center">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Admin
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="text-xs h-8">
                        <Link href={`/${restaurant.slug}`} target="_blank" className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          View Store
                        </Link>
                      </Button>
                    </div>

                    {/* Management Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setShowLicenseDialog(true);
                          }}
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                          title="Assign License Key"
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRestaurant(restaurant.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={deletingRestaurantId === restaurant.id}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            >
                              {deletingRestaurantId === restaurant.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <span>Delete Restaurant</span>
                              </AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-3 pt-2">
                                  <p>
                                    Are you sure you want to delete <strong>{restaurant.name}</strong>?
                                  </p>
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <div className="text-red-800 text-sm font-semibold mb-2">⚠️ This action cannot be undone!</div>
                                    <p className="text-red-700 text-sm mb-2">
                                      This will permanently delete:
                                    </p>
                                    <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                                      <li>All restaurant data and settings</li>
                                      <li>All menu items and categories</li>
                                      <li>All orders and customer data</li>
                                      <li>All user accounts for this restaurant</li>
                                      <li>All billing and transaction history</li>
                                    </ul>
                                  </div>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRestaurant(restaurant.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Restaurant
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex space-x-2">
                        {restaurant.status !== 'active' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => updateTenantStatus(restaurant.id, 'active')}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Activate
                          </Button>
                        )}
                        {restaurant.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateTenantStatus(restaurant.id, 'suspended')}
                            className="text-xs h-8 border-orange-300 text-orange-600 hover:bg-orange-50"
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* License Assignment Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Assign License Key
            </DialogTitle>
            <DialogDescription>
              Enter a license key for {selectedRestaurant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license-key" className="text-right">
                License Key
              </Label>
              <Input
                id="license-key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter license key"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLicenseDialog(false);
                setLicenseKey('');
                setSelectedRestaurant(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignLicense}
              disabled={isAssigningLicense || !licenseKey.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAssigningLicense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Assign License
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
