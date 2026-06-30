'use client';

import * as React from 'react';
import { ArrowRightArrowLeft, Box, Check, TrashBin } from '@gravity-ui/icons';
import { BalinaButton } from '@/components/balina';

interface BulkActionsBarProps {
  count: number;
  onMap?: () => void;
  /** Toggle aktif/pasif — seçili ürünlerin durumuna göre label değişir. */
  onToggleActive?: () => void;
  /** Seçili ürünlerin tamamı şu an pasif mi? — buton label'ı belirler.
   *  true → "Aktif Et" + check ikon
   *  false → "Satıştan Kaldır" + box ikon */
  allSelectedInactive?: boolean;
  onDelete?: () => void;
}

/**
 * Figma 12249:3298 — Ürün satır(lar)ı seçildiğinde dashboard içerik
 * alanının alt-orta'sında sabitlenen pill bar.
 *
 * Position: fixed bottom-6 (24px). Yatay aralık `left-20 right-1` ile
 * dashboard sidebar (w-20 = 80px) hesaba katılır — pill içerik kartının
 * içinde ortalanır, viewport'a göre değil. Scroll edilen sayfa içeriği
 * altında kayıtlı kalır (sticky değil, viewport-fixed).
 */
export function BulkActionsBar({
  count,
  onMap,
  onToggleActive,
  allSelectedInactive = false,
  onDelete,
}: BulkActionsBarProps) {
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-20 right-1 z-30 flex justify-center">
      <div
        className="pointer-events-auto inline-flex items-center gap-1 rounded-xl bg-white/90 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-md bar-blur-in"
        role="toolbar"
        aria-label={`${count} ürün için işlemler`}
      >
        <BalinaButton
          variant="soft"
          onClick={onMap}
          leftIcon={<ArrowRightArrowLeft className="h-4 w-4" />}
        >
          Ürünleri Eşleştir
        </BalinaButton>
        <BalinaButton
          variant="soft"
          onClick={onToggleActive}
          leftIcon={
            allSelectedInactive ? (
              <Check className="h-4 w-4" />
            ) : (
              <Box className="h-4 w-4" />
            )
          }
        >
          {allSelectedInactive ? 'Tekrar Aktif Et' : 'Satıştan Kaldır'}
        </BalinaButton>
        <BalinaButton
          variant="danger"
          onClick={onDelete}
          aria-label="Seçili ürünleri sil"
          leftIcon={<TrashBin className="h-4 w-4" />}
          className="aspect-square justify-center"
        />
      </div>
    </div>
  );
}

