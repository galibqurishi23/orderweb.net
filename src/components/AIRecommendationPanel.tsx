'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Plus, X, TrendingUp, Heart, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecommendationItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  confidence: number;
  reason: string;
}

interface AIRecommendationPanelProps {
  customerId?: string;
  tenantId: string;
  currentCartItems: string[];
  onAddToCart: (itemId: string) => void;
  onDismiss?: (itemId: string) => void;
}

export default function AIRecommendationPanel({
  customerId,
  tenantId,
  currentCartItems,
  onAddToCart,
  onDismiss
}: AIRecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, [customerId, tenantId, currentCartItems]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          tenantId,
          currentCartItems,
          maxRecommendations: 6
        })
      });

      const data = await response.json();
      if (data.success) {
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item: RecommendationItem) => {
    try {
      onAddToCart(item.id);
      
      // Track interaction
      await trackInteraction(item.id, 'added');
      
      toast({
        title: "Added to cart!",
        description: `${item.name} has been added to your order`
      });

      // Remove from recommendations
      setRecommendations(prev => prev.filter(r => r.id !== item.id));
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = async (item: RecommendationItem) => {
    setDismissedItems(prev => new Set([...prev, item.id]));
    setRecommendations(prev => prev.filter(r => r.id !== item.id));
    
    await trackInteraction(item.id, 'dismissed');
    onDismiss?.(item.id);
  };

  const trackInteraction = async (itemId: string, action: string) => {
    try {
      await fetch('/api/recommendations/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          tenantId,
          recommendedItemId: itemId,
          action
        })
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('frequently') || reason.includes('together')) {
      return <Heart className="h-3 w-3" />;
    }
    if (reason.includes('popular') || reason.includes('trending')) {
      return <TrendingUp className="h-3 w-3" />;
    }
    return <Sparkles className="h-3 w-3" />;
  };

  const visibleRecommendations = recommendations.filter(r => !dismissedItems.has(r.id));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>AI Recommendations</span>
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

  if (visibleRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>AI Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recommendations available at the moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span>Recommended for You</span>
          <Badge variant="secondary" className="ml-auto">
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleRecommendations.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                {/* Item Image */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Bot className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getReasonIcon(item.reason)}
                        <span className="text-xs text-gray-500">{item.reason}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${item.price.toFixed(2)}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getConfidenceColor(item.confidence)}`}
                      >
                        {Math.round(item.confidence * 100)}% match
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(item)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {index < visibleRecommendations.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadRecommendations}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Bot className="h-4 w-4 mr-2" />
            Refresh Recommendations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
