'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Banknote,
  AlertCircle,
  Loader2,
  Plus,
  Store,
  Key,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import Link from 'next/link';
import type { PlatformStats } from '@/lib/types';

interface LicenseStats {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  expiringSoon: number;
  gracePeriodLicenses: number;
  suspendedLicenses: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [licenseStats, setLicenseStats] = useState<LicenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check-super-admin');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          // Not authenticated, redirect to login
          window.location.href = '/super-admin';
        }
      } catch (error) {
        // Not authenticated, redirect to login
        window.location.href = '/super-admin';
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      async function fetchStats() {
        try {
          // Fetch platform stats and attempt the dedicated license stats endpoint
          const platformPromise = fetch('/api/super-admin/stats');
          const licenseStatsPromise = fetch('/api/super-admin/licenses/stats');

          const [platformResponse, licenseResponse] = await Promise.all([platformPromise, licenseStatsPromise]);

          // Platform stats
          if (platformResponse.ok) {
            const platformResult = await platformResponse.json();
            if (platformResult.success) {
              setStats(platformResult.data);
            } else {
              setError(platformResult.error || 'Failed to fetch platform statistics');
            }
          } else {
            // Try to parse fallback body if present
            try {
              const platformResult = await platformResponse.json();
              if (platformResult.success) {
                setStats(platformResult.data);
              } else {
                setError(platformResult.error || 'Failed to fetch platform statistics');
              }
            } catch (e) {
              setError('Failed to fetch platform statistics');
            }
          }

          // License stats: if the dedicated endpoint isn't available (production build not restarted),
          // fall back to fetching the full license list and computing counts client-side.
          if (licenseResponse.ok) {
            try {
              const licenseResult = await licenseResponse.json();
              if (licenseResult.success) {
                setLicenseStats(licenseResult.data);
              } else {
                console.warn('Failed to fetch license statistics:', licenseResult.error);
              }
            } catch (e) {
              console.warn('Failed to parse license stats response, falling back to list fetch');
            }
          } else {
            // Fallback: fetch list of licenses and compute stats locally
            try {
              const listRes = await fetch('/api/super-admin/licenses');
              if (listRes.ok) {
                const licenses = await listRes.json();
                // compute stats
                const now = new Date();
                const in30 = new Date();
                in30.setDate(now.getDate() + 30);

                const totalLicenses = Array.isArray(licenses) ? licenses.length : 0;
                const activeLicenses = (licenses || []).filter((l: any) => l.status === 'active').length;
                const expiredLicenses = (licenses || []).filter((l: any) => l.status === 'expired').length;
                const gracePeriodLicenses = (licenses || []).filter((l: any) => l.status === 'grace_period').length;
                const suspendedLicenses = (licenses || []).filter((l: any) => l.status === 'suspended').length;
                const expiringSoon = (licenses || []).filter((l: any) => {
                  if (!l.expiration_date) return false;
                  const exp = new Date(l.expiration_date);
                  return l.status === 'active' && exp >= now && exp <= in30;
                }).length;

                setLicenseStats({
                  totalLicenses,
                  activeLicenses,
                  expiredLicenses,
                  expiringSoon,
                  gracePeriodLicenses,
                  suspendedLicenses
                });
              } else {
                console.warn('/api/super-admin/licenses list endpoint failed when computing fallback stats');
              }
            } catch (err) {
              console.warn('Fallback license stats computation failed:', err);
            }
          }
        } catch (err) {
          setError('Failed to connect to server');
          console.error('Error fetching stats:', err);
        } finally {
          setLoading(false);
        }
      }

      fetchStats();
    }
  }, [isAuthenticated]);

  if (authLoading || loading || !isAuthenticated) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-gray-600">Manage your multi-restaurant platform</p>
        </div>
        <Link href="/super-admin/restaurants">
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Restaurants</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-blue-600">
              {stats?.totalTenants === 0 ? 'No restaurants registered yet' : 'Registered restaurants'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats?.activeTenants || 0}</div>
            <p className="text-xs text-green-600">
              {stats?.trialTenants ? `${stats.trialTenants} on trial` : 'No active subscriptions'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Monthly Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(stats?.monthlyRevenue || 0)}</div>
            <p className="text-xs text-yellow-600">
              Total: {formatCurrency(stats?.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {stats?.totalTenants === 0 ? '0%' : '+100%'}
            </div>
            <p className="text-xs text-red-600">
              {stats?.totalTenants === 0 ? 'Waiting for first customers' : 'Month over month'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
            <Link href="/super-admin/restaurants">
              <Button variant="outline" size="sm">
                View All Restaurants
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.totalTenants === 0 ? (
            <div className="text-center py-8">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants yet</h3>
              <p className="text-gray-500 mb-4">Create your first restaurant to get started</p>
              <Link href="/super-admin/restaurants">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Restaurant
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active restaurants</span>
                <Badge variant="default">{stats?.activeTenants}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trial restaurants</span>
                <Badge variant="secondary">{stats?.trialTenants}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total registered</span>
                <Badge variant="outline">{stats?.totalTenants}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            License Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Active Licenses</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      licenseStats?.activeLicenses || 0
                    )}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      licenseStats?.expiringSoon || 0
                    )}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Expired</p>
                  <p className="text-2xl font-bold text-red-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      licenseStats?.expiredLicenses || 0
                    )}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Licenses</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      licenseStats?.totalLicenses || 0
                    )}
                  </p>
                </div>
                <Key className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
          {/* Show additional stats if available */}
          {!loading && licenseStats && (licenseStats.gracePeriodLicenses > 0 || licenseStats.suspendedLicenses > 0) && (
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {licenseStats.gracePeriodLicenses > 0 && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">Grace Period</p>
                      <p className="text-xl font-bold text-orange-600">{licenseStats.gracePeriodLicenses}</p>
                    </div>
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              )}
              {licenseStats.suspendedLicenses > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Suspended</p>
                      <p className="text-xl font-bold text-gray-600">{licenseStats.suspendedLicenses}</p>
                    </div>
                    <XCircle className="w-6 h-6 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Link href="/super-admin/license-management">
              <Button variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Manage Licenses
              </Button>
            </Link>
            <Link href="/super-admin/license-management">
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create License
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/super-admin/restaurants">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Restaurants</h3>
                <p className="text-sm text-gray-600">Add, edit, or remove restaurants</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/super-admin/users">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">User Management</h3>
                <p className="text-sm text-gray-600">Manage platform users</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/super-admin/billing">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Billing & Plans</h3>
                <p className="text-sm text-gray-600">Manage subscriptions</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
