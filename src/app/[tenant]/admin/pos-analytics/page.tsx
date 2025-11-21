'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  summary: {
    total_orders: number;
    print_success_rate: number;
    avg_print_time_seconds: number;
    failed_prints: number;
  };
  time_series: Array<{
    period: string;
    total_orders: number;
    printed: number;
    failed: number;
    pending: number;
    success_rate: number;
    avg_print_time: number;
  }>;
  failure_analysis: {
    by_reason: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
  peak_hours: Array<{
    hour: number;
    order_count: number;
  }>;
  insights: string[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

export default function POSAnalytics({ params }: { params: { tenant: string } }) {
  const tenantSlug = params.tenant;
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week'>('day');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/dashboard/analytics?tenant=${tenantSlug}&period=${period}&groupBy=${groupBy}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [tenantSlug, period, groupBy]);

  // Auto-select groupBy based on period
  useEffect(() => {
    if (period === '24h' && groupBy !== 'hour') {
      setGroupBy('hour');
    } else if (period === '7d' && groupBy === 'week') {
      setGroupBy('day');
    }
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Print Analytics</h1>
          <p className="text-gray-500 mt-1">Performance trends and insights</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Group By Selector */}
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">By Hour</SelectItem>
              <SelectItem value="day">By Day</SelectItem>
              <SelectItem value="week">By Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.summary.total_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getSuccessRateColor(analytics?.summary.print_success_rate || 0)}`}>
              {analytics?.summary.print_success_rate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Print Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.summary.avg_print_time_seconds?.toFixed(1) || 0}s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed Prints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {analytics?.summary.failed_prints || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Automated Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.includes('✅') ? 'bg-green-50' :
                    insight.includes('⚠️') ? 'bg-yellow-50' :
                    insight.includes('🔴') ? 'bg-red-50' : 'bg-blue-50'
                  }`}
                >
                  {insight.includes('✅') && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                  {insight.includes('⚠️') && <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                  {insight.includes('🔴') && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Print Success Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.time_series || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="success_rate"
                stroke="#22c55e"
                strokeWidth={2}
                name="Success Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Order Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Order Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.time_series || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="printed" fill="#22c55e" name="Printed" stackId="a" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" stackId="a" />
              <Bar dataKey="pending" fill="#eab308" name="Pending" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Print Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Average Print Time Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.time_series || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_print_time"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avg Print Time (s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Analysis */}
        {analytics?.failure_analysis.by_reason && analytics.failure_analysis.by_reason.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Failure Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.failure_analysis.by_reason}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.reason}: ${entry.percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.failure_analysis.by_reason.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {analytics.failure_analysis.by_reason.map((reason, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{reason.reason}</span>
                    </div>
                    <span className="font-medium">{reason.count} ({reason.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Peak Hours */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.peak_hours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(hour) => `Hour: ${hour}:00`}
                  />
                  <Bar dataKey="order_count" fill="#3b82f6" name="Orders" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4">
                <h4 className="font-semibold mb-2">Top 3 Busiest Hours:</h4>
                <div className="space-y-2">
                  {analytics.peak_hours
                    .sort((a, b) => b.order_count - a.order_count)
                    .slice(0, 3)
                    .map((hour, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {hour.hour}:00 - {hour.hour + 1}:00
                        </span>
                        <Badge>{hour.order_count} orders</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Period Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Period</th>
                  <th className="text-right py-3 px-4">Total Orders</th>
                  <th className="text-right py-3 px-4">Printed</th>
                  <th className="text-right py-3 px-4">Failed</th>
                  <th className="text-right py-3 px-4">Success Rate</th>
                  <th className="text-right py-3 px-4">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.time_series.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{row.period}</td>
                    <td className="text-right py-3 px-4">{row.total_orders}</td>
                    <td className="text-right py-3 px-4 text-green-600">{row.printed}</td>
                    <td className="text-right py-3 px-4 text-red-600">{row.failed}</td>
                    <td className={`text-right py-3 px-4 font-medium ${getSuccessRateColor(row.success_rate)}`}>
                      {row.success_rate?.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4">{row.avg_print_time?.toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
