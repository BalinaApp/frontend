'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { BalinaSegmentedControl, BalinaPaneSeparator, type BalinaSegment } from './balina-segmented-control';

/* Balina Pane Header — kaynak .PaneHeader_* spec'inin portu. İçerik panelinin
 * sticky üst barı: sol (leading + subject) · sağ (segmented control + aksiyon).
 * Tabs yok; e-postaya özgü folder/subject yerine genel slot'lar. */

export interface BalinaPaneHeaderProps {
  /** Subject'ten önce sol slot (geri butonu, mobil toggle vb.). */
  leading?: React.ReactNode;
  /** Başlık ikonu — subject'ten önce ikon + ayraç olarak gösterilir. */
  icon?: React.ReactNode;
  /** Başlık. */
  subject?: React.ReactNode;
  /** Opsiyonel görünüm seçici (Messages/Files/People tarzı). */
  segments?: BalinaSegment[];
  segmentValue?: string;
  onSegmentChange?: (value: string) => void;
  /** Sağ aksiyon alanı (ikon butonları, CTA). */
  actions?: React.ReactNode;
  className?: string;
}

export function BalinaPaneHeader({
  leading,
  icon,
  subject,
  segments,
  segmentValue,
  onSegmentChange,
  actions,
  className,
}: BalinaPaneHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[100] flex h-14 shrink-0 items-center justify-between gap-2 px-2.5',
        className,
      )}
    >
      {/* Progressive blur — üstte yoğun, aşağı doğru sönen katmanlı backdrop-blur.
          Başlığın biraz altına taşar ki içeriğe geçiş yumuşak olsun. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1rem)]">
        {[
          { blur: '0.5px', stop: '100%' },
          { blur: '1.5px', stop: '85%' },
          { blur: '4px', stop: '60%' },
          { blur: '10px', stop: '38%' },
        ].map((l) => (
          <div
            key={l.blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${l.blur})`,
              WebkitBackdropFilter: `blur(${l.blur})`,
              maskImage: `linear-gradient(to bottom, #000 0%, #000 ${l.stop}, transparent 100%)`,
              WebkitMaskImage: `linear-gradient(to bottom, #000 0%, #000 ${l.stop}, transparent 100%)`,
            }}
          />
        ))}
        {/* Hafif zemin tonu — okunabilirlik için. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, var(--balina-background-light-loud) 0%, color-mix(in srgb, var(--balina-background-light-loud) 40%, transparent) 60%, transparent 100%)',
          }}
        />
      </div>

      <div className="flex min-w-0 items-center gap-1">
        {leading}
        {icon != null && (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
              {icon}
            </span>
            <BalinaPaneSeparator />
          </>
        )}
        {subject != null && (
          <span className="text-body-default-medium max-w-[26rem] truncate rounded-lg px-2 py-1 text-[var(--balina-text-loud)]">
            {subject}
          </span>
        )}
      </div>
      {(segments || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {segments && segments.length > 0 && segmentValue != null && (
            <BalinaSegmentedControl
              segments={segments}
              value={segmentValue}
              onChange={onSegmentChange}
            />
          )}
          {segments && segments.length > 0 && actions && <BalinaPaneSeparator />}
          {actions && (
            <div className="flex items-center gap-1 text-[var(--balina-icon-strong)]">
              {actions}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
