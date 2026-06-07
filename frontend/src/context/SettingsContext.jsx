import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SettingsContext = createContext(null);

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex, amount = 20) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  return `#${[r, g, b].map((c) => clamp(c - amount).toString(16).padStart(2, '0')).join('')}`;
}

function applyTheme(color) {
  const root = document.documentElement;
  root.style.setProperty('--primary', color);
  root.style.setProperty('--primary-hover', darken(color, 25));
  const { r, g, b } = hexToRgb(color);
  root.style.setProperty('--primary-ring', `rgba(${r},${g},${b},0.35)`);
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    company_name: 'CleanRun IMMS',
    tagline: 'Instrument Management System',
    logo_url: null,
    primary_color: '#2563eb',
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/company/');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Apply CSS variable + tab title whenever settings change
  useEffect(() => {
    if (settings.primary_color) applyTheme(settings.primary_color);
    document.title = settings.company_name
      ? `${settings.company_name} — IMMS`
      : 'CleanRun IMMS';
  }, [settings.primary_color, settings.company_name]);

  const previewColor = useCallback((color) => {
    if (color) applyTheme(color);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, fetchSettings, previewColor }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
