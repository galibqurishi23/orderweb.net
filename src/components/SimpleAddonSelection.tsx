'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Minus } from 'lucide-react';
import { 
  AddonGroup, AddonOption, SelectedAddon, SelectedAddonOption
} from '@/lib/addon-types';

interface SimpleAddonSelectionProps {
  menuItem: any;
  addonGroups: AddonGroup[];
  onSelectionChange: (selectedAddons: SelectedAddon[], totalPrice: number) => void;
  currencySymbol?: string;
}

export default function SimpleAddonSelection({ 
  menuItem, 
  addonGroups, 
  onSelectionChange,
  currencySymbol = '£'
}: SimpleAddonSelectionProps) {
  const [selections, setSelections] = useState<Record<string, Record<string, number>>>({});

  // Initialize selections for all groups
  useEffect(() => {
    const initialSelections: Record<string, Record<string, number>> = {};
    addonGroups.forEach(group => {
      initialSelections[group.id] = {};
    });
    setSelections(initialSelections);
  }, [addonGroups]);

  // Calculate totals and notify parent whenever selections change
  useEffect(() => {
    let totalPrice = 0;
    const selectedAddons: SelectedAddon[] = [];

    addonGroups.forEach(group => {
      const groupSelections = selections[group.id] || {};
      const selectedOptions: SelectedAddonOption[] = [];

      Object.entries(groupSelections).forEach(([optionId, quantity]) => {
        if (quantity > 0) {
          const option = group.options.find(opt => opt.id === optionId);
          if (option) {
            const optionTotal = option.price * quantity;
            totalPrice += optionTotal;
            
            selectedOptions.push({
              optionId: option.id,
              quantity,
              customNote: '',
              totalPrice: optionTotal
            });
          }
        }
      });

      if (selectedOptions.length > 0) {
        selectedAddons.push({
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          options: selectedOptions,
          totalPrice: selectedOptions.reduce((sum, opt) => sum + opt.totalPrice, 0)
        });
      }
    });

    onSelectionChange(selectedAddons, totalPrice);
  }, [selections, addonGroups, onSelectionChange]);

  const updateSelection = useCallback((groupId: string, optionId: string, quantity: number) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      
      if (!newSelections[groupId]) {
        newSelections[groupId] = {};
      }

      // For single selection groups, clear other selections
      const group = addonGroups.find(g => g.id === groupId);
      if (group?.type === 'single') {
        newSelections[groupId] = {};
      }

      if (quantity > 0) {
        newSelections[groupId][optionId] = quantity;
      } else {
        delete newSelections[groupId][optionId];
      }

      return newSelections;
    });
  }, [addonGroups]);

  const getOptionQuantity = (groupId: string, optionId: string): number => {
    return selections[groupId]?.[optionId] || 0;
  };

  const renderOption = (group: AddonGroup, option: AddonOption) => {
    const quantity = getOptionQuantity(group.id, option.id);
    const isSelected = quantity > 0;
    const priceText = option.price === 0 ? 'Free' : `+${currencySymbol}${option.price.toFixed(2)}`;

    if (group.type === 'single') {
      return (
        <div
          key={option.id}
          className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-all ${
            isSelected 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200 hover:border-gray-300'
          } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (!option.available) return;
            updateSelection(group.id, option.id, isSelected ? 0 : 1);
          }}
        >
          <div className="flex items-center space-x-2.5">
            <RadioGroupItem
              value={option.id}
              checked={isSelected}
              disabled={!option.available}
              className="pointer-events-none"
            />
            <div>
              <div className="font-medium text-sm">{option.name}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground">{option.description}</div>
              )}
            </div>
          </div>
          <div className="text-xs font-medium">{priceText}</div>
        </div>
      );
    } else {
      return (
        <div
          key={option.id}
          className={`flex items-center justify-between p-2.5 border rounded-lg transition-all ${
            isSelected 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200'
          } ${!option.available ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center space-x-2.5">
            <Checkbox
              checked={isSelected}
              disabled={!option.available}
              onCheckedChange={(checked) => {
                if (!option.available) return;
                updateSelection(group.id, option.id, checked ? 1 : 0);
              }}
            />
            <div>
              <div className="font-medium text-sm">{option.name}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground">{option.description}</div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium">{priceText}</span>
            {isSelected && (
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 w-5 p-0"
                  onClick={() => updateSelection(group.id, option.id, Math.max(0, quantity - 1))}
                  disabled={!option.available}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                <span className="text-xs font-medium min-w-[16px] text-center">{quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 w-5 p-0"
                  onClick={() => updateSelection(group.id, option.id, quantity + 1)}
                  disabled={!option.available}
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const renderGroup = (group: AddonGroup) => {
    return (
      <Card key={group.id} className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            {group.name}
            {group.required && (
              <span className="text-red-500 text-xs">*Required</span>
            )}
          </CardTitle>
          {group.description && (
            <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 pt-0 px-4 pb-3">
          {group.options.map(option => renderOption(group, option))}
        </CardContent>
      </Card>
    );
  };

  if (!addonGroups || addonGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {addonGroups.map(renderGroup)}
    </div>
  );
}
