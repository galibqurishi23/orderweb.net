'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, ShoppingCart, Plus, Sparkles } from 'lucide-react';
import AIRecommendationPanel from '@/components/AIRecommendationPanel';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CustomerOrderInterfaceProps {
  customerId?: string;
  tenantId: string;
}

export default function CustomerOrderInterface({ customerId, tenantId }: CustomerOrderInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Mock menu items
  const menuCategories = {
    mains: [
      { id: 'pizza-margherita', name: 'Margherita Pizza', price: 18.99 },
      { id: 'pasta-carbonara', name: 'Pasta Carbonara', price: 16.99 },
      { id: 'burger-classic', name: 'Classic Burger', price: 14.99 }
    ],
    sides: [
      { id: 'garlic-bread', name: 'Garlic Bread', price: 6.99 },
      { id: 'caesar-salad', name: 'Caesar Salad', price: 8.99 },
      { id: 'onion-rings', name: 'Onion Rings', price: 5.99 }
    ],
    drinks: [
      { id: 'coke', name: 'Coca Cola', price: 3.99 },
      { id: 'wine-red', name: 'Red Wine', price: 8.99 },
      { id: 'sparkling-water', name: 'Sparkling Water', price: 2.99 }
    ]
  };

  const addToCart = (itemId: string) => {
    // Find item in menu
    const allItems = [
      ...menuCategories.mains,
      ...menuCategories.sides,
      ...menuCategories.drinks
    ];
    
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === itemId);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === itemId 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const cartItemIds = cart.map(item => item.id);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Online</h1>
        <Button 
          variant="outline"
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="flex items-center space-x-2"
        >
          <Bot className="h-4 w-4" />
          <span>{showRecommendations ? 'Hide' : 'Show'} AI Recommendations</span>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="mains">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mains">Main Dishes</TabsTrigger>
              <TabsTrigger value="sides">Sides</TabsTrigger>
              <TabsTrigger value="drinks">Drinks</TabsTrigger>
            </TabsList>

            {Object.entries(menuCategories).map(([category, items]) => (
              <TabsContent key={category} value={category}>
                <div className="grid gap-4">
                  {items.map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-lg font-semibold text-green-600">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            onClick={() => addToCart(item.id)}
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Sidebar with Cart and Recommendations */}
        <div className="space-y-6">
          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Your Order</span>
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} × ${item.price.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {showRecommendations && (
            <AIRecommendationPanel
              customerId={customerId}
              tenantId={tenantId}
              currentCartItems={cartItemIds}
              onAddToCart={addToCart}
              onDismiss={(itemId) => console.log('Dismissed:', itemId)}
            />
          )}

          {/* AI Benefits Info */}
          {showRecommendations && (
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Smart Recommendations</span>
                </div>
                <p className="text-sm text-blue-800">
                  Our AI analyzes your preferences and popular pairings to suggest items you'll love!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
