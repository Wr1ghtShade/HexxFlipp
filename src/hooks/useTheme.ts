import { useEffect, useState } from 'react';

export type Theme = 'cyberpunk' | 'dracula' | 'light';

const STORAGE_KEY = 'hexflipp-theme';

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dracula' || saved === 'light') return saved;
    } catch {
      // localStorage indisponible (mode privé strict)
    }
    return 'cyberpunk';
  });

  useEffect(() => {
    if (theme === 'cyberpunk') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignorer si quota dépassé ou mode privé
    }
  }, [theme]);

  return [theme, setTheme];
}
