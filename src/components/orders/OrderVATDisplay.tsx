'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, CheckCircle, AlertTriangle, Package, Receipt } from 'lucide-react';
import { Order, PlacedOrderItem } from '@/lib/types';

interface OrderVATDisplayProps {
  order: Order;
  currencySymbol?: string;
  showDetailed?: boolean;
  showHMRCInfo?: boolean;
}

interface VATBreakdownProps {
  vatBreakdown: {
    hotFoodVAT: number;
    coldFoodVAT: number;
    alcoholVAT: number;
    softDrinkVAT: number;
    otherVAT: number;
  };
  totalVAT: number;
  currencySymbol?: string;
}

const ComponentType = {
  hot_food: { label: 'Hot Food', color: 'bg-red-100 text-red-800', vatRate: '20%' },
  cold_food: { label: 'Cold Food', color: 'bg-blue-100 text-blue-800', vatRate: '0%' },
  alcohol: { label: 'Alcohol', color: 'bg-purple-100 text-purple-800', vatRate: '20%' },
  soft_drink: { label: 'Soft Drink', color: 'bg-green-100 text-green-800', vatRate: '20%' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800', vatRate: '20%' }
};

export function VATBreakdownSummary({ vatBreakdown, totalVAT, currencySymbol = '£' }: VATBreakdownProps) {
  const breakdownItems = [
    { label: 'Hot Food', amount: vatBreakdown.hotFoodVAT, color: 'text-red-600' },
    { label: 'Cold Food', amount: vatBreakdown.coldFoodVAT, color: 'text-blue-600' },
    { label: 'Alcohol', amount: vatBreakdown.alcoholVAT, color: 'text-purple-600' },
    { label: 'Soft Drinks', amount: vatBreakdown.softDrinkVAT, color: 'text-green-600' },
    { label: 'Other', amount: vatBreakdown.otherVAT, color: 'text-gray-600' }
  ].filter(item => item.amount > 0);

  if (breakdownItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-2">
        <span className="text-sm">No VAT applicable (0% rated items)</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {breakdownItems.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className={`text-sm ${item.color}`}>{item.label} VAT:</span>
          <span className={`font-semibold ${item.color}`}>{currencySymbol}{item.amount.toFixed(2)}</span>
        </div>
      ))}
      <Separator />
      <div className="flex justify-between items-center font-bold">
        <span>Total VAT:</span>
        <span className="text-lg">{currencySymbol}{totalVAT.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function OrderVATDisplay({ order, currencySymbol = '£', showDetailed = false, showHMRCInfo = false }: OrderVATDisplayProps) {
  if (!order.vatInfo) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4 text-center text-gray-500">
          <Calculator className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">VAT calculation not available</p>
        </CardContent>
      </Card>
    );
  }

  const { vatInfo } = order;
  const mixedItems = order.items.filter(item => item.vatInfo?.isMixedItem);

  return (
    <div className="space-y-4">
      {/* Main VAT Summary */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-green-600" />
              Order VAT Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              {vatInfo.hmrcCompliant && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  HMRC Compliant
                </Badge>
              )}
              {vatInfo.hasMixedItems && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Package className="h-3 w-3 mr-1" />
                  Mixed Items
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <VATBreakdownSummary 
            vatBreakdown={vatInfo.vatBreakdown} 
            totalVAT={vatInfo.totalVAT}
            currencySymbol={currencySymbol}
          />
        </CardContent>
      </Card>

      {/* Mixed Items Detail */}
      {showDetailed && mixedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Mixed Items Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mixedItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{item.menuItem.name}</h4>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{currencySymbol}{(item.vatInfo?.totalVAT || 0).toFixed(2)} VAT</div>
                    <div className="text-sm text-gray-500">per item</div>
                  </div>
                </div>

                {item.vatInfo?.components && item.vatInfo.components.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Components:</div>
                    {item.vatInfo.components.map((component, compIndex) => (
                      <div key={compIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge className={ComponentType[component.componentType].color} variant="outline">
                            {ComponentType[component.componentType].label}
                          </Badge>
                          <span className="text-sm">{component.name}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div>{currencySymbol}{component.cost.toFixed(2)}</div>
                          <div className="text-gray-500">
                            {component.vatRate}% = {currencySymbol}{component.vatAmount.toFixed(2)} VAT
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* HMRC Information */}
      {showHMRCInfo && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-yellow-600" />
              HMRC VAT Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Standard Rate (20%)</div>
                <div className="text-lg font-semibold">
                  {currencySymbol}{(
                    vatInfo.vatBreakdown.hotFoodVAT +
                    vatInfo.vatBreakdown.alcoholVAT +
                    vatInfo.vatBreakdown.softDrinkVAT +
                    vatInfo.vatBreakdown.otherVAT
                  ).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Zero Rate (0%)</div>
                <div className="text-lg font-semibold">
                  {currencySymbol}{vatInfo.vatBreakdown.coldFoodVAT.toFixed(2)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mixed Items:</span>
                <span>{mixedItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Amount:</span>
                <span>{currencySymbol}{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total VAT:</span>
                <span>{currencySymbol}{vatInfo.totalVAT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Net Total:</span>
                <span>{currencySymbol}{(order.total - vatInfo.totalVAT).toFixed(2)}</span>
              </div>
            </div>

            {vatInfo.hasMixedItems && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm text-blue-800">
                  <strong>Mixed Items Notice:</strong> This order contains items with both hot (≥60°C) and cold (&lt;60°C) components. 
                  VAT has been calculated using component-based rates in accordance with HMRC guidelines.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OrderVATDisplay;
