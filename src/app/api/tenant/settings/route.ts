import { NextRequest, NextResponse } from 'next/server';
import { getTenantSettings, updateTenantSettings } from '@/lib/tenant-service';
import { getDemoRestaurantSettings, saveDemoRestaurantSettings, DemoRestaurantSettings } from '@/lib/demo-settings';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    console.log('=== GET SETTINGS API ===');
    console.log('Tenant ID from header:', tenantId);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Handle demo restaurant tenant with file-based settings
    if (tenantId === 'restaurant-demo-id') {
      console.log('Loading demo restaurant settings from file');
      const demoSettings = getDemoRestaurantSettings();
      return NextResponse.json({
        success: true,
        data: demoSettings
      });
    }

    console.log('Calling getTenantSettings with:', tenantId);
    const settings = await getTenantSettings(tenantId);
    console.log('Settings result:', settings);
    
    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const settingsData = await request.json();
    
    if (!settingsData) {
      return NextResponse.json(
        { success: false, error: 'Settings data is required' },
        { status: 400 }
      );
    }

    // Handle demo restaurant tenant with file-based settings
    if (tenantId === 'restaurant-demo-id') {
      console.log('💾 Saving demo restaurant settings:', settingsData);
      saveDemoRestaurantSettings(settingsData as DemoRestaurantSettings);
      return NextResponse.json({
        success: true,
        message: 'Demo settings updated successfully'
      });
    }

    await updateTenantSettings(tenantId, settingsData);
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const settingsData = await request.json();
    
    if (!settingsData) {
      return NextResponse.json(
        { success: false, error: 'Settings data is required' },
        { status: 400 }
      );
    }

    // Handle demo restaurant tenant with file-based settings
    if (tenantId === 'restaurant-demo-id') {
      console.log('💾 Saving demo restaurant settings:', settingsData);
      saveDemoRestaurantSettings(settingsData as DemoRestaurantSettings);
      return NextResponse.json({
        success: true,
        message: 'Demo settings updated successfully'
      });
    }

    await updateTenantSettings(tenantId, settingsData);
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
