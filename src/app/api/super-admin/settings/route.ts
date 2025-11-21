import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Get application settings from database
    const [rows] = await db.execute(`
      SELECT * FROM app_settings WHERE id = 1
    `);

    const settings = (rows as any[])[0];

    return NextResponse.json({
      success: true,
      data: settings || {
        appName: 'OrderWeb',
        appLogo: '/icons/login_logo.svg',
        appDescription: 'Modern restaurant ordering and management system',
        defaultCurrency: 'GBP',
        supportEmail: 'support@orderweb.com',
        supportPhone: '+44 20 1234 5678',
        companyName: 'OrderWeb Ltd',
        companyAddress: 'London, United Kingdom',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        accentColor: '#10b981',
        maintenanceMode: false,
        registrationEnabled: true,
        emailNotificationsEnabled: true,
        autoBackupEnabled: true,
        debugMode: false,
        maxRestaurants: 100,
        trialPeriodDays: 14,
      }
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    // Create table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY DEFAULT 1,
        app_name VARCHAR(255),
        app_logo VARCHAR(500),
        app_description TEXT,
        default_currency VARCHAR(10),
        support_email VARCHAR(255),
        support_phone VARCHAR(50),
        company_name VARCHAR(255),
        company_address TEXT,
        primary_color VARCHAR(20),
        secondary_color VARCHAR(20),
        accent_color VARCHAR(20),
        maintenance_mode BOOLEAN DEFAULT FALSE,
        registration_enabled BOOLEAN DEFAULT TRUE,
        email_notifications_enabled BOOLEAN DEFAULT TRUE,
        auto_backup_enabled BOOLEAN DEFAULT TRUE,
        debug_mode BOOLEAN DEFAULT FALSE,
        max_restaurants INT DEFAULT 100,
        trial_period_days INT DEFAULT 14,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert or update settings
    await db.execute(`
      INSERT INTO app_settings (
        id, app_name, app_logo, app_description, default_currency,
        support_email, support_phone, company_name, company_address,
        primary_color, secondary_color, accent_color, maintenance_mode,
        registration_enabled, email_notifications_enabled, auto_backup_enabled,
        debug_mode, max_restaurants, trial_period_days
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        app_name = VALUES(app_name),
        app_logo = VALUES(app_logo),
        app_description = VALUES(app_description),
        default_currency = VALUES(default_currency),
        support_email = VALUES(support_email),
        support_phone = VALUES(support_phone),
        company_name = VALUES(company_name),
        company_address = VALUES(company_address),
        primary_color = VALUES(primary_color),
        secondary_color = VALUES(secondary_color),
        accent_color = VALUES(accent_color),
        maintenance_mode = VALUES(maintenance_mode),
        registration_enabled = VALUES(registration_enabled),
        email_notifications_enabled = VALUES(email_notifications_enabled),
        auto_backup_enabled = VALUES(auto_backup_enabled),
        debug_mode = VALUES(debug_mode),
        max_restaurants = VALUES(max_restaurants),
        trial_period_days = VALUES(trial_period_days)
    `, [
      settings.appName,
      settings.appLogo,
      settings.appDescription,
      settings.defaultCurrency,
      settings.supportEmail,
      settings.supportPhone,
      settings.companyName,
      settings.companyAddress,
      settings.primaryColor,
      settings.secondaryColor,
      settings.accentColor,
      settings.maintenanceMode,
      settings.registrationEnabled,
      settings.emailNotificationsEnabled,
      settings.autoBackupEnabled,
      settings.debugMode,
      settings.maxRestaurants,
      settings.trialPeriodDays
    ]);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save settings'
    }, { status: 500 });
  }
}
