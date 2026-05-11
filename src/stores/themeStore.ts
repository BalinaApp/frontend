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
  /** Hydrate from the user record returned by /auth/me. */
  hydrate: (next: { themeAccent?: string | null }) => void;
  setAccent: (accent: AccentTheme) => Promise<void>;
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
  hydrate: (next) => set({ accent: normalizeAccent(next.themeAccent) }),
  setAccent: async (accent) => {
    const prev = get().accent;
    set({ accent });
    try {
      await api.put('/auth/theme', { themeAccent: accent });
    } catch {
      set({ accent: prev });
    }
  },
}));
