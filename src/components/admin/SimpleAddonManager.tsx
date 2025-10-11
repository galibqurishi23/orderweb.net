'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Trash2, Package
} from 'lucide-react';

interface SimpleAddon {
  id: string;
  name: string;
  price: number;
  type: 'size' | 'extra' | 'sauce' | 'sides' | 'drink' | 'dessert';
  required: boolean;
}

interface SimpleAddonManagerProps {
  addons: SimpleAddon[];
  onChange: (addons: SimpleAddon[]) => void;
  currency?: string;
}

export default function SimpleAddonManager({ 
  addons = [], 
  onChange,
  currency = '£'
}: SimpleAddonManagerProps) {
  
  const addNewAddon = () => {
    const newAddon: SimpleAddon = {
      id: `addon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      price: 0,
      type: 'extra',
      required: false
    };
    onChange([...addons, newAddon]);
  };

  const updateAddon = (id: string, updates: Partial<SimpleAddon>) => {
    const updatedAddons = addons.map(addon => 
      addon.id === id ? { ...addon, ...updates } : addon
    );
    onChange(updatedAddons);
  };

  const removeAddon = (id: string) => {
    const filteredAddons = addons.filter(addon => addon.id !== id);
    onChange(filteredAddons);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Add-ons</CardTitle>
          </div>
          <Button 
            onClick={addNewAddon}
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {addons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No add-ons yet. Click "Add" to create your first add-on.</p>
          </div>
        ) : (
          addons.map((addon, index) => (
            <div key={addon.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm text-gray-700">Add-on {index + 1}</span>
                <Button
                  onClick={() => removeAddon(addon.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    value={addon.name}
                    onChange={(e) => updateAddon(addon.id, { name: e.target.value })}
                    placeholder="e.g., Extra Cheese"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Price ({currency})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addon.price}
                    onChange={(e) => updateAddon(addon.id, { price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Select
                    value={addon.type}
                    onValueChange={(value) => updateAddon(addon.id, { type: value as SimpleAddon['type'] })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="extra">Extra</SelectItem>
                      <SelectItem value="sauce">Sauce</SelectItem>
                      <SelectItem value="sides">Sides</SelectItem>
                      <SelectItem value="drink">Drink</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id={`required-${addon.id}`}
                    checked={addon.required}
                    onCheckedChange={(checked) => updateAddon(addon.id, { required: checked as boolean })}
                  />
                  <Label htmlFor={`required-${addon.id}`} className="text-sm">
                    Required
                  </Label>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
