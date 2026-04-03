'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api';
import { getThemeImageSrc } from '@/lib/theme-images';
import { DEFAULT_APP_NAME } from '@/lib/branding';

export type ThemeSettings = {
  appName?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  logoLoginUrl?: string | null;
  /** Cachet / sceau (ex. facture proforma PDF) */
  stampUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  successColor?: string | null;
  dangerColor?: string | null;
  backgroundColor?: string | null;
  sidebarColor?: string | null;
};

const defaultColors = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#16a34a',
  danger: '#dc2626',
  background: '#f8fafc',
  sidebar: '#ffffff',
};

function applyTheme(settings: ThemeSettings) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root) return;

  const appTitle = settings.appName?.trim() || DEFAULT_APP_NAME;
  if (typeof document !== 'undefined') {
    document.title = appTitle;
  }

  root.style.setProperty('--color-primary', settings.primaryColor ?? defaultColors.primary);
  root.style.setProperty('--color-secondary', settings.secondaryColor ?? defaultColors.secondary);
  root.style.setProperty('--color-success', settings.successColor ?? defaultColors.success);
  root.style.setProperty('--color-danger', settings.dangerColor ?? defaultColors.danger);
  root.style.setProperty('--background', settings.backgroundColor ?? defaultColors.background);
  root.style.setProperty('--color-sidebar', settings.sidebarColor ?? defaultColors.sidebar);

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  const faviconUrl = settings.faviconUrl ?? '/favicon.ico';
  const resolved = getThemeImageSrc(faviconUrl) || '/favicon.ico';
  const sep = resolved.includes('?') ? '&' : '?';
  const cacheKey = settings.faviconUrl?.trim() ? settings.faviconUrl : 'default';
  link.href = `${resolved}${sep}v=${encodeURIComponent(cacheKey)}`;
}

type ThemeContextValue = {
  settings: ThemeSettings | null;
  refresh: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);

  const refresh = useCallback(async () => {
    try {
      const base = getApiUrl();
      const url = `${base}/appearance/settings`;
      const res = await fetch(url, { cache: 'no-store', credentials: 'omit' });
      if (res.ok) {
        const data: ThemeSettings = await res.json();
        setSettings(data);
        applyTheme(data);
      } else {
        setSettings(null);
        applyTheme({});
      }
    } catch {
      setSettings(null);
      applyTheme({});
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ThemeContext.Provider value={{ settings, refresh }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? { settings: null, refresh: async () => {} };
}
