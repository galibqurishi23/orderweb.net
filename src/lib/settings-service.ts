'use server';

import pool from './db';
import type { RestaurantSettings } from './types';
import { defaultRestaurantSettings } from '@/lib/defaultRestaurantSettings';

export async function getSettings(): Promise<RestaurantSettings> {
    const [rows] = await pool.query('SELECT settings_json FROM restaurant_settings WHERE id = 1');
    if ((rows as any[]).length > 0 && (rows as any)[0].settings_json) {
        const dbSettingsRaw = (rows as any)[0].settings_json;
        const dbSettings = typeof dbSettingsRaw === 'string' ? JSON.parse(dbSettingsRaw) : dbSettingsRaw;
        return { ...defaultRestaurantSettings, ...dbSettings };
    }
    return defaultRestaurantSettings;
}

export async function saveSettings(newSettings: RestaurantSettings): Promise<void> {
    // 1. Fetch the current settings from the database. These contain the valid image URLs.
    const [rows] = await pool.query('SELECT settings_json FROM restaurant_settings WHERE id = 1');
    const existingSettingsRaw = (rows as any[]).length > 0 && (rows as any)[0].settings_json ? (rows as any)[0].settings_json : {};
    const existingSettings = typeof existingSettingsRaw === 'string' ? JSON.parse(existingSettingsRaw) : existingSettingsRaw;

    // 2. Merge the objects. Overwrite with all updated settings, including logo and coverImage.
    const finalSettings = { ...existingSettings, ...newSettings };
    const settingsJson = JSON.stringify(finalSettings);

    const sql = `
        INSERT INTO restaurant_settings (id, settings_json)
        VALUES (1, ?)
        ON DUPLICATE KEY UPDATE
        settings_json = VALUES(settings_json)
    `;
    await pool.query(sql, [settingsJson]);
}
