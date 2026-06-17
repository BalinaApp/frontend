'use client';

import * as React from 'react';
import { MobileSidebarToggle } from './mobile-sidebar-toggle';
import { BalinaPaneHeader, type BalinaSegment } from '@/components/balina';

interface PageHeaderProps {
  title: string;
  /** Başlık ikonu — başlıktan önce ikon + ayraç olarak gösterilir. */
  icon?: React.ReactNode;
  /** Optional element rendered before the title (e.g. back button). */
  leading?: React.ReactNode;
  /** Optional content rendered on the right (CTA buttons, filters, etc). */
  action?: React.ReactNode;
  /** Opsiyonel görünüm seçici (Messages/Files/People tarzı). */
  segments?: BalinaSegment[];
  segmentValue?: string;
  onSegmentChange?: (value: string) => void;
}

/**
 * Per-page header that lives at the top of the dashboard content card —
 * page title on the left, optional right-aligned CTA, separated from the
 * page body by a 1px line.
 *
 * Mobilde başlığın hemen solunda sidebar toggle var; soldan slide-in
 * sidebar bu butonla açılır. Desktop'ta sidebar zaten sabit, toggle gizli.
 * `leading` slotu sidebar toggle ile title arasında render edilir — geri
 * butonu gibi navigasyon yardımcıları için.
 */
export function PageHeader({
  title,
  icon,
  leading,
  action,
  segments,
  segmentValue,
  onSegmentChange,
}: PageHeaderProps) {
  return (
    <BalinaPaneHeader
      leading={
        <>
          <MobileSidebarToggle />
          {leading}
        </>
      }
      icon={icon}
      subject={title}
      segments={segments}
      segmentValue={segmentValue}
      onSegmentChange={onSegmentChange}
      actions={action}
    />
  );
}
