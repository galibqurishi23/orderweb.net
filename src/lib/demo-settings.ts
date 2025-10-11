// Simple file-based storage for demo purposes
import fs from 'fs';
import path from 'path';

const DEMO_SETTINGS_PATH = path.join(process.cwd(), 'demo-restaurant-settings.json');

export interface DemoRestaurantSettings {
  paymentSettings: {
    cash: { enabled: boolean };
    stripe: { enabled: boolean; apiKey: string; apiSecret: string };
    globalPayments: { enabled: boolean; merchantId: string; apiSecret: string; appId: string; appKey: string; environment: string };
    worldpay: { enabled: boolean; username: string; password: string; merchantId: string; environment: string };
  };
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    website: string;
  };
  [key: string]: any;
}

const defaultDemoSettings: DemoRestaurantSettings = {
  paymentSettings: {
    cash: { enabled: true },
    stripe: { enabled: false, apiKey: '', apiSecret: '' },
    globalPayments: { enabled: false, merchantId: 'demo-merchant', apiSecret: 'demo-secret', appId: 'demo-app-id', appKey: 'demo-app-key', environment: 'sandbox' },
    worldpay: { enabled: false, username: '', password: '', merchantId: '', environment: 'sandbox' }
  },
  socialMedia: {
    facebook: 'https://facebook.com/demorestaurant',
    instagram: 'https://instagram.com/demorestaurant',
    twitter: 'https://twitter.com/demorestaurant',
    website: 'https://demorestaurant.com'
  }
};

export function getDemoRestaurantSettings(): DemoRestaurantSettings {
  try {
    if (fs.existsSync(DEMO_SETTINGS_PATH)) {
      const data = fs.readFileSync(DEMO_SETTINGS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading demo settings:', error);
  }
  
  return defaultDemoSettings;
}

export function saveDemoRestaurantSettings(settings: DemoRestaurantSettings): void {
  try {
    fs.writeFileSync(DEMO_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log('✅ Demo restaurant settings saved to file');
  } catch (error) {
    console.error('❌ Error saving demo settings:', error);
    throw error;
  }
}
