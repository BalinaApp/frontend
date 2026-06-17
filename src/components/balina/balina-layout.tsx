'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Layout — kaynak .mainLayout / .ThemeEditor_themePattern / Workbench /
 * assistantWrapper yapısının portu. Uygulama kabuğu: sol sidebar + workbench
 * (ana içerik) + sağ assistant paneli; arkada tema deseni katmanı. */

export interface BalinaLayoutProps {
  /** Sol kenar çubuğu (genelde sabit ~256px). */
  sidebar?: React.ReactNode;
  /** Sağ AI asistan paneli (açıkken görünür). */
  assistant?: React.ReactNode;
  /** Ana içerik (workbench / pane'ler). */
  children?: React.ReactNode;
  /** Tema deseni görsel URL'i (opsiyonel; verilmezse desen yok). */
  patternImage?: string;
  className?: string;
}

export function BalinaLayout({
  sidebar,
  assistant,
  children,
  patternImage,
  className,
}: BalinaLayoutProps) {
  return (
    <main
      className={cn(
        'relative flex min-h-svh w-full min-w-0 flex-1 p-[var(--gap)]',
        className,
      )}
      style={{ background: 'var(--balina-base-heavy-loud)' }}
    >
      {/* Tema deseni katmanı (soft-light) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 [background-size:256px_256px] [mix-blend-mode:soft-light]"
        style={{ backgroundImage: patternImage ? `url(${patternImage})` : undefined }}
      />

      {/* Sol sidebar */}
      {sidebar}

      {/* Workbench (ana içerik) */}
      <div className="relative z-[1] flex min-w-0 flex-1">{children}</div>

      {/* Sağ asistan paneli */}
      {assistant}
    </main>
  );
}
