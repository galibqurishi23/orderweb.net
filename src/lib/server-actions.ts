'use server';

// This file contains server-side actions that can be called from client components
// It provides a bridge between client components and server-side database operations

import { getTenantSettings } from './tenant-service';
import { RestaurantSettings } from './types';

/**
 * Get tenant settings (safe for client components to import and call)
 */
export async function getTenantSettingsAction(tenantId: string): Promise<RestaurantSettings | null> {
  try {
    const settings = await getTenantSettings(tenantId);
    return settings;
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return null;
  }
}
