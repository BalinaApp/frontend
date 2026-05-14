'use client';

import { Xmark } from '@gravity-ui/icons';
import { useUIStore } from '@/stores/uiStore';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/**
 * AI launcher — bottom strip içinde inline buton.
 * Gradient sphere (Figma 12204:6590) + "BalinaOS AI" text.
 * Drawer açıkken aktif state'te kalır, click ile toggle eder.
 */
export function AiChatFab() {
  const { isAiDrawerOpen, toggleAiDrawer } = useUIStore();

  return (
    <button
      type="button"
      aria-label="BalinaOS AI sohbetini aç/kapat"
      aria-pressed={isAiDrawerOpen}
      onClick={() => toggleAiDrawer()}
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
      <span>BalinaOS AI</span>
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
