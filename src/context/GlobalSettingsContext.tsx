'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Global Settings Interface
export interface GlobalSettings {
  appName: string;
  appLogo: string;
  appDescription: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultCurrency: string;
  supportEmail: string;
  supportPhone: string;
  companyName: string;
  companyAddress: string;
}

// Default Settings
const defaultSettings: GlobalSettings = {
  appName: 'OrderWeb',
  appLogo: '/icons/login_logo.svg',
  appDescription: 'Modern restaurant ordering and management system',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#10b981',
  defaultCurrency: 'GBP',
  supportEmail: 'support@orderweb.com',
  supportPhone: '+44 20 1234 5678',
  companyName: 'OrderWeb Ltd',
  companyAddress: 'London, United Kingdom',
};

// Context Interface
interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

// Create Context
const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

// Provider Component
export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings from API
  const refreshSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/platform/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch global settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings (local state only - API calls should be handled separately)
  const updateSettings = (newSettings: Partial<GlobalSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  // Load settings on mount
  useEffect(() => {
    refreshSettings();
  }, []);

  const contextValue: GlobalSettingsContextType = {
    settings,
    updateSettings,
    refreshSettings,
    isLoading
  };

  return (
    <GlobalSettingsContext.Provider value={contextValue}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

// Hook to use Global Settings
export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (!context) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
}

// Hook to get just the logo (for performance)
export function useAppLogo() {
  const { settings } = useGlobalSettings();
  return settings.appLogo;
}
