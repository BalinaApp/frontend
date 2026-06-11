'use client';

import * as React from 'react';
import { Toaster as SonnerToaster, toast as sonner } from 'sonner';

/* HeroUI v3 toast drop-in — sonner üzerine. HeroUI metodları (success/danger/
 * warning/info/clear) sonner'a eşlenir. <Toast /> = global Toaster sağlayıcı. */

type Msg = React.ReactNode;
type SonnerOpts = Parameters<typeof sonner.success>[1];
/** HeroUI'ye özel ekstra opsiyonlar (actionProps vb.) sessizce yutulur. */
type Opts = Record<string, unknown>;
const so = (o?: Opts) => o as SonnerOpts;

/** toast(...) doğrudan çağrı + toast.success/danger/... metodları. */
const toastFn = (m: Msg, o?: Opts) => sonner(m, so(o));

export const toast = Object.assign(toastFn, {
  success: (m: Msg, o?: Opts) => sonner.success(m, so(o)),
  danger: (m: Msg, o?: Opts) => sonner.error(m, so(o)),
  error: (m: Msg, o?: Opts) => sonner.error(m, so(o)),
  warning: (m: Msg, o?: Opts) => sonner.warning(m, so(o)),
  info: (m: Msg, o?: Opts) => sonner.info(m, so(o)),
  message: (m: Msg, o?: Opts) => sonner(m, so(o)),
  clear: () => sonner.dismiss(),
  dismiss: (id?: string | number) => sonner.dismiss(id),
});

function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-border bg-[var(--color-overlay)] text-overlay-foreground shadow-[var(--shadow-elevated)] backdrop-blur-xl',
        },
      }}
      {...props}
    />
  );
}

/* HeroUI uyumu: hem <Toast /> hem <Toast.Provider /> global Toaster'ı render eder. */
export const Toast = Object.assign(Toaster, { Provider: Toaster });
