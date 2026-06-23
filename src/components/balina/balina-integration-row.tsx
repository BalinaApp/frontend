'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Integration Row — entegrasyon listesi satırı (marketplace tarzı).
 * Sol ikon + başlık/açıklama + sağda aksiyon (Bağla/Yönet/Yakında butonu vb.).
 * Hem "Bağlı Olanlar" hem de katalog bölümlerinde kullanılır; ikon JSX'i slot
 * olarak dışarıdan gelir (favicon, brand mark, tile fark etmez). */

export interface BalinaIntegrationRowProps {
  /** Sol ikon — h-10 w-10 alanına ortalanır (favicon kutusu / brand mark / tile). */
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Sağ aksiyon — genelde bir BalinaButton (Bağla/Yönet) veya durum ikonu. */
  action?: React.ReactNode;
  /** Yakında / pasif görünüm — içerik soluklaşır. */
  muted?: boolean;
  /** Vurgulu hedef satır (deep-link sonrası) — hafif zemin + scale. */
  highlighted?: boolean;
  className?: string;
}

export const BalinaIntegrationRow = React.forwardRef<
  HTMLDivElement,
  BalinaIntegrationRowProps
>(function BalinaIntegrationRow(
  { icon, title, description, action, muted, highlighted, className },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 rounded-2xl p-3 transition-all duration-500',
        muted && 'opacity-40',
        highlighted ? 'scale-[1.04] bg-foreground/[0.06]' : 'scale-100',
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-[var(--balina-text-loud)]">
          {title}
        </span>
        {description && (
          <span className="truncate text-xs leading-snug text-[var(--balina-text-muted)]">
            {description}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});
