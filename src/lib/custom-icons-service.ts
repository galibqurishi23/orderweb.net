'use client';

import React, { ComponentType, SVGProps } from 'react';
import type { Characteristic } from '@/lib/types';

// Base path for custom icons
const CUSTOM_ICONS_PATH = '/icons/dietary';

// Interface for custom icon data
export interface CustomIconData {
  id: string;
  label: string;
  category: 'dietary' | 'dietary-restriction';
  svgPath?: string;
  isCustom: boolean;
}

// In-memory storage for custom icons (in production, this would be in a database)
let customIconsStorage: Map<string, CustomIconData> = new Map();

/**
 * Saves a custom icon to storage
 */
export function saveCustomIcon(id: string, label: string, category: 'dietary' | 'dietary-restriction', svgContent?: string): void {
  const iconData: CustomIconData = {
    id,
    label,
    category,
    svgPath: svgContent ? `${CUSTOM_ICONS_PATH}/${id}.svg` : undefined,
    isCustom: !!svgContent
  };
  
  customIconsStorage.set(id, iconData);
  
  // In production, save SVG file to public/icons/dietary/
  if (svgContent) {
    // This would be handled by a server endpoint
    console.log(`Would save SVG content for ${id} to ${iconData.svgPath}`);
  }
}

/**
 * Gets a custom icon from storage
 */
export function getCustomIcon(id: string): CustomIconData | undefined {
  return customIconsStorage.get(id);
}

/**
 * Gets all custom icons
 */
export function getAllCustomIcons(): CustomIconData[] {
  return Array.from(customIconsStorage.values());
}

/**
 * Deletes a custom icon
 */
export function deleteCustomIcon(id: string): boolean {
  const icon = customIconsStorage.get(id);
  if (icon && icon.isCustom) {
    // Reset to default (keep the label/category but remove custom SVG)
    customIconsStorage.set(id, {
      ...icon,
      svgPath: undefined,
      isCustom: false
    });
    return true;
  }
  return false;
}

/**
 * Resets an icon to its default state
 */
export function resetIconToDefault(id: string): void {
  customIconsStorage.delete(id);
}

/**
 * Creates a dynamic SVG component from custom SVG content or file path
 */
export function createCustomSVGComponent(svgPath: string): ComponentType<SVGProps<SVGSVGElement>> {
  return function CustomSVGIcon(props: SVGProps<SVGSVGElement>) {
    // In a real implementation, this would load the SVG from the file system
    // For now, we'll return a placeholder that shows the path
    return React.createElement('svg', {
      ...props,
      className: `w-6 h-6 ${props.className || ''}`,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg'
    }, [
      React.createElement('rect', {
        key: 'bg',
        x: '2',
        y: '2',
        width: '20',
        height: '20',
        rx: '2',
        fill: '#f3f4f6',
        stroke: '#d1d5db'
      }),
      React.createElement('text', {
        key: 'text',
        x: '12',
        y: '14',
        textAnchor: 'middle',
        fontSize: '8',
        fill: '#6b7280'
      }, 'SVG')
    ]);
  };
}

/**
 * Gets the appropriate icon component for a characteristic ID
 * Returns custom icon if available, otherwise falls back to default
 */
export function getIconComponent(id: Characteristic, defaultIcon: ComponentType<SVGProps<SVGSVGElement>>): ComponentType<SVGProps<SVGSVGElement>> {
  const customIcon = getCustomIcon(id);
  
  if (customIcon && customIcon.isCustom && customIcon.svgPath) {
    return createCustomSVGComponent(customIcon.svgPath);
  }
  
  return defaultIcon;
}

/**
 * Checks if an icon has been customized
 */
export function hasCustomIcon(id: string): boolean {
  const icon = getCustomIcon(id);
  return !!(icon && icon.isCustom);
}

/**
 * Initialize with some sample custom icons for demonstration
 */
export function initializeSampleCustomIcons(): void {
  // This would typically load from a database or configuration file
  // For demo purposes, we'll mark some icons as "customizable"
  const sampleIcons = [
    { id: 'vegetarian', label: 'Vegetarian', category: 'dietary' as const },
    { id: 'vegan', label: 'Vegan', category: 'dietary' as const },
    { id: 'spicy-1', label: 'Spicy', category: 'dietary' as const },
  ];
  
  sampleIcons.forEach(icon => {
    if (!customIconsStorage.has(icon.id)) {
      customIconsStorage.set(icon.id, {
        ...icon,
        isCustom: false
      });
    }
  });
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeSampleCustomIcons();
}
