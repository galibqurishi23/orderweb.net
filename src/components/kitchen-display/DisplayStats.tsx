'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  DollarSign
} from 'lucide-react';

interface DisplayOrder {
  id: string;
  status: 'new' | 'preparing' | 'ready' | 'completed';
  totalAmount: number;
  createdAt: string;
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent';
}

interface DisplayStatsProps {
  orders: DisplayOrder[];
}

export function DisplayStats({ orders }: DisplayStatsProps) {
  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    newOrders: orders.filter(o => o.status === 'new').length,
    preparingOrders: orders.filter(o => o.status === 'preparing').length,
    readyOrders: orders.filter(o => o.status === 'ready').length,
    urgentOrders: orders.filter(o => o.priorityLevel === 'urgent').length,
    totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    averageAge: calculateAverageAge(orders),
    oldestOrder: getOldestOrder(orders)
  };

  function calculateAverageAge(orders: DisplayOrder[]): number {
    if (orders.length === 0) return 0;
    const now = new Date();
    const totalAge = orders.reduce((sum, order) => {
      const age = now.getTime() - new Date(order.createdAt).getTime();
      return sum + age;
    }, 0);
    return Math.floor(totalAge / orders.length / 1000 / 60); // in minutes
  }

  function getOldestOrder(orders: DisplayOrder[]): number {
    if (orders.length === 0) return 0;
    const now = new Date();
    const oldest = Math.min(...orders.map(o => new Date(o.createdAt).getTime()));
    return Math.floor((now.getTime() - oldest) / 1000 / 60); // in minutes
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b">
      <div className="p-2 sm:p-4">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-4">
          {/* Total Orders */}
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {stats.totalOrders}
              </div>
              <div className="text-xs text-gray-500">
                <span className="hidden sm:inline">Total Orders</span>
                <span className="sm:hidden">Total</span>
              </div>
            </CardContent>
          </Card>

          {/* New Orders */}
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-red-600">
                {stats.newOrders}
              </div>
              <div className="text-xs text-gray-500">New</div>
            </CardContent>
          </Card>

          {/* Preparing */}
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                {stats.preparingOrders}
              </div>
              <div className="text-xs text-gray-500">
                <span className="hidden sm:inline">Preparing</span>
                <span className="sm:hidden">Prep</span>
              </div>
            </CardContent>
          </Card>

          {/* Ready */}
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {stats.readyOrders}
              </div>
              <div className="text-xs text-gray-500">Ready</div>
            </CardContent>
          </Card>

          {/* Urgent Orders (hidden on mobile, shown on larger screens) */}
          <Card className="hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-purple-600">
                {stats.urgentOrders}
              </div>
              <div className="text-xs text-gray-500">Urgent</div>
            </CardContent>
          </Card>

          {/* Total Value (hidden on mobile, shown on larger screens) */}
          <Card className="hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
              </div>
              <div className="text-sm sm:text-lg font-bold text-green-700">
                ${stats.totalValue.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">
                <span className="hidden lg:inline">Total Value</span>
                <span className="lg:hidden">Value</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Age (hidden on mobile, shown on larger screens) */}
          <Card className="hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              </div>
              <div className="text-sm sm:text-lg font-bold text-orange-600">
                {stats.averageAge}m
              </div>
              <div className="text-xs text-gray-500">
                <span className="hidden lg:inline">Avg Age</span>
                <span className="lg:hidden">Avg</span>
              </div>
            </CardContent>
          </Card>

          {/* Oldest Order (hidden on mobile, shown on larger screens) */}
          <Card className="hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <AlertCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${stats.oldestOrder > 30 ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div className={`text-sm sm:text-lg font-bold ${stats.oldestOrder > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                {stats.oldestOrder}m
              </div>
              <div className="text-xs text-gray-500">Oldest</div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-specific additional stats row */}
        <div className="sm:hidden mt-2 grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-sm font-bold text-purple-600">{stats.urgentOrders}</div>
              <div className="text-xs text-gray-500">Urgent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-sm font-bold text-orange-600">{stats.averageAge}m</div>
              <div className="text-xs text-gray-500">Avg</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <div className={`text-sm font-bold ${stats.oldestOrder > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                {stats.oldestOrder}m
              </div>
              <div className="text-xs text-gray-500">Oldest</div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for old orders */}
        {stats.oldestOrder > 30 && (
          <div className="mt-2 flex items-center justify-center">
            <Badge variant="destructive" className="animate-pulse text-xs sm:text-sm">
              ⚠️ Order over 30 minutes old!
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
