'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Package, Calculator, Settings, AlertTriangle, CheckCircle } from 'lucide-react';

// Component types for mixed items
interface ItemComponent {
  id: string;
  componentName: string;
  componentCost: number;
  vatRate: number;
  componentType: 'hot_food' | 'cold_food' | 'alcohol' | 'soft_drink' | 'other';
  isActive: boolean;
  displayOrder: number;
}

interface ComponentTemplate {
  id: string;
  templateName: string;
  description?: string;
  components: TemplateComponent[];
}

interface TemplateComponent {
  id: string;
  componentName: string;
  defaultCost: number;
  vatRate: number;
  componentType: 'hot_food' | 'cold_food' | 'alcohol' | 'soft_drink' | 'other';
  displayOrder: number;
}

interface ComponentSelectorProps {
  menuItemId?: string;
  totalPrice: number;
  onComponentsChange: (components: ItemComponent[]) => void;
  onVATChange: (vatInfo: { totalVAT: number; breakdown: VATBreakdown }) => void;
  initialComponents?: ItemComponent[];
}

interface VATBreakdown {
  hotFoodVAT: number;
  coldFoodVAT: number;
  alcoholVAT: number;
  softDrinkVAT: number;
  otherVAT: number;
}

const ComponentType = {
  hot_food: { label: 'Hot Food', vatRate: 20, color: 'bg-red-100 text-red-800', description: '≥60°C (20% VAT)' },
  cold_food: { label: 'Cold Food', vatRate: 0, color: 'bg-blue-100 text-blue-800', description: '<60°C (0% VAT)' },
  alcohol: { label: 'Alcohol', vatRate: 20, color: 'bg-purple-100 text-purple-800', description: 'Alcoholic beverages (20% VAT)' },
  soft_drink: { label: 'Soft Drink', vatRate: 20, color: 'bg-green-100 text-green-800', description: 'Non-alcoholic drinks (20% VAT)' },
  other: { label: 'Other', vatRate: 20, color: 'bg-gray-100 text-gray-800', description: 'Other items (20% VAT)' }
};

