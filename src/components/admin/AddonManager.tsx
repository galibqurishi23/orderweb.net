'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Trash2, Save, Settings, Package, 
  DollarSign, Info, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddonOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

interface AddonGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  category: 'size' | 'extra' | 'sauce' | 'sides' | 'drink' | 'dessert';
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: AddonOption[];
}

interface AddonManagerProps {
  menuItemId?: string;
  initialAddonGroups?: AddonGroup[];
  onAddonGroupsChange: (groups: AddonGroup[]) => void;
  isReadOnly?: boolean;
}

export default function AddonManager({ 
  menuItemId, 
  initialAddonGroups = [], 
  onAddonGroupsChange,
  isReadOnly = false 
}: AddonManagerProps) {
  const { toast } = useToast();
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>(initialAddonGroups);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setAddonGroups(initialAddonGroups);
  }, [initialAddonGroups]);

  // Only call onAddonGroupsChange when addonGroups actually changes
  // and avoid calling on initial render or when unchanged
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [previousGroups, setPreviousGroups] = useState<string>('');
  
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      setPreviousGroups(JSON.stringify(addonGroups));
      return;
    }
    
    const currentGroupsStr = JSON.stringify(addonGroups);
    if (currentGroupsStr !== previousGroups) {
      setPreviousGroups(currentGroupsStr);
      onAddonGroupsChange(addonGroups);
      setHasUnsavedChanges(true);
    }
  }, [addonGroups]); // Remove onAddonGroupsChange from dependencies

  const createNewGroup = () => {
    const newGroup: AddonGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      type: 'multiple',
      category: 'extra',
      required: false,
      minSelections: 0,
      maxSelections: 5,
      options: []
    };

    setAddonGroups(prev => [...prev, newGroup]);
    setActiveGroupIndex(addonGroups.length);
  };

  const updateGroup = (index: number, updates: Partial<AddonGroup>) => {
    setAddonGroups(prev => prev.map((group, i) => 
      i === index ? { ...group, ...updates } : group
    ));
  };

  const deleteGroup = (index: number) => {
    setAddonGroups(prev => prev.filter((_, i) => i !== index));
    if (activeGroupIndex === index) {
      setActiveGroupIndex(null);
    } else if (activeGroupIndex !== null && activeGroupIndex > index) {
      setActiveGroupIndex(activeGroupIndex - 1);
    }
  };

  const addOption = (groupIndex: number) => {
    const newOption: AddonOption = {
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      price: 0,
      available: true
    };

    updateGroup(groupIndex, {
      options: [...addonGroups[groupIndex].options, newOption]
    });
  };

  const updateOption = (groupIndex: number, optionIndex: number, updates: Partial<AddonOption>) => {
    const updatedOptions = addonGroups[groupIndex].options.map((option, i) =>
      i === optionIndex ? { ...option, ...updates } : option
    );
    updateGroup(groupIndex, { options: updatedOptions });
  };

  const deleteOption = (groupIndex: number, optionIndex: number) => {
    const updatedOptions = addonGroups[groupIndex].options.filter((_, i) => i !== optionIndex);
    updateGroup(groupIndex, { options: updatedOptions });
  };

  const validateGroups = (): string[] => {
    const errors: string[] = [];
    
    addonGroups.forEach((group, groupIndex) => {
      if (!group.name.trim()) {
        errors.push(`Group ${groupIndex + 1}: Name is required`);
      }
      
      if (group.options.length === 0) {
        errors.push(`Group ${groupIndex + 1}: At least one option is required`);
      }
      
      group.options.forEach((option, optionIndex) => {
        if (!option.name.trim()) {
          errors.push(`Group ${groupIndex + 1}, Option ${optionIndex + 1}: Name is required`);
        }
        if (option.price < 0) {
          errors.push(`Group ${groupIndex + 1}, Option ${optionIndex + 1}: Price cannot be negative`);
        }
      });

      // Validate single choice groups have correct selection limits
      if (group.type === 'single' && group.maxSelections !== 1) {
        errors.push(`Group ${groupIndex + 1}: Single choice groups must have max selections = 1`);
      }
    });

    return errors;
  };

  const handleSave = async () => {
    const errors = validateGroups();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive"
      });
      return;
    }

    try {
      // This will be handled by the parent component when saving the menu item
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Add-on groups saved successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to save add-on groups",
        variant: "destructive"
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'size': return '📏';
      case 'extra': return '➕';
      case 'sauce': return '🥄';
      case 'sides': return '🍟';
      case 'drink': return '🥤';
      case 'dessert': return '🍰';
      default: return '📦';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  if (isReadOnly && addonGroups.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No add-on groups configured for this menu item.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg flex items-center justify-center border border-orange-200">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Add-on Management</h3>
            <p className="text-sm text-gray-600">Configure customizable options for this menu item</p>
          </div>
        </div>
        
        {!isReadOnly && (
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            <Button onClick={createNewGroup} size="sm" className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 hover:border-blue-300">
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {addonGroups.map((group, groupIndex) => (
          <Card key={group.id} className={`transition-all duration-200 ${activeGroupIndex === groupIndex ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(group.category)}</span>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {group.name || `Untitled Group ${groupIndex + 1}`}
                      <Badge className={getTypeColor(group.type)}>
                        {group.type === 'single' ? 'Choose One' : 'Choose Multiple'}
                      </Badge>
                      {group.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-gray-600">
                      {group.options.length} option{group.options.length !== 1 ? 's' : ''} • 
                      {group.type === 'multiple' ? ` ${group.minSelections}-${group.maxSelections} selections` : ' Single choice'}
                    </div>
                  </div>
                </div>
                
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveGroupIndex(activeGroupIndex === groupIndex ? null : groupIndex)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGroup(groupIndex)}
                      className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Group Configuration (Expanded) */}
            {activeGroupIndex === groupIndex && !isReadOnly && (
              <CardContent className="space-y-4 border-t bg-gray-50">
                {/* Basic Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Group Name *</Label>
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                      placeholder="e.g., Size Options, Extra Toppings"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select 
                      value={group.category} 
                      onValueChange={(value: any) => updateGroup(groupIndex, { category: value })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="size">📏 Size Options</SelectItem>
                        <SelectItem value="extra">➕ Extra Items</SelectItem>
                        <SelectItem value="sauce">🥄 Sauces</SelectItem>
                        <SelectItem value="sides">🍟 Side Dishes</SelectItem>
                        <SelectItem value="drink">🥤 Beverages</SelectItem>
                        <SelectItem value="dessert">🍰 Desserts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selection Type and Rules */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selection Type</Label>
                    <Select 
                      value={group.type} 
                      onValueChange={(value: any) => updateGroup(groupIndex, { 
                        type: value,
                        maxSelections: value === 'single' ? 1 : group.maxSelections,
                        minSelections: value === 'single' ? (group.required ? 1 : 0) : group.minSelections
                      })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Choice</SelectItem>
                        <SelectItem value="multiple">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {group.type === 'multiple' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Min Selections</Label>
                        <Input
                          type="number"
                          min="0"
                          max={group.maxSelections}
                          value={group.minSelections}
                          onChange={(e) => updateGroup(groupIndex, { minSelections: parseInt(e.target.value) || 0 })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Max Selections</Label>
                        <Input
                          type="number"
                          min={group.minSelections}
                          value={group.maxSelections}
                          onChange={(e) => updateGroup(groupIndex, { maxSelections: parseInt(e.target.value) || 1 })}
                          className="bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Required Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${groupIndex}`}
                    checked={group.required}
                    onCheckedChange={(checked) => updateGroup(groupIndex, { required: checked as boolean })}
                  />
                  <Label htmlFor={`required-${groupIndex}`} className="text-sm font-medium">
                    This selection is required
                  </Label>
                </div>

                <Separator />

                {/* Options Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Options</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(groupIndex)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Input
                            placeholder="Option name"
                            value={option.name}
                            onChange={(e) => updateOption(groupIndex, optionIndex, { name: e.target.value })}
                          />
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={option.price}
                              onChange={(e) => updateOption(groupIndex, optionIndex, { price: parseFloat(e.target.value) || 0 })}
                              className="pl-9"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`available-${groupIndex}-${optionIndex}`}
                                checked={option.available}
                                onCheckedChange={(checked) => updateOption(groupIndex, optionIndex, { available: checked as boolean })}
                              />
                              <Label htmlFor={`available-${groupIndex}-${optionIndex}`} className="text-sm">
                                Available
                              </Label>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOption(groupIndex, optionIndex)}
                          className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}

            {/* Options Preview (Collapsed) */}
            {activeGroupIndex !== groupIndex && group.options.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {group.options.slice(0, 3).map((option) => (
                    <div key={option.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-700">{option.name}</span>
                      <span className="font-medium">
                        {option.price === 0 ? 'Free' : `+$${option.price.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {group.options.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{group.options.length - 3} more option{group.options.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {addonGroups.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Add-on Groups</h3>
            <p className="text-gray-600 mb-4 max-w-sm">
              Create add-on groups to allow customers to customize this menu item with extras, sizes, or alternatives.
            </p>
            {!isReadOnly && (
              <Button onClick={createNewGroup} className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 hover:border-blue-300">
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Status */}
      {!isReadOnly && addonGroups.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              {hasUnsavedChanges ? 'Changes will be saved with the menu item' : 'All changes saved'}
            </span>
          </div>
          <div className="text-sm text-blue-600">
            {addonGroups.length} group{addonGroups.length !== 1 ? 's' : ''} configured
          </div>
        </div>
      )}
    </div>
  );
}
