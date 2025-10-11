'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Package,
  ChefHat,
  Receipt,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  order_item_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  selected_addons?: any[];
}

interface CustomerOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_type: string;
  order_status: string;
  fulfillment_date?: string;
  fulfillment_time?: string;
  special_instructions?: string;
  address?: string;
  created_at: string;
  items: OrderItem[];
}

interface ApiResponse {
  success: boolean;
  data: {
    orders: CustomerOrder[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    summary: {
      totalOrdersLast3Months: number;
      dataRetentionNote: string;
    };
  };
  error?: string;
}

export default function KitchenCustomerOrdersPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'name' | 'orderNumber'>('phone');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  const searchOrders = async (page: number = 1, query: string = searchQuery) => {
    if (!query.trim()) {
      setOrders([]);
      setPagination(null);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        [searchType]: query.trim()
      });

      const response = await fetch(`/api/kitchen/customer/orders?${searchParams}`, {
        headers: {
          'x-tenant-id': tenantSlug,
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      if (data.success) {
        setOrders(data.data.orders);
        setPagination(data.data.pagination);
        setSummary(data.data.summary);
        setCurrentPage(page);
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOrders([]);
      setPagination(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    searchOrders(1, searchQuery);
  };

  const handlePageChange = (page: number) => {
    searchOrders(page);
  };

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'delivery':
        return <MapPin className="w-4 h-4" />;
      case 'collection':
        return <Package className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ChefHat className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Kitchen - Customer Order History</h1>
        </div>
        <p className="text-gray-600">Search and view customer order history for kitchen reference</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Type Selection */}
            <div className="flex gap-2">
              <Button
                variant={searchType === 'phone' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('phone')}
              >
                <Phone className="w-4 h-4 mr-1" />
                Phone
              </Button>
              <Button
                variant={searchType === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('name')}
              >
                <User className="w-4 h-4 mr-1" />
                Name
              </Button>
              <Button
                variant={searchType === 'orderNumber' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('orderNumber')}
              >
                <Receipt className="w-4 h-4 mr-1" />
                Order #
              </Button>
            </div>

            {/* Search Input */}
            <div className="flex flex-1 gap-2">
              <Input
                placeholder={`Search by ${searchType === 'phone' ? 'phone number' : 
                              searchType === 'name' ? 'customer name' : 'order number'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                {loading ? <LoadingSpinner size="sm" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </div>
          </div>

          {/* Data Retention Notice */}
          {summary && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Data Retention:</strong> {summary.dataRetentionNote}. 
                Total orders found in last 3 months: <strong>{summary.totalOrdersLast3Months}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders List */}
      {orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.order_id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getOrderTypeIcon(order.order_type)}
                      <span className="font-bold text-lg">#{order.order_number}</span>
                    </div>
                    <Badge className={getOrderStatusColor(order.order_status)}>
                      {order.order_status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(order.created_at), 'PPpp')}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_phone}</span>
                  </div>
                  {order.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{order.address}</span>
                    </div>
                  )}
                </div>

                {/* Fulfillment Info */}
                {(order.fulfillment_date || order.fulfillment_time) && (
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Scheduled: {order.fulfillment_date} {order.fulfillment_time && `at ${order.fulfillment_time}`}
                    </span>
                  </div>
                )}

                {/* Special Instructions */}
                {order.special_instructions && (
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Special Instructions:</p>
                        <p className="text-yellow-700">{order.special_instructions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order Items ({order.items.length})
                  </h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.order_item_id} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.menu_item_name}</span>
                          </div>
                          {item.special_instructions && (
                            <p className="text-sm text-gray-600 mt-1">
                              Note: {item.special_instructions}
                            </p>
                          )}
                          {item.selected_addons && item.selected_addons.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Addons: {item.selected_addons.map((addon: any) => addon.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">£{item.unit_price.toFixed(2)}</span>
                          {item.quantity > 1 && (
                            <div className="text-xs text-gray-500">
                              Total: £{(item.unit_price * item.quantity).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Total */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-lg">Total Amount:</span>
                  <span className="font-bold text-xl text-green-600">£{order.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPreviousPage || loading}
              >
                Previous
              </Button>
              
              <span className="px-4 py-2 text-sm">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage || loading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && searchQuery && orders.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No orders found</p>
              <p>Try searching with a different {searchType === 'phone' ? 'phone number' : 
                   searchType === 'name' ? 'customer name' : 'order number'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!loading && !searchQuery && orders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Kitchen Order History</p>
              <p>Search for customer orders using phone number, name, or order number above</p>
              <p className="text-sm mt-2">Only orders from the last 3 months are available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
