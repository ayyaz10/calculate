import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'cboard-theme';
const appThemes = ['original', 'matrix'];

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'original';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return appThemes.includes(storedTheme) ? storedTheme : 'original';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('theme-matrix', theme === 'matrix');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    isMatrixTheme: theme === 'matrix',
    toggleTheme: () => {
      setTheme((currentTheme) =>
        currentTheme === 'matrix' ? 'original' : 'matrix',
      );
    },
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
