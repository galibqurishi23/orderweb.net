import pool from './db';
import type { DeliveryZone } from './types';
import { getTenantSettings } from './tenant-service';

function parseJsonField<T>(field: any): T {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (e) {
            return [] as T; 
        }
    }
    return field ?? ([] as T);
}

export async function getTenantDeliveryZones(tenantId: string): Promise<DeliveryZone[]> {
    try {
        const [rows] = await pool.query('SELECT * FROM delivery_zones WHERE tenant_id = ?', [tenantId]);
        
        const zones = (rows as any[]).map(zone => ({
            ...zone,
            postcodes: parseJsonField(zone.postcodes),
            deliveryFee: parseFloat(zone.deliveryFee),
            minOrder: parseFloat(zone.minOrder),
            deliveryTime: parseInt(zone.deliveryTime, 10),
            collectionTime: parseInt(zone.collectionTime, 10),
        }));
        
        return zones;
        
    } catch (error) {
        console.error('Error fetching delivery zones:', error);
        throw error;
    }
}

export async function validateDeliveryPostcode(tenantId: string, postcode: string): Promise<{ valid: boolean; zone?: DeliveryZone; error?: string }> {
    console.log('🔍 validateDeliveryPostcode called:', { tenantId, postcode });
    
    const zones = await getTenantDeliveryZones(tenantId);
    console.log('📦 Zones fetched:', zones.length, 'zones');
    
    if (zones.length === 0) {
        // If no zones are configured, assume delivery is available everywhere
        console.log('ℹ️ No zones configured, allowing delivery');
        return { valid: true };
    }
    
    // Normalize postcode (remove spaces, convert to uppercase)
    const normalizedPostcode = postcode.replace(/\s/g, '').toUpperCase();
    console.log('📝 Normalized postcode:', normalizedPostcode);
    
    // Extract outward code (e.g., "SE4" from "SE4 2JP")
    const postcodeOutward = normalizedPostcode.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/)?.[1] || normalizedPostcode;
    console.log('📍 Extracted outward code:', postcodeOutward);
    
    for (const zone of zones) {
        console.log('🔍 Checking zone:', zone.name, 'with postcodes:', zone.postcodes);
        if (zone.postcodes && zone.postcodes.length > 0) {
            // Check if postcode matches any in this zone
            const matches = zone.postcodes.some((zonePostcode: string) => {
                const normalizedZonePostcode = zonePostcode.replace(/\s/g, '').toUpperCase();
                const zoneOutward = normalizedZonePostcode.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/)?.[1] || normalizedZonePostcode;
                
                console.log('  🔸 Comparing:', {
                    customer: normalizedPostcode,
                    customerOutward: postcodeOutward,
                    zone: normalizedZonePostcode,
                    zoneOutward: zoneOutward
                });
                
                // Exact match (full postcode)
                if (normalizedZonePostcode === normalizedPostcode) {
                    console.log('  ✅ EXACT MATCH!');
                    return true;
                }
                
                // Outward code match (e.g., "SE4" matches "SE4 2JP", "SE4 2PJ", etc.)
                if (zoneOutward === postcodeOutward) {
                    console.log('  ✅ OUTWARD CODE MATCH!');
                    return true;
                }
                
                // Prefix match (e.g., "SW1" matches "SW1A 1AA")
                if (normalizedPostcode.startsWith(normalizedZonePostcode)) {
                    console.log('  ✅ PREFIX MATCH (customer starts with zone)!');
                    return true;
                }
                
                // Zone is a prefix of customer postcode (e.g., zone "SE4" matches customer "SE42JP")
                if (normalizedPostcode.startsWith(zoneOutward)) {
                    console.log('  ✅ ZONE OUTWARD PREFIX MATCH!');
                    return true;
                }
                
                console.log('  ❌ No match');
                return false;
            });
            
            if (matches) {
                console.log('✅ Zone matched:', zone.name);
                return { valid: true, zone };
            }
        }
    }
    
    return { valid: false, error: 'Delivery not available to this postcode' };
}

