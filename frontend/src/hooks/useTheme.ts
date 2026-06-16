import { useEffect, useState } from 'react';

/** Maneja el tema claro/oscuro persistido en localStorage. */
export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('comercial_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('comercial_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
