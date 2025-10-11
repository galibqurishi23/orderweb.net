'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAdmin } from './AdminContext';

interface ThemeSettings {
  primary: string;
  primaryForeground: string;
  background: string;
  accent: string;
}

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (newTheme: Partial<ThemeSettings>) => void;
  applyTheme: (theme: ThemeSettings) => void;
}

const defaultTheme: ThemeSettings = {
  primary: '224 82% 57%',
  primaryForeground: '210 40% 98%',
  background: '210 40% 98%',
  accent: '210 40% 94%',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const { tenantData } = useAdmin();

  // Apply theme to CSS variables
  const applyTheme = (themeToApply: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', themeToApply.primary);
    root.style.setProperty('--primary-foreground', themeToApply.primaryForeground);
    root.style.setProperty('--background', themeToApply.background);
    root.style.setProperty('--accent', themeToApply.accent);
    setTheme(themeToApply);
  };

  // Update theme state and apply to CSS
  const updateTheme = (newTheme: Partial<ThemeSettings>) => {
    const updatedTheme = { ...theme, ...newTheme };
    applyTheme(updatedTheme);
  };

  // Load theme from tenant settings when available
  useEffect(() => {
    if (tenantData?.settings?.theme) {
      applyTheme(tenantData.settings.theme);
    }
  }, [tenantData?.settings?.theme]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
