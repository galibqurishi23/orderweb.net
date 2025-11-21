'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Printer,
  RefreshCw,
  TrendingUp,
  XCircle,
  Zap
} from "lucide-react";

interface DashboardStats {
  summary: {
    total_orders: number;
    orders_pending: number;
    orders_sent_to_pos: number;
    orders_printed: number;
    orders_failed: number;
    print_success_rate: number;
    avg_print_time_seconds: number;
    websocket_success_rate: number;
    total_devices: number;
    devices_online: number;
    devices_offline: number;
  };
  print_status_breakdown: any;
  hourly_distribution: any[];
  top_devices: any[];
  critical_alerts: any[];
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  action: string;
  order_id?: number;
  order_number?: string;
  device_id?: string;
  minutes_unprinted?: number;
}

export default function POSMonitoring({ params }: { params: { tenant: string } }) {
  const tenantSlug = params.tenant;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async (showLoader = true) => {
    if (showLoader) setRefreshing(true);
    
    try {
      // Fetch dashboard stats
      const statsRes = await fetch(`/api/admin/dashboard/stats?tenant=${tenantSlug}&period=${period}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch alerts
      const alertsRes = await fetch(`/api/admin/dashboard/alerts?tenant=${tenantSlug}`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenantSlug, period]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, tenantSlug, period]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const criticalAlertCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS System Monitoring</h1>
          <p className="text-gray-500 mt-1">Real-time order delivery and print status</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={period === '24h' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('24h')}
            >
              24h
            </Button>
            <Button
              variant={period === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('7d')}
            >
              7d
            </Button>
            <Button
              variant={period === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('30d')}
            >
              30d
            </Button>
          </div>

          {/* Auto-refresh Toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>

          {/* Manual Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlertCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalAlertCount} Critical Alert{criticalAlertCount > 1 ? 's' : ''}</strong> - 
            Immediate action required. Check the alerts section below.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last {period}</p>
          </CardContent>
        </Card>

        {/* Print Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Print Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(stats?.summary.print_success_rate || 0)}`}>
              {stats?.summary.print_success_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.summary.orders_printed || 0} printed, {stats?.summary.orders_failed || 0} failed
            </p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.summary.orders_pending > 10 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats?.summary.orders_pending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting print confirmation
            </p>
          </CardContent>
        </Card>

        {/* Devices Online */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices Status</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-green-600">{stats?.summary.devices_online || 0}</span>
              <span className="text-gray-400 text-lg"> / {stats?.summary.total_devices || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.summary.devices_offline || 0} offline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Print Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Print Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.summary.avg_print_time_seconds?.toFixed(1) || 0}s
            </div>
            <p className={`text-xs mt-2 ${stats?.summary.avg_print_time_seconds > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
              {stats?.summary.avg_print_time_seconds > 5 ? '⚠️ Above recommended 3s' : '✅ Within target'}
            </p>
          </CardContent>
        </Card>

        {/* WebSocket Success */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">WebSocket Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats?.summary.websocket_success_rate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
              {stats?.summary.websocket_success_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Real-time delivery rate
            </p>
          </CardContent>
        </Card>

        {/* Sent to POS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.summary.orders_sent_to_pos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sent to POS, awaiting ACK
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts ({alerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">{alert.type}</span>
                    </div>
                    <p className="font-medium text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Action:</strong> {alert.action}
                    </p>
                    {alert.order_number && (
                      <p className="text-xs text-gray-500 mt-1">Order: {alert.order_number}</p>
                    )}
                  </div>
                  {alert.severity === 'critical' && (
                    <Button size="sm" variant="destructive">
                      Investigate
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {alerts.length > 10 && (
              <Button variant="link" className="mt-3">
                View all {alerts.length} alerts →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Performing Devices */}
      {stats?.top_devices && stats.top_devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_devices.map((device: any, index: number) => (
                <div key={device.device_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                    <div>
                      <p className="font-medium">{device.device_name || device.device_id}</p>
                      <p className="text-xs text-gray-500">{device.device_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{device.success_rate?.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{device.total_orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" asChild>
            <a href={`/${tenantSlug}/admin/pos-devices`}>
              <Printer className="w-4 h-4 mr-2" />
              Manage Devices
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/${tenantSlug}/admin/pos-analytics`}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/${tenantSlug}/admin/pos-orders`}>
              <Activity className="w-4 h-4 mr-2" />
              Order History
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
