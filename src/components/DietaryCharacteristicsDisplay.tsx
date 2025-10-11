'use client';

import React, { useState, useEffect } from 'react';
import { Apple } from 'lucide-react';

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

interface DietaryCharacteristicsDisplayProps {
  menuItemId: string;
  tenantId: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltips?: boolean;
  className?: string;
}

export default function DietaryCharacteristicsDisplay({
  menuItemId,
  tenantId,
  size = 'sm',
  showTooltips = true,
  className = ''
}: DietaryCharacteristicsDisplayProps) {
  const [characteristics, setCharacteristics] = useState<DietaryCharacteristic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Size configurations - Made bigger for better visibility
  const sizeConfig = {
    sm: { icon: 24, gap: 'gap-1.5' },    // Increased from 16px
    md: { icon: 32, gap: 'gap-2' },      // Increased from 20px  
    lg: { icon: 40, gap: 'gap-2.5' }     // Increased from 24px
  };

  const config = sizeConfig[size];

  useEffect(() => {
    if (menuItemId && tenantId) {
      loadCharacteristics();
    }
  }, [menuItemId, tenantId]);

  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 DietaryCharacteristicsDisplay - Loading characteristics:', {
        menuItemId,
        tenantId,
        apiUrl: `/api/menu-item-characteristics?menu_item_id=${menuItemId}&tenant=${tenantId}`
      });
      
      const response = await fetch(
        `/api/menu-item-characteristics?menu_item_id=${menuItemId}&tenant=${tenantId}`
      );
      
      const data = await response.json();
      
      console.log('📋 DietaryCharacteristicsDisplay - API Response:', {
        success: data.success,
        characteristicsCount: data.characteristics?.length || 0,
        data
      });
      
      if (data.success) {
        setCharacteristics(data.characteristics || []);
      } else {
        setError('Failed to load characteristics');
      }
    } catch (error) {
      setError('Error loading characteristics');
      console.error('❌ DietaryCharacteristicsDisplay - Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (characteristic: DietaryCharacteristic) => {
    if (characteristic.icon_type === 'svg' && characteristic.svg_content) {
      return (
        <div 
          style={{ 
            width: config.icon, 
            height: config.icon, 
            color: characteristic.default_color 
          }}
          dangerouslySetInnerHTML={{ __html: characteristic.svg_content }}
          title={showTooltips ? `${characteristic.name}: ${characteristic.description}` : characteristic.name}
        />
      );
    } else if (characteristic.icon_type === 'png' && characteristic.png_path) {
      return (
        <img 
          src={characteristic.png_path} 
          alt={characteristic.name}
          title={showTooltips ? `${characteristic.name}: ${characteristic.description}` : characteristic.name}
          style={{ width: config.icon, height: config.icon }}
          className="object-contain"
        />
      );
    }
    
    return (
      <div 
        style={{ width: config.icon, height: config.icon }}
        className="bg-gray-200 rounded flex items-center justify-center"
        title={showTooltips ? `${characteristic.name}: ${characteristic.description}` : characteristic.name}
      >
        <Apple className="h-2/3 w-2/3 text-gray-400" />
      </div>
    );
  };

  if (loading) {
    return null; // Don't show loading state for characteristics
  }

  if (error || characteristics.length === 0) {
    return null; // Don't show anything if no characteristics or error
  }

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {characteristics
        .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
        .map((characteristic) => (
          <div 
            key={characteristic.id}
            className="flex-shrink-0 cursor-help"
          >
            {renderIcon(characteristic)}
          </div>
        ))}
    </div>
  );
}
