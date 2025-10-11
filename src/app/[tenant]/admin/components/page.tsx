'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Copy, Settings, Package, Calculator } from 'lucide-react';

// Types for component management
interface ComponentTemplate {
  id: string;
  templateName: string;
  description?: string;
  isActive: boolean;
  components: TemplateComponent[];
  createdAt: string;
}

interface TemplateComponent {
  id: string;
  componentName: string;
  defaultCost: number;
  vatRate: number;
  componentType: 'hot_food' | 'cold_food' | 'alcohol' | 'soft_drink' | 'other';
  displayOrder: number;
}

interface ItemComponent {
  id: string;
  componentName: string;
  componentCost: number;
  vatRate: number;
  componentType: 'hot_food' | 'cold_food' | 'alcohol' | 'soft_drink' | 'other';
  isActive: boolean;
  displayOrder: number;
}

interface CommonComponent {
  id: string;
  componentName: string;
  averageCost: number;
  vatRate: number;
  componentType: 'hot_food' | 'cold_food' | 'alcohol' | 'soft_drink' | 'other';
  usageCount: number;
}

const ComponentType = {
  hot_food: { label: 'Hot Food', vatRate: 20, color: 'bg-red-100 text-red-800' },
  cold_food: { label: 'Cold Food', vatRate: 0, color: 'bg-blue-100 text-blue-800' },
  alcohol: { label: 'Alcohol', vatRate: 20, color: 'bg-purple-100 text-purple-800' },
  soft_drink: { label: 'Soft Drink', vatRate: 20, color: 'bg-green-100 text-green-800' },
  other: { label: 'Other', vatRate: 20, color: 'bg-gray-100 text-gray-800' }
};

