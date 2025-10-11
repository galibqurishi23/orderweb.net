'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Minus, AlertTriangle, Info, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AddonGroup, AddonOption, SelectedAddon, SelectedAddonOption,
  AddonSelectionState, AddonCalculationResult, AddonValidationResult
} from '@/lib/addon-types';
import { MenuItem } from '@/lib/types';
import * as AddonService from '@/lib/addon-service';

interface AddonSelectionProps {
  menuItem: MenuItem;
  addonGroups: AddonGroup[];
  onSelectionChange: (selectedAddons: SelectedAddon[], totalPrice: number) => void;
  currencySymbol?: string;
}

export default function AddonSelection({ 
  menuItem, 
  addonGroups, 
  onSelectionChange,
  currencySymbol = '£'
}: AddonSelectionProps) {
  const { toast } = useToast();
  
  const [selectionState, setSelectionState] = useState<AddonSelectionState>({});
  const [calculation, setCalculation] = useState<AddonCalculationResult>({
    subtotal: 0,
    discounts: 0,
    total: 0,
    breakdown: []
  });
  const [validation, setValidation] = useState<AddonValidationResult>({
    isValid: true,
    errors: []
  });

  // Initialize selection state
  useEffect(() => {
    const initialState: AddonSelectionState = {};
    addonGroups.forEach(group => {
      initialState[group.id] = {
        selectedOptions: {},
        isValid: !group.required,
        errors: []
      };
    });
    setSelectionState(initialState);
  }, [addonGroups]);

  const calculateTotals = React.useCallback(() => {
    let totalPrice = 0;
    const breakdown: AddonCalculationResult['breakdown'] = [];

    addonGroups.forEach(group => {
      const groupState = selectionState[group.id];
      if (!groupState) return;

      let groupTotal = 0;
      const groupBreakdown: AddonCalculationResult['breakdown'][0] = {
        groupId: group.id,
        groupName: group.name,
        options: [],
        groupTotal: 0
      };

      Object.entries(groupState.selectedOptions).forEach(([optionId, selection]) => {
        const option = group.options.find(opt => opt.id === optionId);
        if (!option || selection.quantity === 0) return;

        let unitPrice = option.price;
        let totalOptionPrice = unitPrice * selection.quantity;

        // Apply quantity-based pricing if configured
        if (option.quantityPricing && selection.quantity > option.quantityPricing.baseQuantity) {
          const extraQuantity = selection.quantity - option.quantityPricing.baseQuantity;
          totalOptionPrice = (unitPrice * option.quantityPricing.baseQuantity) + 
                           (option.quantityPricing.additionalPrice * extraQuantity);
        }

        groupBreakdown.options.push({
          optionId: option.id,
          optionName: option.name,
          quantity: selection.quantity,
          unitPrice,
          totalPrice: totalOptionPrice
        });

        groupTotal += totalOptionPrice;
      });

      groupBreakdown.groupTotal = groupTotal;
      if (groupTotal > 0) {
        breakdown.push(groupBreakdown);
      }
      totalPrice += groupTotal;
    });

    const newCalculation: AddonCalculationResult = {
      subtotal: totalPrice,
      discounts: 0, // Could implement bulk discounts here
      total: totalPrice,
      breakdown
    };

    setCalculation(newCalculation);
  }, [addonGroups, selectionState]);

  const validateSelectionsOnly = React.useCallback(() => {
    const errors: string[] = [];
    let allValid = true;

    addonGroups.forEach(group => {
      const groupState = selectionState[group.id];
      if (!groupState) return;

      const selectedCount = Object.values(groupState.selectedOptions)
        .reduce((sum, sel) => sum + sel.quantity, 0);
      
      const groupErrors: string[] = [];

      // Check required groups
      if (group.required && selectedCount === 0) {
        groupErrors.push(`${group.name} is required`);
        allValid = false;
      }

      // Check minimum selections
      if (selectedCount > 0 && selectedCount < group.minSelections) {
        groupErrors.push(`Select at least ${group.minSelections} option${group.minSelections > 1 ? 's' : ''}`);
        allValid = false;
      }

      // Check maximum selections
      if (selectedCount > group.maxSelections) {
        groupErrors.push(`Maximum ${group.maxSelections} option${group.maxSelections > 1 ? 's' : ''} allowed`);
        allValid = false;
      }

      // Check single vs multiple type
      if (group.type === 'single' && Object.keys(groupState.selectedOptions).length > 1) {
        groupErrors.push('Only one selection allowed');
        allValid = false;
      }

      errors.push(...groupErrors);
    });

    setValidation({
      isValid: allValid,
      errors
    });

    // Convert to SelectedAddon format and notify parent
    const selectedAddons: SelectedAddon[] = addonGroups
      .map(group => {
        const groupState = selectionState[group.id];
        if (!groupState) return null;

        const options: SelectedAddonOption[] = Object.entries(groupState.selectedOptions)
          .filter(([_, selection]) => selection.quantity > 0)
          .map(([optionId, selection]) => {
            const option = group.options.find(opt => opt.id === optionId);
            if (!option) return null;

            let totalPrice = option.price * selection.quantity;
            
            // Apply quantity-based pricing
            if (option.quantityPricing && selection.quantity > option.quantityPricing.baseQuantity) {
              const extraQuantity = selection.quantity - option.quantityPricing.baseQuantity;
              totalPrice = (option.price * option.quantityPricing.baseQuantity) + 
                          (option.quantityPricing.additionalPrice * extraQuantity);
            }

            return {
              optionId: option.id,
              quantity: selection.quantity,
              customNote: selection.customNote,
              totalPrice
            };
          })
          .filter(Boolean) as SelectedAddonOption[];

        if (options.length === 0) return null;

        return {
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          options,
          totalPrice: options.reduce((sum, opt) => sum + opt.totalPrice, 0)
        };
      })
      .filter(Boolean) as SelectedAddon[];

    onSelectionChange(selectedAddons, calculation.total);
  }, [addonGroups, selectionState, calculation.total]);

  // Calculate totals and validate when selection changes
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  useEffect(() => {
    validateSelectionsOnly();
  }, [validateSelectionsOnly]);

  const handleOptionChange = (groupId: string, optionId: string, quantity: number, customNote?: string) => {
    const group = addonGroups.find(g => g.id === groupId);
    if (!group) return;

    setSelectionState(prev => {
      const newState = { ...prev };
      
      if (!newState[groupId]) {
        newState[groupId] = { selectedOptions: {}, isValid: true, errors: [] };
      }

      if (group.type === 'single') {
        // For single selection, clear other options
        newState[groupId].selectedOptions = {};
      }

      if (quantity > 0) {
        newState[groupId].selectedOptions[optionId] = { quantity, customNote };
      } else {
        delete newState[groupId].selectedOptions[optionId];
      }

      return newState;
    });
  };

  const getOptionQuantity = (groupId: string, optionId: string): number => {
    return selectionState[groupId]?.selectedOptions[optionId]?.quantity || 0;
  };

  const isOptionSelected = (groupId: string, optionId: string): boolean => {
    return getOptionQuantity(groupId, optionId) > 0;
  };

  const renderOption = (group: AddonGroup, option: AddonOption) => {
    const quantity = getOptionQuantity(group.id, option.id);
    const isSelected = isOptionSelected(group.id, option.id);

    const optionPrice = option.price === 0 ? 'Free' : `+${currencySymbol}${option.price.toFixed(2)}`;

    if (group.type === 'single') {
      return (
        <div
          key={option.id}
          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
            isSelected 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200 hover:border-gray-300'
          } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (!option.available) return;
            handleOptionChange(group.id, option.id, isSelected ? 0 : 1);
          }}
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem
              value={option.id}
              checked={isSelected}
              disabled={!option.available}
            />
            <div>
              <div className="font-medium">{option.name}</div>
              {option.description && (
                <div className="text-sm text-muted-foreground">{option.description}</div>
              )}
            </div>
          </div>
          <div className="text-sm font-medium">{optionPrice}</div>
        </div>
      );
    } else {
      return (
        <div
          key={option.id}
          className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
            isSelected 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-200'
          } ${!option.available ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked: boolean) => {
                if (!option.available) return;
                if (checked) {
                  handleOptionChange(group.id, option.id, 1);
                } else {
                  handleOptionChange(group.id, option.id, 0);
                }
              }}
              disabled={!option.available}
            />
            <div>
              <div className="font-medium">{option.name}</div>
              {option.description && (
                <div className="text-sm text-muted-foreground">{option.description}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">{optionPrice}</div>
            
            {isSelected && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (quantity > 1) {
                      handleOptionChange(group.id, option.id, quantity - 1);
                    } else {
                      handleOptionChange(group.id, option.id, 0);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <span className="w-8 text-center font-medium">{quantity}</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    const maxAllowed = group.maxSelections - 
                      Object.values(selectionState[group.id]?.selectedOptions || {})
                        .reduce((sum, sel) => sel.quantity, 0) + quantity;
                    
                    if (quantity < maxAllowed) {
                      handleOptionChange(group.id, option.id, quantity + 1);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const renderGroup = (group: AddonGroup) => {
    const groupState = selectionState[group.id];
    const hasErrors = groupState && groupState.errors.length > 0;

    return (
      <Card key={group.id} className={`${hasErrors ? 'border-red-200' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {group.name}
              {group.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {group.category}
              </Badge>
            </CardTitle>
            
            <div className="text-sm text-muted-foreground">
              {group.type === 'single' ? 'Choose one' : 
                `Choose ${group.minSelections}-${group.maxSelections}`}
            </div>
          </div>
          
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
          
          {hasErrors && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {groupState.errors.join(', ')}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-3">
          {group.type === 'single' ? (
            <RadioGroup>
              {group.options.map(option => renderOption(group, option))}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {group.options.map(option => renderOption(group, option))}
            </div>
          )}
          
          {group.allowCustomInput && (
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium">Special Instructions</Label>
              <Textarea
                placeholder="Any special requests for this selection..."
                className="mt-2"
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (addonGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {addonGroups.map(renderGroup)}
      </div>
      
      {/* Price Summary */}
      {calculation.total > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Add-ons Total:</span>
                <span className="font-bold text-lg">
                  {currencySymbol}{calculation.total.toFixed(2)}
                </span>
              </div>
              
              {calculation.breakdown.map(group => (
                <div key={group.groupId} className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{group.groupName}:</span>
                    <span>{currencySymbol}{group.groupTotal.toFixed(2)}</span>
                  </div>
                  {group.options.map(option => (
                    <div key={option.optionId} className="flex justify-between ml-4 text-xs">
                      <span>
                        {option.optionName} 
                        {option.quantity > 1 && ` x${option.quantity}`}
                      </span>
                      <span>{currencySymbol}{option.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <AlertTriangle className="h-5 w-5" />
            Please complete your selection:
          </div>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
