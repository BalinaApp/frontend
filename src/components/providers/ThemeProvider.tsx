'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const ALL_THEME_CLASSES = [
  'light',
  'light-t',
  'theme-lime-emerald',
  'theme-emerald-sky',
  'theme-sky-indigo',
  'theme-indigo-purple',
  'theme-purple-pink',
  'theme-pink-orange',
  'theme-amber-red',
];

/**
 * Drives <body> theme classes (`light`, `light-t`, `theme-{accent}` …)
 * and the matching `data-theme` attribute that HeroUI's tokens hook into.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const accent = useThemeStore((s) => s.accent);
  const hydrate = useThemeStore((s) => s.hydrate);
  const userThemeAccent = useAuthStore((s) => s.user?.themeAccent);
  const userThemeColor = useAuthStore((s) => s.user?.themeColor);

  // Re-hydrate the local store whenever the authenticated user record
  // updates with theme prefs from the server.
  useEffect(() => {
    if (userThemeAccent === undefined && userThemeColor === undefined) return;
    hydrate({ themeAccent: userThemeAccent, themeColor: userThemeColor });
  }, [userThemeAccent, userThemeColor, hydrate]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    // Strip every theme-* class we own so we don't leave stale state behind.
    for (const cls of ALL_THEME_CLASSES) body.classList.remove(cls);

    body.classList.add('light', 'light-t');
    if (accent) body.classList.add(`theme-${accent}`);

    html.dataset.theme = 'light';
  }, [accent]);

  return <>{children}</>;
}
