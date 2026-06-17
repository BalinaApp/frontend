'use client';

import * as React from 'react';
import { Toaster as SonnerToaster, toast as sonner } from 'sonner';
import { BalinaToast, type BalinaToastVariant } from '@/components/balina';

/* Sistem toast'ı — Balina toast'a (sonner.custom + unstyled) köprülenir.
 * Tüm uygulamada `toast.success/danger/...` → Balina toast render eder. */

type Msg = React.ReactNode;
type Opts = Record<string, unknown>;
type SonnerOpts = Parameters<typeof sonner.custom>[1];

const show = (m: Msg, variant: BalinaToastVariant, o?: Opts) =>
  sonner.custom(
    () => (
      <BalinaToast variant={variant} className="w-fit">
        {m}
      </BalinaToast>
    ),
    { unstyled: true, ...(o ?? {}) } as SonnerOpts,
  );

const toastFn = (m: Msg, o?: Opts) => show(m, 'default', o);

export const toast = Object.assign(toastFn, {
  success: (m: Msg, o?: Opts) => show(m, 'success', o),
  danger: (m: Msg, o?: Opts) => show(m, 'error', o),
  error: (m: Msg, o?: Opts) => show(m, 'error', o),
  warning: (m: Msg, o?: Opts) => show(m, 'warning', o),
  info: (m: Msg, o?: Opts) => show(m, 'info', o),
  message: (m: Msg, o?: Opts) => show(m, 'default', o),
  clear: () => sonner.dismiss(),
  dismiss: (id?: string | number) => sonner.dismiss(id),
});

function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return <SonnerToaster position="top-center" {...props} />;
}

/* HeroUI uyumu: hem <Toast /> hem <Toast.Provider /> global Toaster'ı render eder. */
export const Toast = Object.assign(Toaster, { Provider: Toaster });
