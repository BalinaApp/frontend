'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Xmark } from '@gravity-ui/icons';
import { cn } from './cn';
import { DialogCloseContext } from './dialog-context';

/* HeroUI v3 Modal drop-in — Radix Dialog üzerine. Compound API ve `modal__*`
 * sınıfları korunur; görsel özelleştirmeler globals.css'teki .modal__* kurallarından
 * gelir, taban yapı (layout/animasyon) burada. */

interface ModalRootProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function ModalRoot({ isOpen, defaultOpen, onOpenChange, children }: ModalRootProps) {
  const close = React.useCallback(() => onOpenChange?.(false), [onOpenChange]);
  return (
    <Dialog.Root
      open={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <DialogCloseContext.Provider value={close}>
        {children}
      </DialogCloseContext.Provider>
    </Dialog.Root>
  );
}

function Backdrop({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className={cn(
          'modal__backdrop fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          className,
        )}
      />
      {children}
    </Dialog.Portal>
  );
}

function Container({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

const DialogPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 'data-placement'?: string }
>(function DialogPanel({ className, children, ...rest }, ref) {
  return (
    <Dialog.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(
        'modal__dialog relative flex w-full max-w-md flex-col outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...rest}
    >
      {children}
    </Dialog.Content>
  );
});

function CloseTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog.Close
      className={cn(
        'modal__close-trigger absolute right-4 top-4 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-black/5 hover:text-foreground',
        className,
      )}
      aria-label="Kapat"
    >
      {children ?? <Xmark className="h-4 w-4" />}
    </Dialog.Close>
  );
}

function Header({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('modal__header flex', className)} {...rest} />;
}

function Icon({
  className,
  children,
}: {
  className?: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'modal__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        className,
      )}
    >
      {children}
    </span>
  );
}

function Heading({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog.Title className={cn('modal__heading', className)}>
      {children}
    </Dialog.Title>
  );
}

function Body({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('modal__body', className)} {...rest} />;
}

function Footer({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('modal__footer flex', className)} {...rest} />;
}

export const Modal = Object.assign(ModalRoot, {
  Backdrop,
  Container,
  Dialog: DialogPanel,
  CloseTrigger,
  Header,
  Icon,
  Heading,
  Body,
  Footer,
});
