'use client';

import { useState } from 'react';
import { ArrowDownToLine } from '@gravity-ui/icons';
import { BalinaButton, BalinaSearchIcon } from '@/components/balina';

export interface ResultSetItem {
  url: string;
  name?: string;
  poseName?: string;
}

/**
 * Bir görsel setini üst üste yığılmış tek kart olarak gösterir; üstüne gelince
 * görseller yelpaze gibi açılır. Altta "Tümünü indir" (ZIP) butonu.
 */
export function ResultSetStack({
  items,
  label,
  busy,
  onZoom,
  onDownload,
}: {
  items: ResultSetItem[];
  label?: string;
  /** ZIP hazırlanırken true. */
  busy?: boolean;
  onZoom: (index: number) => void;
  onDownload: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const n = items.length;
  const center = (n - 1) / 2;

  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      {label && (
        <span className="px-1 text-body-small-medium text-[var(--balina-text-strong)]">
          {label}
        </span>
      )}
      <div
        className="group relative mx-auto flex h-[250px] w-full max-w-[300px] items-center justify-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {items.map((it, i) => {
          const off = i - center;
          // Dururken hafif yığın; hover'da dar yelpaze. Gölgeler kesilmesin
          // diye overflow yok; spread kart genişliği (max-w) içinde kalır.
          const x = hovered ? off * 30 : off * 6;
          const r = hovered ? off * 4 : off * 2.5;
          return (
            <div
              key={i}
              className="absolute h-[210px] w-[140px] transition-transform duration-300 ease-out"
              style={{ zIndex: i + 1, transform: `translateX(${x}px) rotate(${r}deg)` }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={it.poseName ?? ''} className="h-full w-full object-cover" />
                <BalinaButton
                  variant="soft"
                  size="small"
                  aria-label={`${it.poseName || `Görsel ${i + 1}`} büyüt`}
                  onClick={() => onZoom(i)}
                  className="absolute right-1.5 top-1.5 !bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:!bg-white"
                  leftIcon={<BalinaSearchIcon className="h-4 w-4" />}
                />
                {it.poseName && hovered && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-3 text-center text-[11px] font-medium text-white">
                    {it.poseName}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <BalinaButton
          variant="soft"
          size="small"
          disabled={busy}
          onClick={onDownload}
          className="!bg-white text-[var(--balina-text-loud)] shadow-[0_1px_6px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.08] hover:!bg-white"
          rightIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
        >
          {busy ? 'Hazırlanıyor…' : `Tümünü indir (${n})`}
        </BalinaButton>
      </div>
    </div>
  );
}
