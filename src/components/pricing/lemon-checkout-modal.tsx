'use client';

import { useEffect } from 'react';
import { Modal } from '@/components/ui';

interface LemonCheckoutModalProps {
  /** Backend'den dönen LemonSqueezy checkout veya customer-portal URL'i. */
  url: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** İframe'den postMessage ile Checkout.Success geldiğinde tetiklenir. */
  onSuccess?: () => void;
}

/**
 * LemonSqueezy checkout / customer portal'u kendi modal'ımız içinde iframe
 * olarak gösterir. `?embed=1` query param'i ile LemonSqueezy iframe-uyumlu
 * sayfa render eder; başarılı ödemede postMessage ile event gönderir.
 *
 * Kendi modal'ımızı kullanmamızın sebebi: lemon.js'in built-in overlay'i bazı
 * URL formatlarında tam-sayfa navigate yapıyordu. İframe yöntemi deterministic.
 */
export function LemonCheckoutModal({
  url,
  isOpen,
  onOpenChange,
  onSuccess,
}: LemonCheckoutModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MessageEvent) => {
      // LemonSqueezy origin'inden gelen mesajları dinle.
      if (typeof event.data !== 'object' || event.data === null) return;
      const data = event.data as { event?: string };
      if (data.event === 'Checkout.Success') {
        onSuccess?.();
        onOpenChange(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isOpen, onOpenChange, onSuccess]);

  if (!url) return null;

  const finalUrl = /[?&]embed=1\b/.test(url)
    ? url
    : `${url}${url.includes('?') ? '&' : '?'}embed=1`;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px] !rounded-[12px] !bg-white !p-0 !shadow-[0_8px_32px_-2px_rgba(0,0,0,0.16)]">
            <Modal.CloseTrigger className="absolute right-3 top-3 z-10" />
            <iframe
              src={finalUrl}
              title="Ödeme"
              className="block h-[80vh] w-full rounded-[12px] border-0"
              allow="payment *; clipboard-write"
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
