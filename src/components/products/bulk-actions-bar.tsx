'use client';

import * as React from 'react';
import { ArrowRightArrowLeft, Box, TrashBin } from '@gravity-ui/icons';

interface BulkActionsBarProps {
  count: number;
  onMap?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
}

/**
 * Figma 12249:3298 — Ürün satır(lar)ı seçildiğinde sayfanın alt-orta'sında
 * floating pill bar. Container: rounded-full, white/40 fill, backdrop blur,
 * subtle shadow, 8px padding, 4px gap. İçinde:
 *   1) Ürünleri Eşleştir  (arrow-right-arrow-left prefix)
 *   2) Satıştan Kaldır     (box prefix)
 *   3) 40×40 destructive trash (bg #FF383C, white icon)
 *
 * En az 1 ürün seçili değilse null döner. Position: sticky bottom inside
 * the page content area, mx-auto + w-fit ile yatay ortalanır.
 */
export function BulkActionsBar({
  count,
  onMap,
  onUnpublish,
  onDelete,
}: BulkActionsBarProps) {
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 flex w-full justify-center">
      <div
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/40 p-2 backdrop-blur-md"
        style={{
          boxShadow: '0 0 8px -2px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
        role="toolbar"
        aria-label={`${count} ürün için işlemler`}
      >
        <PillButton onClick={onMap} icon={<ArrowRightArrowLeft className="h-4 w-4" />}>
          Ürünleri Eşleştir
        </PillButton>
        <PillButton onClick={onUnpublish} icon={<Box className="h-4 w-4" />}>
          Satıştan Kaldır
        </PillButton>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Seçili ürünleri sil"
          className="inline-flex h-10 w-10 items-center justify-center rounded-3xl text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#FF383C' }}
        >
          <TrashBin className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PillButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  // Figma 12249:3665 — h:40, padding 8 16, gap 8, radius 24, bg #EBEBEC,
  // text Inter 500 16px (Button base) #18181B.
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-3xl px-4 text-base font-medium leading-6 text-[#18181B] transition-colors hover:opacity-90"
      style={{ backgroundColor: '#EBEBEC' }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
