'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/components/ui/cn';

/* Balina Modal — kaynak .DialogModal_* spec'inin portu
 * (Radix Dialog üzerine, balina token'larıyla, "define" ismi olmadan). */

const overlayClasses =
  'balina-modal-overlay fixed inset-0 z-[99999] backdrop-blur-[12px] bg-[var(--balina-neutral-dark-30)]';

// Açılış ve kapanış aynı: scale + opacity (balina.css keyframe'leri, cubic).
const contentClasses =
  'balina-modal relative flex max-h-[85vh] w-[90vw] max-w-[25rem] flex-col gap-4 rounded-3xl p-5 outline-none ' +
  'bg-[var(--balina-background-light-shout)] shadow-elevation-large';

export interface BalinaModalProps {
  /** Tetikleyici öğe (asChild ile sarılır). Kontrollü kullanımda atlanabilir. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  /** Başlık solundaki ikon (DialogTitle satırında). */
  titleIcon?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Sağa yaslı aksiyon satırı (genelde Balina Button'lar). */
  footer?: React.ReactNode;
  className?: string;
}

export function BalinaModal({
  trigger,
  open,
  onOpenChange,
  title,
  titleIcon,
  description,
  children,
  footer,
  className,
}: BalinaModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClasses} />
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <Dialog.Content className={cn(contentClasses, className)}>
          {title && (
            <Dialog.Title className="text-body-large-medium flex items-center gap-2 text-[var(--balina-text-loud)]">
              {titleIcon && (
                <span className="flex shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
                  {titleIcon}
                </span>
              )}
              {title}
            </Dialog.Title>
          )}
          {description ? (
            <Dialog.Description className="text-body-default-regular text-[var(--balina-text-default)]">
              {description}
            </Dialog.Description>
          ) : (
            // Erişilebilirlik: açıklama verilmese de Radix'in beklediği
            // Description'ı gizli olarak sağla (aria-describedby uyarısını önler).
            <Dialog.Description className="sr-only">İçerik</Dialog.Description>
          )}
          {children}
          {footer && (
            <div className="mt-1 flex justify-end gap-3 [&>button:first-child]:px-2.5">
              {footer}
            </div>
          )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Modal'ı kapatan sarmalayıcı (footer'daki iptal butonu için: asChild). */
export const BalinaModalClose = Dialog.Close;
