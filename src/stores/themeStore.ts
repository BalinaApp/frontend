import { create } from 'zustand';
import { api } from '@/services/api';

/**
 * Accent gradient pair. `null` keeps the default neutral accent
 * (no `theme-*` class added to the body).
 */
export type AccentTheme =
  | null
  | 'lime-emerald'
  | 'emerald-sky'
  | 'sky-indigo'
  | 'indigo-purple'
  | 'purple-pink'
  | 'pink-orange'
  | 'amber-red';

interface ThemeState {
  accent: AccentTheme;
  /** Serbest tema rengi/gradyanı (balinaOS tema editörü). */
  themeColor: string | null;
  /** Hydrate from the user record returned by /auth/me. */
  hydrate: (next: { themeAccent?: string | null; themeColor?: string | null }) => void;
  setAccent: (accent: AccentTheme) => Promise<void>;
  /** Tema rengini sayfaya uygula + backend'e kaydet. */
  setThemeColor: (color: string | null) => Promise<void>;
}

/** Seçilen tema rengini sayfa zeminine uygula (--balina-base-heavy-loud). */
function applyThemeColor(color: string | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (color) root.style.setProperty('--balina-base-heavy-loud', color);
  else root.style.removeProperty('--balina-base-heavy-loud');
}

const VALID_ACCENTS: ReadonlyArray<NonNullable<AccentTheme>> = [
  'lime-emerald',
  'emerald-sky',
  'sky-indigo',
  'indigo-purple',
  'purple-pink',
  'pink-orange',
  'amber-red',
];

function normalizeAccent(value: string | null | undefined): AccentTheme {
  if (!value) return null;
  return (VALID_ACCENTS as readonly string[]).includes(value)
    ? (value as AccentTheme)
    : null;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accent: null,
  themeColor: null,
  hydrate: (next) => {
    const themeColor = next.themeColor ?? null;
    set({ accent: normalizeAccent(next.themeAccent), themeColor });
    applyThemeColor(themeColor);
  },
  setAccent: async (accent) => {
    const prev = get().accent;
    set({ accent });
    try {
      await api.put('/auth/theme', { themeAccent: accent });
    } catch {
      set({ accent: prev });
    }
  },
  setThemeColor: async (color) => {
    const prev = get().themeColor;
    set({ themeColor: color });
    applyThemeColor(color);
    try {
      await api.put('/auth/theme', { themeColor: color });
    } catch {
      set({ themeColor: prev });
      applyThemeColor(prev);
    }
  },
}));
