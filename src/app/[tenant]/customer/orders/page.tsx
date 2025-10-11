'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Package, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string[];
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  deliveryAddress?: string;
  orderType: 'delivery' | 'pickup' | 'dine-in';
  paymentMethod: string;
  loyaltyPointsEarned: number;
}

export default function CustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('3months');

  useEffect(() => {
    fetchOrders();
  }, [params.tenant, statusFilter, dateRange]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customer/orders?status=${statusFilter}&range=${dateRange}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else if (response.status === 401) {
        router.push(`/${params.tenant}`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const reorderItems = async (orderId: string) => {
    try {
      const response = await fetch(`/api/customer/orders/${orderId}/reorder`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        router.push(`/${params.tenant}`);
      }
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-32 bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <Button
              variant="outline"
              onClick={() => router.push(`/${params.tenant}/customer/dashboard`)}
            >
              Back to Dashboard
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search orders or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                <SelectItem value="1week">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'You haven\'t placed any orders yet.'}
              </p>
              <Button onClick={() => router.push(`/${params.tenant}`)}>
                Start Ordering
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {order.time}
                      </div>
                      {order.deliveryAddress && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {order.orderType}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <div className="text-lg font-bold mt-1">£{order.total.toFixed(2)}</div>
                    <div className="text-sm text-green-600">+{order.loyaltyPointsEarned} points</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Quick Order Summary */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} • {order.paymentMethod}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      {expandedOrder === order.id ? (
                        <>Hide Details <ChevronUp className="h-4 w-4 ml-1" /></>
                      ) : (
                        <>View Details <ChevronDown className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                    {order.status === 'delivered' && (
                      <Button
                        size="sm"
                        onClick={() => reorderItems(order.id)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Reorder
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Order Details */}
                {expandedOrder === order.id && (
                  <div className="border-t pt-4 space-y-4">
                    {order.deliveryAddress && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
                        <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              {item.customizations && item.customizations.length > 0 && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {item.customizations.join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">x{item.quantity}</div>
                              <div className="text-sm text-gray-600">£{item.price.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special Instructions Section */}
                    {(order as any).specialInstructions && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Special Instructions</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-sm text-yellow-800">{(order as any).specialInstructions}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total</span>
                        <span>£{order.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-green-600 mt-1">
                        <span>Loyalty Points Earned</span>
                        <span>+{order.loyaltyPointsEarned} points</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
