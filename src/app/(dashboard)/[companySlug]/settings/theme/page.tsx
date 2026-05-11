'use client';

import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Palette } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { AccentTheme, useThemeStore } from '@/stores/themeStore';
import { usePageTitle } from '@/hooks/use-page-title';

interface AccentSwatch {
  /** `null` keeps the default neutral accent (no theme class). */
  id: AccentTheme;
  /** Single-word dominant color name shown in the "Renk" row. */
  label: string;
  /** Tailwind background class for the swatch dot. */
  swatch: string;
  /** Tailwind ring color when this swatch is selected. */
  ring: string;
  /** Whether the swatch needs a dark check icon (light backgrounds). */
  darkCheck?: boolean;
}

const ACCENTS: AccentSwatch[] = [
  { id: null,             label: 'Varsayılan', swatch: 'bg-black/[0.06]',                                                ring: 'ring-zinc-400', darkCheck: true },
  { id: 'lime-emerald',   label: 'Yeşil',      swatch: 'bg-gradient-to-br from-lime-500 to-emerald-600 saturate-150',     ring: 'ring-emerald-500' },
  { id: 'emerald-sky',    label: 'Mavi',       swatch: 'bg-gradient-to-br from-emerald-500 to-sky-600 saturate-150',      ring: 'ring-sky-500' },
  { id: 'sky-indigo',     label: 'Çivit',      swatch: 'bg-gradient-to-br from-sky-500 to-indigo-600 saturate-150',       ring: 'ring-indigo-500' },
  { id: 'indigo-purple',  label: 'Mor',        swatch: 'bg-gradient-to-br from-indigo-500 to-purple-600 saturate-150',    ring: 'ring-purple-500' },
  { id: 'purple-pink',    label: 'Pembe',      swatch: 'bg-gradient-to-br from-purple-500 to-pink-600 saturate-150',      ring: 'ring-pink-500' },
  { id: 'pink-orange',    label: 'Turuncu',    swatch: 'bg-gradient-to-br from-pink-500 to-orange-600 saturate-150',      ring: 'ring-orange-500' },
  { id: 'amber-red',      label: 'Kırmızı',    swatch: 'bg-gradient-to-br from-amber-500 to-red-600 saturate-150',        ring: 'ring-red-500' },
];

export default function ThemeSettingsPage() {
  usePageTitle('Tema');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const { accent: accentId, setAccent } = useThemeStore();
  const accent = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0];

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Tema</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {/* Header row: palette + title */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500 text-white">
                <Palette className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground/85">
                  Tema
                </span>
                <span className="text-xs text-foreground/60">
                  Uygulama temasını ve renklerini özelleştirin.
                </span>
              </div>
            </div>

            {/* Current accent label row — single dominant color */}
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] p-3">
              <span className="text-sm font-medium text-foreground/85">Renk</span>
              <span className="text-xs text-muted">{accent.label}</span>
            </div>

            {/* Color swatch picker */}
            <div className="flex items-center justify-end gap-3 p-3">
              <div className="flex items-center gap-2">
                {ACCENTS.map((option) => {
                  const isActive = option.id === accentId;
                  return (
                    <button
                      key={option.id ?? 'default'}
                      type="button"
                      onClick={() => setAccent(option.id)}
                      aria-label={option.label}
                      aria-pressed={isActive}
                      className={`relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full ${option.swatch}`}
                    >
                      {isActive && (
                        <Check
                          className={`h-2.5 w-2.5 ${
                            option.darkCheck ? 'text-foreground/60' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
