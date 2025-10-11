'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShoppingCart, 
  Banknote, 
  Clock, 
  Users,
  AlertCircle,
  Loader2,
  Settings,
  Menu,
  BarChart3,
  Printer,
  Store,
  Tag,
  Mail,
  Gift,
  ShoppingBag,
  Shield,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function AdminDashboard({ params }: { params: { tenant: string } }) {
  // For Next.js 14, params are synchronous
  const resolvedParams = params;
  const [tenantData, setTenantData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if we just came from a successful login (check URL params or session storage)
        const urlParams = new URLSearchParams(window.location.search);
        const fromLogin = urlParams.get('from') === 'login' || sessionStorage.getItem('justLoggedIn') === 'true';
        
        if (fromLogin) {
          console.log('🎉 Just logged in, skipping auth check temporarily');
          sessionStorage.removeItem('justLoggedIn');
          // Skip auth check for now, proceed to load dashboard
        } else {
          // Wait a moment for cookies to be set properly
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check authentication using API instead of localStorage
          console.log('🔍 Checking authentication...');
          console.log('🍪 Document cookies before auth check:', document.cookie);
          
          const authResponse = await fetch('/api/tenant/system/auth/check', {
            credentials: 'include',
            cache: 'no-cache', // Prevent caching
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          console.log('🌐 Auth response status:', authResponse.status);
          
          const authData = await authResponse.json();
          
          console.log('🔐 Auth response:', authData);
          
          if (!authData.authenticated) {
            console.log('❌ Not authenticated, redirecting to login');
            console.log('Auth error:', authData.error);
            // Add a longer delay to prevent immediate redirect loops
            setTimeout(() => {
              window.location.href = `/${resolvedParams.tenant}/admin`;
            }, 2000);
            return;
          }
          
          console.log('✅ Authentication successful!');
        }

        // Fetch tenant data
        const tenantResponse = await fetch(`/api/tenant/info?slug=${resolvedParams.tenant}`);
        
        if (!tenantResponse.ok) {
          throw new Error('Failed to fetch tenant data');
        }
        
        const tenantResult = await tenantResponse.json();
        setTenantData(tenantResult);

        // Fetch dashboard stats
        const statsResponse = await fetch(`/api/tenant/stats?tenant=${resolvedParams.tenant}`);
        
        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          console.log('Dashboard stats response:', statsResult);
          
          if (statsResult.success && statsResult.data) {
            setStats(statsResult.data);
          } else {
            console.error('Failed to get stats:', statsResult.error);
            setStats(null);
          }
        } else {
          console.error('Stats API request failed:', statsResponse.status);
          setStats(null);
        }

        // Fetch license status
        const licenseResponse = await fetch(`/api/tenant/${resolvedParams.tenant}/license`);
        if (licenseResponse.ok) {
          const licenseResult = await licenseResponse.json();
          setLicenseStatus(licenseResult.current);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        window.location.href = `/${resolvedParams.tenant}/admin`;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.tenant]);

  // Instead of blocking access, show dashboard with license renewal notification
  // if (licenseInfo?.isExpired) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  //       ...license blocking UI...
  //     </div>
  //   );
  // }

  if (loading || !tenantData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full">
      {/* Professional Header Section */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening at {tenantData.name}.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="h-9">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <Link href={`/${tenantData.slug}/admin/settings`}>
            <Button variant="outline" size="sm" className="h-9">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Revenue */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Today's Revenue</CardTitle>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Banknote className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
              ) : (
                `£${stats?.todayRevenue?.toFixed(2) ?? '0.00'}`
              )}
            </div>
            <p className="text-sm text-gray-500">
              From today's orders
            </p>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Today's Orders</CardTitle>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              ) : (
                stats?.todayOrders ?? '0'
              )}
            </div>
            <p className="text-sm text-gray-500">
              Orders placed today
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Orders</CardTitle>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              ) : (
                stats?.totalOrders ?? '0'
              )}
            </div>
            <p className="text-sm text-gray-500">
              All confirmed orders
            </p>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Customers</CardTitle>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              ) : (
                stats?.totalCustomers ?? '0'
              )}
            </div>
            <p className="text-sm text-gray-500">
              Registered customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* License Status Section */}
      <div className="border-l-4 border-l-blue-500 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">License Status</h3>
              {licenseStatus ? (
                <div className="flex items-center space-x-2 mt-1">
                  {licenseStatus.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    licenseStatus.status === 'active' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {licenseStatus.status === 'active' ? 'Active' : 'Expired'}
                  </span>
                  <span className="text-sm text-gray-600">
                    • Expires {new Date(licenseStatus.expiration_date).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">No Active License</span>
                </div>
              )}
            </div>
          </div>
          <Link href={`/${resolvedParams.tenant}/admin/license-management`}>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Manage License
            </Button>
          </Link>
        </div>
      </div>

      {/* Professional Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Manage your restaurant efficiently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${tenantData.slug}/admin/menu`}>
              <Button variant="outline" className="w-full justify-start">
                <Menu className="h-4 w-4 mr-2" />
                Manage Menu
              </Button>
            </Link>
            <Link href={`/${tenantData.slug}/admin/orders`}>
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Orders
              </Button>
            </Link>
            <Link href={`/${tenantData.slug}/admin/printers`}>
              <Button variant="outline" className="w-full justify-start">
                <Printer className="h-4 w-4 mr-2" />
                Manage Printers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Templates</CardTitle>
            <CardDescription>Manage all email communications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${tenantData.slug}/admin/email-templates-advanced`}>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Email Templates
              </Button>
            </Link>
            <div className="text-xs text-gray-500 pl-6">
              • Food Order Emails
            </div>
            <div className="text-xs text-gray-500 pl-6">
              • Gift Card Emails
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports & Analytics</CardTitle>
            <CardDescription>Track your performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${tenantData.slug}/admin/reports`}>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sales Reports
              </Button>
            </Link>
            <Link href={`/${tenantData.slug}/admin/vouchers`}>
              <Button variant="outline" className="w-full justify-start">
                <Tag className="h-4 w-4 mr-2" />
                Manage Vouchers
              </Button>
            </Link>
            <Link href={`/${tenantData.slug}/admin/customers`}>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Customer Management
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Restaurant Info</CardTitle>
            <CardDescription>Your restaurant details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{tenantData.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {tenantData.address && (
                <p>{tenantData.address}</p>
              )}
              {tenantData.phone && (
                <p>Tel: {tenantData.phone}</p>
              )}
            </div>
            <Link href={`/${tenantData.slug}/admin/settings`}>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Restaurant Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
