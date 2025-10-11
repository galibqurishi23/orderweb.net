'use client';

import React, { useState, useEffect } from 'react';
import { Check, Apple, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface DietaryCharacteristic {
  id: number;
  name: string;
  description: string;
  icon_type: 'svg' | 'png';
  svg_content?: string;
  png_path?: string;
  default_color: string;
  category: 'dietary' | 'allergen' | 'lifestyle' | 'preparation';
  is_active: boolean;
  display_order: number;
}

interface DietaryCharacteristicsSelectorProps {
  selectedCharacteristics: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  tenantId: string;
}

const categoryLabels = {
  dietary: 'Dietary',
  allergen: 'Allergen',
  lifestyle: 'Lifestyle', 
  preparation: 'Preparation'
};

const categoryColors = {
  dietary: 'bg-green-100 text-green-800 border-green-200',
  allergen: 'bg-red-100 text-red-800 border-red-200',
  lifestyle: 'bg-blue-100 text-blue-800 border-blue-200',
  preparation: 'bg-orange-100 text-orange-800 border-orange-200'
};

export default function DietaryCharacteristicsSelector({
  selectedCharacteristics = [],
  onSelectionChange,
  tenantId
}: DietaryCharacteristicsSelectorProps) {
  const [characteristics, setCharacteristics] = useState<DietaryCharacteristic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load available characteristics
  useEffect(() => {
    loadCharacteristics();
  }, []);

  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/dietary-characteristics?active=true');
      const data = await response.json();
      
      if (data.success) {
        setCharacteristics(data.characteristics || []);
      } else {
        setError('Failed to load characteristics');
      }
    } catch (error) {
      setError('Error loading characteristics');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCharacteristicToggle = (characteristicId: number, checked: boolean) => {
    let newSelection: number[];
    
    if (checked) {
      newSelection = [...selectedCharacteristics, characteristicId];
    } else {
      newSelection = selectedCharacteristics.filter(id => id !== characteristicId);
    }
    
    onSelectionChange(newSelection);
  };

  const renderIcon = (characteristic: DietaryCharacteristic, size = 20) => {
    if (characteristic.icon_type === 'svg' && characteristic.svg_content) {
      return (
        <div 
          style={{ 
            width: size, 
            height: size, 
            color: characteristic.default_color 
          }}
          dangerouslySetInnerHTML={{ __html: characteristic.svg_content }}
        />
      );
    } else if (characteristic.icon_type === 'png' && characteristic.png_path) {
      return (
        <img 
          src={characteristic.png_path} 
          alt={characteristic.name}
          style={{ width: size, height: size }}
          className="object-contain"
        />
      );
    }
    return (
      <div 
        style={{ width: size, height: size }}
        className="bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500"
      >
        <Apple className="h-3 w-3" />
      </div>
    );
  };

  // Group characteristics by category
  const groupedCharacteristics = characteristics.reduce((groups, char) => {
    if (!groups[char.category]) {
      groups[char.category] = [];
    }
    groups[char.category].push(char);
    return groups;
  }, {} as Record<string, DietaryCharacteristic[]>);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Apple className="h-4 w-4" />
          Dietary Characteristics
        </Label>
        <div className="flex items-center justify-center p-4 border border-dashed rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading characteristics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Apple className="h-4 w-4" />
          Dietary Characteristics
        </Label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-xs text-red-800">{error}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadCharacteristics}
            className="ml-auto text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (characteristics.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Apple className="h-4 w-4" />
          Dietary Characteristics
        </Label>
        <div className="p-4 border border-dashed rounded-lg text-center">
          <p className="text-xs text-gray-500">No characteristics available</p>
          <p className="text-xs text-gray-400 mt-1">Contact your system administrator</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Apple className="h-4 w-4" />
        Dietary Characteristics & Allergens
      </Label>
      
      {/* Selected Characteristics Preview */}
      {selectedCharacteristics.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <p className="text-xs font-medium text-gray-700 mb-2">Selected ({selectedCharacteristics.length}):</p>
          <div className="flex flex-wrap gap-1">
            {characteristics
              .filter(char => selectedCharacteristics.includes(char.id))
              .map((char) => (
                <Badge 
                  key={char.id} 
                  variant="secondary" 
                  className={`text-xs ${categoryColors[char.category]} flex items-center gap-1`}
                >
                  {renderIcon(char, 14)}
                  {char.name}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Characteristics by Category */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {Object.entries(groupedCharacteristics).map(([category, chars]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${categoryColors[category as keyof typeof categoryColors]}`}
              >
                {categoryLabels[category as keyof typeof categoryLabels]}
              </Badge>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {chars.map((characteristic) => {
                const isSelected = selectedCharacteristics.includes(characteristic.id);
                
                return (
                  <div
                    key={characteristic.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleCharacteristicToggle(characteristic.id, !isSelected)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleCharacteristicToggle(characteristic.id, checked as boolean)
                      }
                      className="pointer-events-none"
                    />
                    
                    <div className="flex items-center gap-2 flex-1">
                      {renderIcon(characteristic)}
                      
                      <div className="flex-1">
                        <div className="text-sm font-medium">{characteristic.name}</div>
                        {characteristic.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {characteristic.description}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([])}
          disabled={selectedCharacteristics.length === 0}
          className="text-xs"
        >
          Clear All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange(characteristics.map(c => c.id))}
          disabled={selectedCharacteristics.length === characteristics.length}
          className="text-xs"
        >
          Select All
        </Button>
      </div>
    </div>
  );
}
