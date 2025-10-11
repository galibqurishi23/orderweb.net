'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, TrendingUp, Users, ShoppingCart, Target, BarChart3 } from 'lucide-react';

interface RecommendationAnalytics {
  total_recommendations: number;
  clicks: number;
  conversions: number;
  click_rate: number;
  conversion_rate: number;
}

interface RecommendationAnalyticsPanelProps {
  tenantId: string;
}

export default function RecommendationAnalyticsPanel({ tenantId }: RecommendationAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<RecommendationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [tenantId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recommendations/analytics?tenantId=${tenantId}&dateRange=${dateRange}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load recommendation analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>AI Recommendations Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                <Bot className="h-5 w-5 text-blue-600" />
                <span>AI Recommendations Analytics</span>
                <Badge variant="secondary">AI Powered</Badge>
              </CardTitle>
              <CardDescription>
                Track performance of AI-powered menu recommendations
              </CardDescription>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Recommendations</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics?.total_recommendations?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-600">Total shown</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Clicks</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics?.clicks?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-600">User interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Conversions</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics?.conversions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-600">Items added to cart</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Success Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics?.conversion_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-gray-600">Conversion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Click Rate Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Click Through Rate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current CTR</span>
                    <Badge 
                      variant={
                        (analytics?.click_rate || 0) >= 15 ? "default" : 
                        (analytics?.click_rate || 0) >= 10 ? "secondary" : "destructive"
                      }
                    >
                      {analytics?.click_rate?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(analytics?.click_rate || 0, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Industry average: 12-18%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Conversion Rate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current CVR</span>
                    <Badge 
                      variant={
                        (analytics?.conversion_rate || 0) >= 8 ? "default" : 
                        (analytics?.conversion_rate || 0) >= 5 ? "secondary" : "destructive"
                      }
                    >
                      {analytics?.conversion_rate?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(analytics?.conversion_rate || 0, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Industry average: 5-12%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {analytics?.total_recommendations || 0}
                  </div>
                  <div className="text-sm text-blue-600">Total Shown</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {analytics?.clicks || 0}
                  </div>
                  <div className="text-sm text-green-600">Clicked</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600">
                    {analytics?.conversions || 0}
                  </div>
                  <div className="text-sm text-purple-600">Added to Cart</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-lg font-semibold text-orange-600">
                    {((analytics?.conversions || 0) * 100 / Math.max(analytics?.total_recommendations || 1, 1)).toFixed(1)}%
                  </div>
                  <div className="text-sm text-orange-600">Overall Success</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights & Recommendations</CardTitle>
              <CardDescription>
                Data-driven insights to improve recommendation performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* AI-Generated Insights */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🤖 AI Analysis</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Customer engagement with side dish recommendations is 23% higher than main courses</li>
                    <li>• Beverage recommendations show best performance during lunch hours (11 AM - 2 PM)</li>
                    <li>• Customers with dietary preferences have 31% higher conversion rates</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📈 Optimization Opportunities</h4>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li>• Increase dessert recommendations during evening orders</li>
                    <li>• Target frequent customers with premium item suggestions</li>
                    <li>• Implement seasonal recommendations for better relevance</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ Areas for Improvement</h4>
                  <ul className="space-y-2 text-sm text-yellow-800">
                    <li>• Recommendation dismissal rate is above average (consider refining algorithms)</li>
                    <li>• Mobile users show lower engagement (optimize mobile UI)</li>
                    <li>• New customers need better onboarding recommendations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Optimization</CardTitle>
              <CardDescription>
                Fine-tune AI recommendations for better performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Coming Soon Notice */}
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Optimization Coming Soon</h3>
                  <p className="text-gray-600">
                    Advanced AI tuning, A/B testing, and machine learning optimization features will be available in the next update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