export async function calculateDeliveryFee(tenantId: string, postcode: string, orderValue: number): Promise<{ fee: number; zone?: DeliveryZone; error?: string }> {
    console.log('🔍 calculateDeliveryFee called:', { tenantId, postcode, orderValue });
    
    try {
        const validation = await validateDeliveryPostcode(tenantId, postcode);
        console.log('✅ Validation result:', validation);
        
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.error);
            return { fee: 0, error: validation.error };
        }
        
        if (!validation.zone) {
            // No specific zone, use default delivery fee
            console.log('ℹ️ No specific zone found, using default fee');
            return { fee: 2.50 }; // Default delivery fee
        }
        
        // Check minimum order value
        if (orderValue < validation.zone.minOrder) {
            console.log('❌ Order value too low:', orderValue, '<', validation.zone.minOrder);
            return { 
                fee: 0, 
                error: `Minimum order value for this area is £${validation.zone.minOrder.toFixed(2)}` 
            };
        }
        
        console.log('✅ Delivery fee calculated:', validation.zone.deliveryFee);
        return { 
            fee: validation.zone.deliveryFee, 
            zone: validation.zone 
        };
    } catch (error) {
        console.error('💥 Error in calculateDeliveryFee:', error);
        throw error;
    }
}

export async function getDeliveryTime(tenantId: string, postcode: string): Promise<number> {
    const validation = await validateDeliveryPostcode(tenantId, postcode);
    
    if (validation.valid && validation.zone) {
        return validation.zone.deliveryTime;
    }
    
    // Fallback to default from settings
    try {
        const settings = await getTenantSettings(tenantId);
        return settings?.deliveryTimeSettings?.deliveryTimeMinutes || 45;
    } catch {
        return 45; // Ultimate fallback
    }
}

// API-compatible function names
export async function saveTenantDeliveryZone(tenantId: string, zone: DeliveryZone): Promise<DeliveryZone> {
    try {
        console.log('=== SAVING ZONE ===');
        console.log('Tenant ID:', tenantId);
        console.log('Zone data:', zone);
        
        const postcodes = JSON.stringify(zone.postcodes || []);
        
        const zoneData = {
            id: zone.id,
            tenant_id: tenantId,
            name: zone.name,
            type: zone.type || 'postcode', // Default to 'postcode' if not provided
            postcodes: postcodes,
            deliveryFee: zone.deliveryFee,
            minOrder: zone.minOrder,
            deliveryTime: zone.deliveryTime,
            collectionTime: zone.collectionTime || null // Allow null for collectionTime
        };
        
        // Check if zone exists
        const [existing] = await pool.query('SELECT id FROM delivery_zones WHERE id = ? AND tenant_id = ?', [zone.id, tenantId]);
        
        if ((existing as any[]).length > 0) {
            // Update existing zone
            console.log('Updating existing zone');
            await pool.query(`
                UPDATE delivery_zones 
                SET name = ?, type = ?, postcodes = ?, deliveryFee = ?, minOrder = ?, deliveryTime = ?, collectionTime = ?, updated_at = NOW()
                WHERE id = ? AND tenant_id = ?
            `, [
                zoneData.name, zoneData.type, zoneData.postcodes, zoneData.deliveryFee,
                zoneData.minOrder, zoneData.deliveryTime, zoneData.collectionTime,
                zoneData.id, tenantId
            ]);
        } else {
            // Insert new zone
            console.log('Creating new zone');
            await pool.query(`
                INSERT INTO delivery_zones 
                (id, tenant_id, name, type, postcodes, deliveryFee, minOrder, deliveryTime, collectionTime) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                zoneData.id, zoneData.tenant_id, zoneData.name, zoneData.type, zoneData.postcodes,
                zoneData.deliveryFee, zoneData.minOrder, zoneData.deliveryTime, zoneData.collectionTime
            ]);
        }
        
        console.log('Zone saved successfully');
        return zone;
        
    } catch (error) {
        console.error('Error saving delivery zone:', error);
        throw error;
    }
}

export async function deleteTenantDeliveryZone(tenantId: string, zoneId: string): Promise<void> {
    try {
        await pool.query('DELETE FROM delivery_zones WHERE id = ? AND tenant_id = ?', [zoneId, tenantId]);
    } catch (error) {
        console.error('Error deleting delivery zone:', error);
        throw error;
    }
}

// Legacy function names for backward compatibility
export const saveDeliveryZone = saveTenantDeliveryZone;
export const deleteDeliveryZone = deleteTenantDeliveryZone;