export default function ComponentManagementPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [commonComponents, setCommonComponents] = useState<CommonComponent[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  
  // Template creation form state
  const [newTemplate, setNewTemplate] = useState({
    templateName: '',
    description: '',
    components: [] as Omit<TemplateComponent, 'id'>[]
  });

  // Component form state
  const [newComponent, setNewComponent] = useState({
    componentName: '',
    defaultCost: 0,
    vatRate: 20,
    componentType: 'hot_food' as const,
    displayOrder: 1
  });

  // Load sample data on component mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    // Sample component templates (from database)
    const sampleTemplates: ComponentTemplate[] = [
      {
        id: 'template_biryani',
        templateName: 'Biryani Combo',
        description: 'Hot biryani with cold raita - standard mixed VAT item',
        isActive: true,
        createdAt: '2025-09-07T16:28:34Z',
        components: [
          {
            id: 'comp_biryani_hot',
            componentName: 'Hot Biryani Base',
            defaultCost: 8.00,
            vatRate: 20.00,
            componentType: 'hot_food',
            displayOrder: 1
          },
          {
            id: 'comp_biryani_cold',
            componentName: 'Cold Raita',
            defaultCost: 2.00,
            vatRate: 0.00,
            componentType: 'cold_food',
            displayOrder: 2
          }
        ]
      },
      {
        id: 'template_pizza',
        templateName: 'Pizza Set',
        description: 'Hot pizza with cold salad and drink',
        isActive: true,
        createdAt: '2025-09-07T16:28:34Z',
        components: [
          {
            id: 'comp_pizza_main',
            componentName: 'Hot Pizza',
            defaultCost: 12.00,
            vatRate: 20.00,
            componentType: 'hot_food',
            displayOrder: 1
          },
          {
            id: 'comp_pizza_salad',
            componentName: 'Cold Salad',
            defaultCost: 2.50,
            vatRate: 0.00,
            componentType: 'cold_food',
            displayOrder: 2
          },
          {
            id: 'comp_pizza_drink',
            componentName: 'Soft Drink',
            defaultCost: 1.50,
            vatRate: 20.00,
            componentType: 'soft_drink',
            displayOrder: 3
          }
        ]
      },
      {
        id: 'template_curry',
        templateName: 'Standard Curry Combo',
        description: 'Hot curry with cold sides and rice',
        isActive: true,
        createdAt: '2025-09-07T16:28:34Z',
        components: [
          {
            id: 'comp_curry_hot',
            componentName: 'Hot Curry Base',
            defaultCost: 10.00,
            vatRate: 20.00,
            componentType: 'hot_food',
            displayOrder: 1
          },
          {
            id: 'comp_curry_rice',
            componentName: 'Rice Portion',
            defaultCost: 1.50,
            vatRate: 0.00,
            componentType: 'cold_food',
            displayOrder: 2
          },
          {
            id: 'comp_curry_bread',
            componentName: 'Naan/Chapati',
            defaultCost: 2.00,
            vatRate: 20.00,
            componentType: 'hot_food',
            displayOrder: 3
          }
        ]
      }
    ];

    const sampleCommonComponents: CommonComponent[] = [
      {
        id: 'common_rice',
        componentName: 'Rice Portion',
        averageCost: 1.50,
        vatRate: 0.00,
        componentType: 'cold_food',
        usageCount: 15
      },
      {
        id: 'common_naan',
        componentName: 'Naan Bread',
        averageCost: 2.00,
        vatRate: 20.00,
        componentType: 'hot_food',
        usageCount: 12
      },
      {
        id: 'common_raita',
        componentName: 'Raita (Cold)',
        averageCost: 1.50,
        vatRate: 0.00,
        componentType: 'cold_food',
        usageCount: 8
      },
      {
        id: 'common_curry_base',
        componentName: 'Curry Base (Hot)',
        averageCost: 8.00,
        vatRate: 20.00,
        componentType: 'hot_food',
        usageCount: 10
      }
    ];

    setTemplates(sampleTemplates);
    setCommonComponents(sampleCommonComponents);
  };

  const addComponentToTemplate = () => {
    if (!newComponent.componentName) return;

    setNewTemplate(prev => ({
      ...prev,
      components: [
        ...prev.components,
        {
          ...newComponent,
          displayOrder: prev.components.length + 1
        }
      ]
    }));

    // Reset component form
    setNewComponent({
      componentName: '',
      defaultCost: 0,
      vatRate: 20,
      componentType: 'hot_food',
      displayOrder: 1
    });
  };

  const removeComponentFromTemplate = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const createTemplate = () => {
    if (!newTemplate.templateName || newTemplate.components.length === 0) return;

    const template: ComponentTemplate = {
      id: `template_${Date.now()}`,
      templateName: newTemplate.templateName,
      description: newTemplate.description,
      isActive: true,
      createdAt: new Date().toISOString(),
      components: newTemplate.components.map((comp, index) => ({
        ...comp,
        id: `comp_${Date.now()}_${index}`
      }))
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({ templateName: '', description: '', components: [] });
    setIsCreatingTemplate(false);
  };

  const calculateTemplateVAT = (template: ComponentTemplate) => {
    let totalCost = 0;
    let totalVAT = 0;
    const breakdown = { hotFood: 0, coldFood: 0, alcohol: 0, softDrink: 0, other: 0 };

    template.components.forEach(comp => {
      totalCost += comp.defaultCost;
      // Fix: Component costs are NET amounts (VAT-exclusive), so calculate VAT correctly
      const vatAmount = comp.vatRate > 0 ? (comp.defaultCost * comp.vatRate) / 100 : 0;
      totalVAT += vatAmount;

      switch (comp.componentType) {
        case 'hot_food':
          breakdown.hotFood += vatAmount;
          break;
        case 'cold_food':
          breakdown.coldFood += vatAmount;
          break;
        case 'alcohol':
          breakdown.alcohol += vatAmount;
          break;
        case 'soft_drink':
          breakdown.softDrink += vatAmount;
          break;
        case 'other':
          breakdown.other += vatAmount;
          break;
      }
    });

    return { totalCost, totalVAT, breakdown };
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Management</h1>
        <p className="text-gray-600">Manage component templates and mixed VAT items for HMRC compliance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Common Components
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            VAT Calculator
          </TabsTrigger>
        </TabsList>

        {/* Component Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Component Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template) => {
                  const vatCalc = calculateTemplateVAT(template);
                  return (
                    <Card key={template.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{template.templateName}</h3>
                            <p className="text-gray-600 text-sm">{template.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Total Cost</div>
                            <div className="text-lg font-semibold">£{vatCalc.totalCost.toFixed(2)}</div>
                            <div className="text-sm text-green-600">VAT: £{vatCalc.totalVAT.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {template.components.map((comp) => (
                            <div key={comp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                <Badge className={ComponentType[comp.componentType].color}>
                                  {ComponentType[comp.componentType].label}
                                </Badge>
                                <span className="font-medium">{comp.componentName}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">£{comp.defaultCost.toFixed(2)}</span>
                                <span className="text-sm text-gray-500 ml-2">({comp.vatRate}% VAT)</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Clone template logic would go here
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Clone
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Common Components Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {commonComponents
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .map((component) => (
                    <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={ComponentType[component.componentType].color}>
                          {ComponentType[component.componentType].label}
                        </Badge>
                        <div>
                          <div className="font-medium">{component.componentName}</div>
                          <div className="text-sm text-gray-500">Used {component.usageCount} times</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">£{component.averageCost.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{component.vatRate}% VAT</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Template Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Component Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.templateName}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, templateName: e.target.value }))}
                    placeholder="e.g., Fish & Chips Combo"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this template"
                  />
                </div>
              </div>

              {/* Add Component Section */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Add Component</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="componentName">Component Name</Label>
                      <Input
                        id="componentName"
                        value={newComponent.componentName}
                        onChange={(e) => setNewComponent(prev => ({ ...prev, componentName: e.target.value }))}
                        placeholder="e.g., Hot Fish Fillet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="componentCost">Cost (£)</Label>
                      <Input
                        id="componentCost"
                        type="number"
                        step="0.01"
                        value={newComponent.defaultCost || ''}
                        onChange={(e) => setNewComponent(prev => ({ ...prev, defaultCost: parseFloat(e.target.value) || 0 }))}
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
                              {type.label} ({type.vatRate}% VAT)
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
                  <Button onClick={addComponentToTemplate} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </Button>
                </CardContent>
              </Card>

              {/* Current Components */}
              {newTemplate.components.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Template Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {newTemplate.components.map((comp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Badge className={ComponentType[comp.componentType].color}>
                              {ComponentType[comp.componentType].label}
                            </Badge>
                            <span className="font-medium">{comp.componentName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>£{comp.defaultCost.toFixed(2)} ({comp.vatRate}% VAT)</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeComponentFromTemplate(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button onClick={createTemplate} className="w-full">
                        Create Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Mixed Item VAT Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {templates.map((template) => {
                  const vatCalc = calculateTemplateVAT(template);
                  return (
                    <Card key={template.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{template.templateName}</h3>
                            <p className="text-gray-600">{template.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">£{vatCalc.totalVAT.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">Total VAT</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                          <div className="p-3 bg-red-50 rounded">
                            <div className="text-lg font-semibold text-red-700">£{vatCalc.breakdown.hotFood.toFixed(2)}</div>
                            <div className="text-sm text-red-600">Hot Food VAT</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded">
                            <div className="text-lg font-semibold text-blue-700">£{vatCalc.breakdown.coldFood.toFixed(2)}</div>
                            <div className="text-sm text-blue-600">Cold Food VAT</div>
                          </div>
                          <div className="p-3 bg-purple-50 rounded">
                            <div className="text-lg font-semibold text-purple-700">£{vatCalc.breakdown.alcohol.toFixed(2)}</div>
                            <div className="text-sm text-purple-600">Alcohol VAT</div>
                          </div>
                          <div className="p-3 bg-green-50 rounded">
                            <div className="text-lg font-semibold text-green-700">£{vatCalc.breakdown.softDrink.toFixed(2)}</div>
                            <div className="text-sm text-green-600">Drink VAT</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <div className="text-lg font-semibold text-gray-700">£{vatCalc.breakdown.other.toFixed(2)}</div>
                            <div className="text-sm text-gray-600">Other VAT</div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="text-sm font-medium text-yellow-800">HMRC Compliance</div>
                          <div className="text-sm text-yellow-700">
                            This template uses component-based VAT calculation. 
                            Hot components (≥60°C) = 20% VAT, Cold components (&lt;60°C) = 0% VAT.
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
