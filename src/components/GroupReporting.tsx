'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, DollarSign, ShoppingCart, TrendingUp, Users, Calendar } from 'lucide-react';
import { GroupCodeService } from '@/lib/group-code-service';

interface GroupReportingProps {
  tenantId: string;
}

interface RestaurantSummary {
  id: string;
  name: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  popularItems: string[];
  lastOrderDate: Date;
}

export default function GroupReporting({ tenantId }: GroupReportingProps) {
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [groupRestaurants, setGroupRestaurants] = useState<string[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RestaurantSummary[]>([]);

  useEffect(() => {
    loadGroupInfo();
  }, [tenantId]);

  useEffect(() => {
    if (groupRestaurants.length > 0) {
      loadReportData();
    }
  }, [groupRestaurants, selectedRestaurant, dateRange]);

  const loadGroupInfo = async () => {
    try {
      // Check if user is group admin
      const adminCheck = await GroupCodeService.isGroupAdmin(tenantId);
      setIsGroupAdmin(adminCheck);

      // Get group restaurants
      const restaurants = await GroupCodeService.getGroupRestaurants(tenantId);
      setGroupRestaurants(restaurants);
    } catch (error) {
      console.error('Failed to load group info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    try {
      // This would be replaced with actual reporting API calls
      const mockData: RestaurantSummary[] = groupRestaurants.map((restaurantId, index) => ({
        id: restaurantId,
        name: `Restaurant ${index + 1}`,
        totalOrders: Math.floor(Math.random() * 500) + 100,
        totalRevenue: Math.floor(Math.random() * 50000) + 10000,
        avgOrderValue: Math.floor(Math.random() * 50) + 25,
        popularItems: ['Pizza Margherita', 'Caesar Salad', 'Pasta Carbonara'],
        lastOrderDate: new Date()
      }));
      
      setReportData(mockData);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  };

  const filteredData = selectedRestaurant === 'all' 
    ? reportData 
    : reportData.filter(r => r.id === selectedRestaurant);

  const totalOrders = filteredData.reduce((sum, r) => sum + r.totalOrders, 0);
  const totalRevenue = filteredData.reduce((sum, r) => sum + r.totalRevenue, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (loading) {
    return <div className="flex justify-center p-8">Loading group reports...</div>;
  }

  if (groupRestaurants.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Reporting</CardTitle>
          <CardDescription>
            Join a restaurant group to access multi-location reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No group restaurants found. Create or join a group to see consolidated reports.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Group Reporting</span>
                {isGroupAdmin && (
                  <Badge variant="secondary">Group Admin</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isGroupAdmin 
                  ? "View reports from all restaurants in your group"
                  : "View your restaurant's data within the group context"}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {isGroupAdmin && (
                    <SelectItem value="all">All Restaurants</SelectItem>
                  )}
                  {groupRestaurants.map((restaurantId, index) => (
                    <SelectItem key={restaurantId} value={restaurantId}>
                      {restaurantId === tenantId ? 'Your Restaurant' : `Restaurant ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="90days">90 Days</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Locations</span>
            </div>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-gray-600">Active restaurants</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Orders</span>
            </div>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Revenue</span>
            </div>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">AOV</span>
            </div>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-gray-600">Average order value</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Restaurant Performance Cards */}
          <div className="grid gap-4">
            {filteredData.map((restaurant) => (
              <Card key={restaurant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>{restaurant.name}</span>
                      {restaurant.id === tenantId && (
                        <Badge variant="outline">Your Restaurant</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Last order: {restaurant.lastOrderDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {restaurant.totalOrders}
                      </div>
                      <div className="text-sm text-gray-600">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${restaurant.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ${restaurant.avgOrderValue.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">AOV</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Popular Items</h4>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.popularItems.map((item, index) => (
                        <Badge key={index} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                Compare key metrics across all group restaurants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Performance comparison table/chart would go here */}
                <div className="text-center py-8 text-gray-600">
                  Performance comparison charts coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trends Analysis</CardTitle>
              <CardDescription>
                Track performance trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Trends charts would go here */}
                <div className="text-center py-8 text-gray-600">
                  Trends analysis charts coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
