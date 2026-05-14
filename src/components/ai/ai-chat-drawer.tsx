'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAiCreatorStore } from '@/stores/aiCreatorStore';
import { GuidedAiChatPanel } from './guided-ai-chat-panel';

/**
 * AI chat paneli — content card'ın içinde floating card olarak konumlanır.
 * Linear / Apple stilinde: sağ-altta küçük pencere, expand butonuyla içerik
 * alanını kaplar. FAB konumundan büyüyerek açılır (transform-origin bottom-right).
 *
 * Mobile (<640px): drawer her zaman full-screen modunda — küçültme/genişletme
 * butonları gizli, content %100. isAiDrawerExpanded mobile'da ignore edilir.
 */
export function AiChatDrawer() {
  const { isAiDrawerOpen, isAiDrawerExpanded, setAiDrawerOpen } = useUIStore();
  const { reset } = useAiCreatorStore();
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection — drawer-internal layout için. matchMedia ile reaktif.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const showExpanded = isMobile || isAiDrawerExpanded;

  // Kapat → akışı sıfırla, sonra panel'i kapat. Yeniden açılınca temiz başlar.
  const handleClose = () => {
    reset();
    setAiDrawerOpen(false);
  };

  // ESC ile kapat — kullanıcı klavyeden çıkmak isterse.
  useEffect(() => {
    if (!isAiDrawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiDrawerOpen]);

  return (
    <aside
      aria-label="AI sohbet paneli"
      aria-hidden={!isAiDrawerOpen}
      className={[
        'absolute z-40',
        isAiDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      style={{
        // Normal: bottom-right'ta 394×560 floating card (Notion assistant
        // floatingContainer spec: 24.625rem × 35rem). Margin 16px.
        // Expanded: tam ekran (mobile veya web expanded).
        top: showExpanded ? (isMobile ? '0px' : '16px') : 'calc(100% - 576px)',
        right: showExpanded ? '0px' : '16px',
        bottom: showExpanded ? '0px' : '16px',
        left: showExpanded ? '0px' : 'calc(100% - 410px)',
        transformOrigin: 'bottom right',
        // Kapalıyken FAB konumundan büyüyerek açılır.
        transform: isAiDrawerOpen ? 'scale(1)' : 'scale(0.6)',
        opacity: isAiDrawerOpen ? 1 : 0,
        transition: [
          'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          'top 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          'right 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          'bottom 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          'left 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        ].join(', '),
      }}
    >
      <GuidedAiChatPanel variant="drawer" onClose={handleClose} />
    </aside>
  );
}
