'use client';

import { LayoutSideContentLeft } from '@gravity-ui/icons';
import { useUIStore } from '@/stores/uiStore';

interface MobileSidebarToggleProps {
  /** Optional extra classes (e.g. positioning overrides). */
  className?: string;
}

/**
 * Mobil sidebar'ı açıp kapatan ikon buton. PageHeader kullanmayan sayfalar
 * (örn. Entegrasyonlar) bunu kendi layout'larında uygun bir yere koyar.
 * Desktop'ta (md+) tamamen gizlidir — sidebar zaten sabit.
 */
export function MobileSidebarToggle({ className }: MobileSidebarToggleProps) {
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);

  return (
    <button
      type="button"
      aria-label="Menüyü aç"
      onClick={toggleMobileSidebar}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden',
        className ?? '',
      ].join(' ')}
    >
      <LayoutSideContentLeft className="h-5 w-5" />
    </button>
  );
}
