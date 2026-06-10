'use client';

import { Xmark } from '@gravity-ui/icons';
import { useRouter } from 'next/navigation';
import { toast } from '@heroui/react';
import { useUIStore } from '@/stores/uiStore';
import { useAiStore } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/**
 * AI launcher — bottom strip içinde inline buton.
 * Hiçbir AI entegrasyonu yoksa click → /stores'a redirect, drawer açılmaz.
 * En az bir aktif entegrasyon (OpenAI / Fal / Fashn) varsa drawer açılır;
 * eksik provider'a özgü uyarı ilgili modda gösterilir.
 */
export function AiChatFab() {
  const { isAiDrawerOpen, toggleAiDrawer, setAiDrawerOpen } = useUIStore();
  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const integrations = useAiStore((s) => s.integrations);
  const hasAnyIntegration = integrations.some((i) => i.isActive);

  const handleClick = () => {
    if (!hasAnyIntegration) {
      if (isAiDrawerOpen) setAiDrawerOpen(false);
      toast.warning('Henüz bir AI entegrasyonu yok — bağla sayfasından ekleyin');
      if (currentCompany?.slug) {
        router.push(`/${currentCompany.slug}/stores`);
      }
      return;
    }
    toggleAiDrawer();
  };

  return (
    <button
      type="button"
      aria-label="balinaOS AI sohbetini aç/kapat"
      aria-pressed={isAiDrawerOpen}
      onClick={handleClick}
      className={[
        // chroma-border sürekli akan renkli kenar — Composer ile aynı stil.
        'chroma-border',
        // Kullanıcı isteği: fab full radius (pill).
        'flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-1.5 pr-2.5',
        'text-xs font-medium transition-colors',
        isAiDrawerOpen
          ? 'bg-black/[0.06] text-foreground'
          : 'text-foreground/80 hover:bg-black/[0.04] hover:text-foreground',
      ].join(' ')}
    >
      <BalinaOsMark className="h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
      <span>balinaOS AI</span>
    </button>
  );
}

/** Drawer header için kompakt kapatma butonu (mevcut pattern). */
export function AiChatCloseButton() {
  const { setAiDrawerOpen } = useUIStore();
  return (
    <button
      type="button"
      aria-label="Kapat"
      onClick={() => setAiDrawerOpen(false)}
      className="rounded-md p-1.5 text-muted hover:bg-surface-secondary"
    >
      <Xmark className="h-4 w-4" />
    </button>
  );
}
