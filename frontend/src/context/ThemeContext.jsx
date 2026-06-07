import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_VERSION = 'v2';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Reset to light if user has a stale preference from before v2 (when dark was default)
    if (localStorage.getItem('themeVersion') !== THEME_VERSION) {
      localStorage.removeItem('theme');
      localStorage.setItem('themeVersion', THEME_VERSION);
    }
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