export default function ComponentSelector({ 
  menuItemId, 
  totalPrice, 
  onComponentsChange, 
  onVATChange,
  initialComponents = []
}: ComponentSelectorProps) {
  const [isMixedItem, setIsMixedItem] = useState(initialComponents.length > 0);
  const [components, setComponents] = useState<ItemComponent[]>(initialComponents);
  
  // New component form
  const [newComponent, setNewComponent] = useState({
    componentName: '',
    componentCost: 0,
    vatRate: 20,
    componentType: 'hot_food' as const
  });

  // Calculate VAT when components change
  useEffect(() => {
    const breakdown = calculateVAT(components);
    onVATChange(breakdown);
    onComponentsChange(components);
  }, [components, onVATChange, onComponentsChange]);

  const calculateVAT = (itemComponents: ItemComponent[]): { totalVAT: number; breakdown: VATBreakdown } => {
    const breakdown: VATBreakdown = {
      hotFoodVAT: 0,
      coldFoodVAT: 0,
      alcoholVAT: 0,
      softDrinkVAT: 0,
      otherVAT: 0
    };

    let totalVAT = 0;

    itemComponents.forEach(comp => {
      if (!comp.isActive) return;
      
      // Fix: Component costs are GROSS amounts (VAT-inclusive), so extract VAT correctly
      const vatAmount = comp.vatRate > 0 ? (comp.componentCost * comp.vatRate) / (100 + comp.vatRate) : 0;
      totalVAT += vatAmount;

      switch (comp.componentType) {
        case 'hot_food':
          breakdown.hotFoodVAT += vatAmount;
          break;
        case 'cold_food':
          breakdown.coldFoodVAT += vatAmount;
          break;
        case 'alcohol':
          breakdown.alcoholVAT += vatAmount;
          break;
        case 'soft_drink':
          breakdown.softDrinkVAT += vatAmount;
          break;
        case 'other':
          breakdown.otherVAT += vatAmount;
          break;
      }
    });

    return {
      totalVAT: Math.round(totalVAT * 100) / 100,
      breakdown: {
        hotFoodVAT: Math.round(breakdown.hotFoodVAT * 100) / 100,
        coldFoodVAT: Math.round(breakdown.coldFoodVAT * 100) / 100,
        alcoholVAT: Math.round(breakdown.alcoholVAT * 100) / 100,
        softDrinkVAT: Math.round(breakdown.softDrinkVAT * 100) / 100,
        otherVAT: Math.round(breakdown.otherVAT * 100) / 100
      }
    };
  };

  const addComponent = () => {
    if (!newComponent.componentName || newComponent.componentCost <= 0) return;

    const component: ItemComponent = {
      id: `comp_${Date.now()}`,
      componentName: newComponent.componentName,
      componentCost: newComponent.componentCost,
      vatRate: newComponent.vatRate,
      componentType: newComponent.componentType,
      isActive: true,
      displayOrder: components.length + 1
    };

    setComponents(prev => [...prev, component]);
    setNewComponent({
      componentName: '',
      componentCost: 0,
      vatRate: ComponentType[newComponent.componentType].vatRate,
      componentType: 'hot_food'
    });
  };

  const removeComponent = (componentId: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== componentId));
  };

  const updateComponent = (componentId: string, updates: Partial<ItemComponent>) => {
    setComponents(prev => prev.map(comp => 
      comp.id === componentId ? { ...comp, ...updates } : comp
    ));
  };

  const getComponentTotal = () => {
    return components.reduce((sum, comp) => comp.isActive ? sum + comp.componentCost : sum, 0);
  };

  const getMixedItemValidation = () => {
    const componentTotal = getComponentTotal();
    const difference = Math.abs(componentTotal - totalPrice);
    const hasHotAndCold = components.some(c => c.componentType === 'hot_food' && c.isActive) && 
                         components.some(c => c.componentType === 'cold_food' && c.isActive);
    
    return {
      isValid: difference <= 0.01,
      difference,
      hasHotAndCold,
      componentTotal
    };
  };

  if (!isMixedItem) {
    return (
      <Card className="border-dashed border-blue-300">
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-blue-500 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Convert to Mixed Item</h3>
          <p className="text-gray-600 mb-4">
            Enable component-based VAT calculation for items with mixed hot/cold components (e.g., biryani with raita)
          </p>
          <Button onClick={() => setIsMixedItem(true)}>
            <Package className="h-4 w-4 mr-2" />
            Enable Mixed Item VAT
          </Button>
        </CardContent>
      </Card>
    );
  }

  const validation = getMixedItemValidation();
  const vatInfo = calculateVAT(components);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle>Mixed Item Components</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">HMRC Compliant</Badge>
          </div>
          <Switch
            checked={isMixedItem}
            onCheckedChange={(checked) => {
              setIsMixedItem(checked);
              if (!checked) {
                setComponents([]);
              }
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="calculator">VAT Calculator</TabsTrigger>
          </TabsList>

          {/* Manual Component Entry */}
          <TabsContent value="manual" className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="componentName">Component Name</Label>
                    <Input
                      id="componentName"
                      value={newComponent.componentName}
                      onChange={(e) => setNewComponent(prev => ({ ...prev, componentName: e.target.value }))}
                      placeholder="e.g., Hot Biryani Base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="componentCost">Cost (£)</Label>
                    <Input
                      id="componentCost"
                      type="number"
                      step="0.01"
                      value={newComponent.componentCost || ''}
                      onChange={(e) => setNewComponent(prev => ({ ...prev, componentCost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="componentType">Component Type</Label>
                    <Select
                      value={newComponent.componentType}
                      onValueChange={(value: any) => {
                        const defaultVATRate = ComponentType[value as keyof typeof ComponentType].vatRate;
                        setNewComponent(prev => ({ 
                          ...prev, 
                          componentType: value,
                          vatRate: defaultVATRate
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ComponentType).map(([key, type]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Badge className={type.color} variant="outline">
                                {type.label}
                              </Badge>
                              <span className="text-sm text-gray-500">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vatRate">VAT Rate (%)</Label>
                    <Input
                      id="vatRate"
                      type="number"
                      value={newComponent.vatRate}
                      onChange={(e) => setNewComponent(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button onClick={addComponent} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </CardContent>
            </Card>

            {/* Current Components */}
            {components.length > 0 && (
              <div className="space-y-2">
                {components.map((comp) => (
                  <Card key={comp.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={ComponentType[comp.componentType].color}>
                            {ComponentType[comp.componentType].label}
                          </Badge>
                          <span className="font-medium">{comp.componentName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">£{comp.componentCost.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">{comp.vatRate}% VAT</div>
                          </div>
                          <Switch
                            checked={comp.isActive}
                            onCheckedChange={(checked) => updateComponent(comp.id, { isActive: checked })}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeComponent(comp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* VAT Calculator */}
          <TabsContent value="calculator" className="space-y-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-lg font-semibold text-red-700">£{vatInfo.breakdown.hotFoodVAT.toFixed(2)}</div>
                    <div className="text-sm text-red-600">Hot Food VAT</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-lg font-semibold text-blue-700">£{vatInfo.breakdown.coldFoodVAT.toFixed(2)}</div>
                    <div className="text-sm text-blue-600">Cold Food VAT</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-semibold text-green-700">£{vatInfo.totalVAT.toFixed(2)}</div>
                    <div className="text-sm text-green-600">Total VAT</div>
                  </div>
                </div>

                {/* Validation Status */}
                <div className={`p-3 rounded border ${validation.isValid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validation.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      {validation.isValid ? 'Validation Passed' : 'Validation Warning'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <div>Component Total: £{validation.componentTotal.toFixed(2)}</div>
                    <div>Item Price: £{totalPrice.toFixed(2)}</div>
                    {!validation.isValid && (
                      <div className="text-yellow-700 font-medium">
                        Difference: £{validation.difference.toFixed(2)}
                      </div>
                    )}
                    {validation.hasHotAndCold && (
                      <div className="text-green-700 font-medium mt-1">
                        ✓ Mixed hot/cold item detected - HMRC compliant
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
