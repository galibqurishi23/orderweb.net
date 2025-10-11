'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface ClientThemeApplierProps {
  initialTheme?: {
    primary: string;
    primaryForeground: string;
    background: string;
    accent: string;
  };
}

export function ClientThemeApplier({ initialTheme }: ClientThemeApplierProps) {
  const { applyTheme } = useTheme();

  useEffect(() => {
    if (initialTheme) {
      applyTheme(initialTheme);
    }
  }, [initialTheme, applyTheme]);

  return null;
}
