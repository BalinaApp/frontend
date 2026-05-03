'use client';

import { useEffect } from 'react';

/**
 * Suppresses a known-benign unhandled rejection that surfaces in dev when a
 * second navigation interrupts an in-flight browser View Transition. Next.js
 * triggers View Transitions for client-side routes; if router.push fires
 * twice in quick succession (e.g. AuthGuard redirect + a same-tick state
 * update from the page itself) the older transition resolves with
 * `InvalidStateError: Transition was aborted because of invalid state`.
 *
 * It's a harmless cleanup error — the user always lands on the latest
 * destination — but the dev runtime overlay/console treats it as critical.
 * Filter it out instead of papering over every individual call site.
 */
export function SuppressBenignErrors() {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { name?: string; message?: string } | undefined;
      if (
        reason?.name === 'InvalidStateError' &&
        reason.message?.includes('Transition was aborted')
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return null;
}
