'use client';

import * as React from 'react';
import * as RAlert from '@radix-ui/react-alert-dialog';
import { cn } from './cn';
import { DialogCloseContext } from './dialog-context';

/* HeroUI v3 AlertDialog drop-in — Radix AlertDialog üzerine. `alert-dialog__*`
 * sınıfları korunur (globals.css özelleştirmeleri uygulansın). */

interface RootProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Root({ isOpen, defaultOpen, onOpenChange, children }: RootProps) {
  const close = React.useCallback(() => onOpenChange?.(false), [onOpenChange]);
  return (
    <RAlert.Root open={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogCloseContext.Provider value={close}>
        {children}
      </DialogCloseContext.Provider>
    </RAlert.Root>
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
    <RAlert.Portal>
      <RAlert.Overlay
        className={cn(
          'alert-dialog__backdrop fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0',
          className,
        )}
      />
      {children}
    </RAlert.Portal>
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

const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 'data-placement'?: string }
>(function Dialog({ className, children, ...rest }, ref) {
  return (
    <RAlert.Content
      ref={ref}
      className={cn(
        'alert-dialog__dialog relative flex w-full max-w-sm flex-col outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95',
        className,
      )}
      {...rest}
    >
      {children}
    </RAlert.Content>
  );
});

function Header({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn('alert-dialog__header flex', className)}>{children}</div>;
}

function Icon({
  className,
  children,
}: {
  className?: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return <span className={cn('alert-dialog__icon shrink-0', className)}>{children}</span>;
}

function Heading({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RAlert.Title className={cn('alert-dialog__heading', className)}>
      {children}
    </RAlert.Title>
  );
}

function Body({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <RAlert.Description asChild>
      <div className={cn('alert-dialog__body', className)} {...rest}>
        {children}
      </div>
    </RAlert.Description>
  );
}

function Footer({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn('alert-dialog__footer flex', className)}>{children}</div>;
}

export const AlertDialog = Object.assign(Root, {
  Backdrop,
  Container,
  Dialog,
  Header,
  Icon,
  Heading,
  Body,
  Footer,
});
