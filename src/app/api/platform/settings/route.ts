import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // Fetch from the existing platform_settings table with JSON structure
    const [settingsRows] = await db.execute(
      `SELECT settings_json FROM platform_settings WHERE id = 1`
    ) as [RowDataPacket[], any];

    let settings;
    
    if (settingsRows.length > 0 && settingsRows[0].settings_json) {
      try {
        const jsonSettings = JSON.parse(settingsRows[0].settings_json);
        
        // Map existing JSON structure to expected frontend format
        settings = {
          appName: jsonSettings.platformName || jsonSettings.appName || 'DineDesk SaaS',
          companyName: jsonSettings.companyName || 'DineDesk Ltd',
          companyAddress: jsonSettings.companyAddress || 'London, United Kingdom',
          supportEmail: jsonSettings.supportEmail || 'support@dinedesk.com',
          supportPhone: jsonSettings.supportPhone || '+44 (0) 20 1234 5678',
          defaultCurrency: jsonSettings.defaultCurrency || 'GBP',
          appLogo: jsonSettings.appLogo || '/icons/login_logo.svg',
          primaryColor: jsonSettings.primaryColor || jsonSettings.defaultTheme?.primary || '#6366f1',
          secondaryColor: jsonSettings.secondaryColor || '#8b5cf6',
          accentColor: jsonSettings.accentColor || jsonSettings.defaultTheme?.accent || '#3b82f6'
        };
      } catch (parseError) {
        console.error('Error parsing settings JSON:', parseError);
        // Fall back to default settings
        settings = getDefaultSettings();
      }
    } else {
      settings = getDefaultSettings();
    }

    return NextResponse.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('Error fetching platform settings:', error);
    
    // Return default values if database fails
    return NextResponse.json({
      success: true,
      settings: getDefaultSettings()
    });
  }
}

function getDefaultSettings() {
  return {
    appName: 'DineDesk SaaS',
    companyName: 'DineDesk Ltd',
    companyAddress: 'London, United Kingdom',
    supportEmail: 'support@dinedesk.com',
    supportPhone: '+44 (0) 20 1234 5678',
    defaultCurrency: 'GBP',
    appLogo: '/icons/login_logo.svg',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#3b82f6'
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/platform/settings - Request received');
    
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Extract settings from request body
    const {
      appName,
      companyName,
      companyAddress,
      supportEmail,
      supportPhone,
      defaultCurrency,
      appLogo,
      primaryColor,
      secondaryColor,
      accentColor
    } = body;

    // Test database connection first
    try {
      console.log('Testing database connection...');
      await db.execute('SELECT 1 as test');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection failed',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }

    // First, get the existing settings
    let existingSettings: any = {};
    try {
      const [existingRows] = await db.execute(
        `SELECT settings_json FROM platform_settings WHERE id = 1`
      ) as [RowDataPacket[], any];
      
      if (existingRows.length > 0 && existingRows[0].settings_json) {
        existingSettings = JSON.parse(existingRows[0].settings_json);
        console.log('Existing settings loaded:', existingSettings);
      }
    } catch (error) {
      console.log('No existing settings found, starting with defaults');
      existingSettings = {};
    }

    // Merge with new settings, preserving existing structure
    const updatedSettings = {
      ...existingSettings,
      // Update the business information fields
      platformName: appName || existingSettings.platformName || 'DineDesk SaaS',
      appName: appName || existingSettings.appName || appName,
      companyName: companyName || existingSettings.companyName,
      companyAddress: companyAddress || existingSettings.companyAddress,
      supportEmail: supportEmail || existingSettings.supportEmail,
      supportPhone: supportPhone || existingSettings.supportPhone,
      defaultCurrency: defaultCurrency || existingSettings.defaultCurrency || 'GBP',
      appLogo: appLogo || existingSettings.appLogo || '/icons/login_logo.svg',
      primaryColor: primaryColor || existingSettings.primaryColor,
      secondaryColor: secondaryColor || existingSettings.secondaryColor,
      accentColor: accentColor || existingSettings.accentColor,
      // Preserve existing theme structure if it exists
      defaultTheme: {
        ...existingSettings.defaultTheme,
        primary: primaryColor || existingSettings.defaultTheme?.primary || primaryColor,
        accent: accentColor || existingSettings.defaultTheme?.accent || accentColor
      }
    };

    console.log('Updated settings:', JSON.stringify(updatedSettings, null, 2));

    // Update or insert the settings
    await db.execute(`
      INSERT INTO platform_settings (id, settings_json, updated_at) 
      VALUES (1, ?, NOW())
      ON DUPLICATE KEY UPDATE
        settings_json = VALUES(settings_json),
        updated_at = NOW()
    `, [JSON.stringify(updatedSettings)]);

    console.log('Platform settings updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Platform settings updated successfully',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('Error updating platform settings:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update platform settings',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No additional details'
      },
      { status: 500 }
    );
  }
}
