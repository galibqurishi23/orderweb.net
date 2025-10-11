'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  ChefHat, 
  Snowflake, 
  Wine, 
  Coffee, 
  Calculator,
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';

export function MixedItemGuide() {
  const [showGuide, setShowGuide] = useState(false);

  const componentTypes = [
    {
      type: 'Hot Food',
      icon: <ChefHat className="w-4 h-4" />,
      vatRate: '20%',
      temp: '≥60°C',
      color: 'bg-red-100 text-red-800',
      examples: ['Biryani', 'Pizza', 'Fish & Chips', 'Curry']
    },
    {
      type: 'Cold Food',
      icon: <Snowflake className="w-4 h-4" />,
      vatRate: '0%',
      temp: '<60°C',
      color: 'bg-blue-100 text-blue-800',
      examples: ['Raita', 'Salad', 'Ice Cream', 'Cold Desserts']
    },
    {
      type: 'Alcohol',
      icon: <Wine className="w-4 h-4" />,
      vatRate: '20%',
      temp: 'Any',
      color: 'bg-purple-100 text-purple-800',
      examples: ['Wine', 'Beer', 'Cocktails', 'Spirits']
    },
    {
      type: 'Soft Drinks',
      icon: <Coffee className="w-4 h-4" />,
      vatRate: '20%',
      temp: 'Any',
      color: 'bg-green-100 text-green-800',
      examples: ['Coke', 'Juice', 'Tea', 'Coffee']
    }
  ];

  const exampleCalculation = {
    itemName: 'Chicken Biryani with Raita',
    totalPrice: 10.00,
    components: [
      { name: 'Chicken Biryani (Hot)', price: 8.00, vatRate: 20, vat: 1.33 },
      { name: 'Cucumber Raita (Cold)', price: 2.00, vatRate: 0, vat: 0.00 }
    ],
    totalVat: 1.33,
    netAmount: 8.67
  };

  if (!showGuide) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowGuide(true)}
        className="mb-4"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Mixed Item Guide
      </Button>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <CardTitle>Mixed Item (Component-based VAT) Guide</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuide(false)}
            >
              ×
            </Button>
          </div>
          <CardDescription>
            Learn how to create menu items with different VAT rates for HMRC compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Component Types */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Component Types & VAT Rates
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {componentTypes.map((type, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span className="font-medium">{type.type}</span>
                      </div>
                      <Badge className={type.color}>
                        {type.vatRate} VAT
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Temperature: {type.temp}
                    </p>
                    <p className="text-sm">
                      <strong>Examples:</strong> {type.examples.join(', ')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Example Calculation */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Example VAT Calculation
            </h3>
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-semibold text-lg">{exampleCalculation.itemName}</h4>
                    <p className="text-sm text-gray-600">Total Price: £{exampleCalculation.totalPrice.toFixed(2)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    {exampleCalculation.components.map((component, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{component.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({component.vatRate}% VAT)
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{component.price.toFixed(2)}</div>
                          <div className="text-sm text-red-600">VAT: £{component.vat.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Total Gross:</span>
                      <span>£{exampleCalculation.totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Total VAT:</span>
                      <span>£{exampleCalculation.totalVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Net Amount:</span>
                      <span>£{exampleCalculation.netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Setup Steps */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Quick Setup Steps
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <strong>Create Components</strong>
                  <p className="text-sm text-gray-600">Go to Admin → Components and create individual components with correct VAT types</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <strong>Select "Mixed Item" VAT Type</strong>
                  <p className="text-sm text-gray-600">When creating menu item, choose "Mixed Item (Component-based VAT)"</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <strong>Select Components</strong>
                  <p className="text-sm text-gray-600">Choose which components make up your mixed item</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</span>
                <div>
                  <strong>Automatic VAT Calculation</strong>
                  <p className="text-sm text-gray-600">System automatically calculates VAT based on component types</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 Pro Tip</h4>
            <p className="text-sm text-yellow-700">
              Use Mixed Items for dishes like "Biryani with Raita", "Fish & Chips with Salad", 
              or any meal that combines hot food (20% VAT) with cold items (0% VAT) for accurate 
              HMRC compliance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MixedItemGuide;
