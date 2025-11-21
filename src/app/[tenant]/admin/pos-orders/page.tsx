'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2,
  Search,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Printer
} from "lucide-react";

interface Order {
  id: number;
  order_number: string;
  tenant: {
    name: string;
    slug: string;
  };
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  order_details: {
    total: number;
    order_type: string;
    payment_method: string;
    created_at: string;
    scheduled_time: string | null;
    special_instructions: string | null;
  };
  status: {
    order_status: string;
    print_status: string;
  };
  print_info: {
    websocket_sent: boolean;
    websocket_sent_at: string | null;
    device_id: string | null;
    device_name: string | null;
    print_time_seconds: number | null;
    print_error: string | null;
    print_status_updated_at: string | null;
  };
  timeline: Array<{
    event: string;
    timestamp: string;
    status: string;
    message: string;
    device?: string;
    device_name?: string;
    error?: string;
  }>;
}

interface OrdersResponse {
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total_orders: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: any;
  summary: {
    total_in_filter: number;
    pending: number;
    sent_to_pos: number;
    printed: number;
    failed: number;
  };
  orders: Order[];
}

export default function POSOrders({ params }: { params: { tenant: string } }) {
  const tenantSlug = params.tenant;
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [printStatus, setPrintStatus] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenant: tenantSlug,
        page: page.toString(),
        limit: limit.toString()
      });

      if (printStatus) params.append('print_status', printStatus);
      if (orderNumber) params.append('order_number', orderNumber);
      if (customerPhone) params.append('customer_phone', customerPhone);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await fetch(`/api/admin/dashboard/orders?${params.toString()}`);
      if (res.ok) {
        const data: OrdersResponse = await res.json();
        setOrders(data.orders);
        setPagination(data.pagination);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tenantSlug, page]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleClearFilters = () => {
    setPrintStatus('');
    setOrderNumber('');
    setCustomerPhone('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const getPrintStatusBadge = (status: string) => {
    switch (status) {
      case 'printed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Printed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'sent_to_pos':
        return <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" />Sent to POS</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'order_created':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'websocket_sent':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'print_success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'print_failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Printer className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="text-gray-500 mt-1">Search and investigate orders with print tracking</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_in_filter}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Sent to POS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.sent_to_pos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Printed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.printed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Print Status */}
            <div>
              <Label>Print Status</Label>
              <Select value={printStatus} onValueChange={setPrintStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent_to_pos">Sent to POS</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Number */}
            <div>
              <Label>Order Number</Label>
              <Input
                placeholder="ORD-2025-001234"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

            {/* Customer Phone */}
            <div>
              <Label>Customer Phone</Label>
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* Date From */}
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({pagination?.total_orders || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{order.order_number}</h3>
                        {getPrintStatusBadge(order.status.print_status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.customer.name} • {order.customer.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${order.order_details.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(order.order_details.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {order.print_info.device_name && (
                      <span>🖨️ {order.print_info.device_name}</span>
                    )}
                    {order.print_info.print_time_seconds && (
                      <span>⏱️ {order.print_info.print_time_seconds.toFixed(1)}s</span>
                    )}
                    {order.print_info.websocket_sent && (
                      <span>⚡ WebSocket sent</span>
                    )}
                    {order.print_info.print_error && (
                      <span className="text-red-600">❌ {order.print_info.print_error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.total_pages} • {pagination.total_orders} total orders
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.has_prev}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedOrder.order_number}</h2>
                  <p className="text-gray-600 mt-1">{selectedOrder.customer.name}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Details */}
              <div>
                <h3 className="font-semibold mb-2">Order Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium ml-2">${selectedOrder.order_details.total.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium ml-2">{selectedOrder.order_details.order_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium ml-2">{selectedOrder.order_details.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium ml-2">{selectedOrder.status.order_status}</span>
                  </div>
                </div>
                {selectedOrder.order_details.special_instructions && (
                  <div className="mt-3">
                    <span className="text-gray-600 text-sm">Special Instructions:</span>
                    <p className="text-sm mt-1 p-2 bg-yellow-50 rounded">
                      {selectedOrder.order_details.special_instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Print Status */}
              <div>
                <h3 className="font-semibold mb-2">Print Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getPrintStatusBadge(selectedOrder.status.print_status)}
                  </div>
                  {selectedOrder.print_info.device_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Device:</span>
                      <span className="font-medium">{selectedOrder.print_info.device_name}</span>
                    </div>
                  )}
                  {selectedOrder.print_info.print_time_seconds && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Print Time:</span>
                      <span className="font-medium">{selectedOrder.print_info.print_time_seconds.toFixed(1)}s</span>
                    </div>
                  )}
                  {selectedOrder.print_info.print_error && (
                    <div className="p-2 bg-red-50 rounded text-red-700">
                      <strong>Error:</strong> {selectedOrder.print_info.print_error}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Timeline</h3>
                <div className="space-y-3">
                  {selectedOrder.timeline.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="mt-1">{getEventIcon(event.event)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{event.message}</p>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        {event.device_name && (
                          <p className="text-xs text-gray-600 mt-1">Device: {event.device_name}</p>
                        )}
                        {event.error && (
                          <p className="text-xs text-red-600 mt-1">Error: {event.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
