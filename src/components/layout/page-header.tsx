'use client';

import * as React from 'react';
import { MobileSidebarToggle } from './mobile-sidebar-toggle';

interface PageHeaderProps {
  title: string;
  /** Optional element rendered before the title (e.g. back button). */
  leading?: React.ReactNode;
  /** Optional content rendered on the right (CTA buttons, filters, etc). */
  action?: React.ReactNode;
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
export function PageHeader({ title, leading, action }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-black/10 p-4">
      <div className="flex flex-1 items-center gap-2">
        <MobileSidebarToggle />
        {leading}
        <h1 className="text-sm font-medium leading-[1.43] text-foreground">
          {title}
        </h1>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}
