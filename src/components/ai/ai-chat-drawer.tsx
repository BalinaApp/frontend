'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAiCreatorStore } from '@/stores/aiCreatorStore';
import { GuidedAiChatPanel } from './guided-ai-chat-panel';

/**
 * AI chat paneli — content card'ın içinde floating card olarak konumlanır.
 * Linear / Apple stilinde: sağ-altta küçük pencere, expand butonuyla içerik
 * alanını kaplar. FAB konumundan büyüyerek açılır (transform-origin bottom-right).
 */
export function AiChatDrawer() {
  const { isAiDrawerOpen, isAiDrawerExpanded, setAiDrawerOpen } = useUIStore();
  const { reset } = useAiCreatorStore();

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
        // Normal: bottom-right'ta 440×680 floating card (16px margin).
        // Expanded: sıfıra sıfır, sadece top:16 — content arkada hafif görünsün.
        // Inset (top/right/bottom/left) ile hesaplanan boyut animate olur;
        // width/height set etmiyoruz, calc() ile auto-compute.
        top: isAiDrawerExpanded ? '16px' : 'calc(100% - 696px)',
        right: isAiDrawerExpanded ? '0px' : '16px',
        bottom: isAiDrawerExpanded ? '0px' : '16px',
        left: isAiDrawerExpanded ? '0px' : 'calc(100% - 456px)',
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
