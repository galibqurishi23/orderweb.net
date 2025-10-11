'use server';

import pool from './db';
import type { OrderThrottlingSettings } from './types';

export interface OrderCapacityCheck {
  allowed: boolean;
  currentCount: number;
  maxCapacity: number;
  timeSlot: string;
  error?: string;
}

/**
 * Checks if an order can be placed within the current time slot based on throttling settings
 */
export async function checkOrderCapacity(
  tenantId: string,
  throttlingSettings: OrderThrottlingSettings,
  orderTime: Date = new Date()
): Promise<OrderCapacityCheck> {
  try {
    console.log('🔍 Checking order capacity for tenant:', tenantId);
    console.log('📅 Order time:', orderTime);
    
    // Get current day of the week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[orderTime.getDay()];
    
    console.log('📆 Day of week:', dayKey);
    
    // Get throttling settings for current day
    const daySettings = throttlingSettings[dayKey];
    
    if (!daySettings || !daySettings.enabled) {
      console.log('✅ Throttling disabled for', dayKey);
      return {
        allowed: true,
        currentCount: 0,
        maxCapacity: 0,
        timeSlot: 'N/A'
      };
    }
    
    console.log('⚙️ Throttling settings:', daySettings);
    
    // Calculate current time slot based on interval
    const timeSlot = calculateTimeSlot(orderTime, daySettings.interval);
    console.log('⏰ Current time slot:', timeSlot);
    
    // Count orders in the current time slot
    const currentCount = await countOrdersInTimeSlot(tenantId, timeSlot.start, timeSlot.end);
    console.log('📊 Current orders in slot:', currentCount);
    console.log('🎯 Max capacity:', daySettings.ordersPerInterval);
    
    const allowed = currentCount < daySettings.ordersPerInterval;
    
    return {
      allowed,
      currentCount,
      maxCapacity: daySettings.ordersPerInterval,
      timeSlot: `${timeSlot.start.toLocaleTimeString()} - ${timeSlot.end.toLocaleTimeString()}`,
      error: allowed ? undefined : `Order capacity reached for ${timeSlot.start.toLocaleTimeString()} - ${timeSlot.end.toLocaleTimeString()}. Please try a different time slot.`
    };
    
  } catch (error) {
    console.error('❌ Error checking order capacity:', error);
    return {
      allowed: true, // Allow orders if capacity check fails
      currentCount: 0,
      maxCapacity: 0,
      timeSlot: 'Error',
      error: 'Unable to check order capacity. Order allowed as fallback.'
    };
  }
}

/**
 * Calculates the time slot for a given time and interval
 */
function calculateTimeSlot(orderTime: Date, intervalMinutes: number): { start: Date; end: Date } {
  const start = new Date(orderTime);
  
  // Round down to the nearest interval
  const minutes = start.getMinutes();
  const roundedMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes;
  
  start.setMinutes(roundedMinutes, 0, 0); // Set seconds and milliseconds to 0
  
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + intervalMinutes);
  
  return { start, end };
}

/**
 * Counts orders within a specific time slot
 */
async function countOrdersInTimeSlot(tenantId: string, startTime: Date, endTime: Date): Promise<number> {
  try {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE tenant_id = ? 
       AND createdAt >= ? 
       AND createdAt < ?
       AND status != 'cancelled'`,
      [tenantId, startTime, endTime]
    );
    
    const count = (result as any[])[0].count;
    console.log('📈 Orders in time slot:', {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      count
    });
    
    return count;
  } catch (error) {
    console.error('❌ Error counting orders in time slot:', error);
    return 0;
  }
}

/**
 * Gets available time slots for advance orders based on capacity
 */
export async function getAvailableTimeSlots(
  tenantId: string,
  throttlingSettings: OrderThrottlingSettings,
  targetDate: Date
): Promise<{ time: string; available: boolean; currentCount: number; maxCapacity: number }[]> {
  try {
    console.log('🕐 Getting available time slots for:', targetDate);
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[targetDate.getDay()];
    const daySettings = throttlingSettings[dayKey];
    
    if (!daySettings || !daySettings.enabled) {
      console.log('✅ No throttling for', dayKey, '- all slots available');
      return [];
    }
    
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 21; // 9 PM
    
    // Generate time slots for the day
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += daySettings.interval) {
        const slotTime = new Date(targetDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Skip slots that are in the past
        if (slotTime <= new Date()) {
          continue;
        }
        
        const timeSlot = calculateTimeSlot(slotTime, daySettings.interval);
        const currentCount = await countOrdersInTimeSlot(tenantId, timeSlot.start, timeSlot.end);
        
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          available: currentCount < daySettings.ordersPerInterval,
          currentCount,
          maxCapacity: daySettings.ordersPerInterval
        });
      }
    }
    
    console.log('📅 Generated', slots.length, 'time slots');
    return slots;
    
  } catch (error) {
    console.error('❌ Error getting available time slots:', error);
    return [];
  }
}

/**
 * Gets capacity statistics for the admin dashboard
 */
export async function getCapacityStatistics(
  tenantId: string,
  throttlingSettings: OrderThrottlingSettings
): Promise<{
  todayStats: { currentCount: number; maxCapacity: number; timeSlot: string };
  weekStats: { [day: string]: { totalOrders: number; maxCapacity: number } };
}> {
  try {
    const now = new Date();
    
    // Get today's current time slot statistics
    const todayCapacity = await checkOrderCapacity(tenantId, throttlingSettings, now);
    
    // Get weekly statistics
    const weekStats: { [day: string]: { totalOrders: number; maxCapacity: number } } = {};
    
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
      const daySettings = throttlingSettings[day];
      const maxCapacity = daySettings.enabled ? daySettings.ordersPerInterval : 0;
      
      // Count orders for this day this week
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - now.getDay() + ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day));
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM orders 
         WHERE tenant_id = ? 
         AND createdAt >= ? 
         AND createdAt < ?
         AND status != 'cancelled'`,
        [tenantId, dayStart, dayEnd]
      );
      
      const totalOrders = (result as any[])[0].count;
      
      weekStats[day] = {
        totalOrders,
        maxCapacity
      };
    }
    
    return {
      todayStats: {
        currentCount: todayCapacity.currentCount,
        maxCapacity: todayCapacity.maxCapacity,
        timeSlot: todayCapacity.timeSlot
      },
      weekStats
    };
    
  } catch (error) {
    console.error('❌ Error getting capacity statistics:', error);
    return {
      todayStats: { currentCount: 0, maxCapacity: 0, timeSlot: 'Error' },
      weekStats: {}
    };
  }
}
