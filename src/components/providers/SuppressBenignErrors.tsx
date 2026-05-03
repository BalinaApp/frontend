'use client';

/**
 * Filters out a known-benign error: when a second client-side navigation
 * interrupts an in-flight browser View Transition, the older transition
 * rejects with `InvalidStateError: Transition was aborted because of
 * invalid state`. The user always lands on the final destination — the
 * cleanup error is just dev-overlay noise.
 *
 * Listeners are attached at module load time (synchronously, before any
 * useEffect) so they're already in place when the very first transition
 * fires. We listen on both `unhandledrejection` and `error` because Next.js
 * dev overlay reads from both.
 */
function isBenignTransitionAbort(reason: unknown): boolean {
  const err = reason as { name?: string; message?: string } | undefined;
  return (
    err?.name === 'InvalidStateError' &&
    !!err.message?.includes('Transition was aborted')
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (e: PromiseRejectionEvent) => {
      if (isBenignTransitionAbort(e.reason)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true, // capture phase, run before Next.js dev overlay
  );
  window.addEventListener(
    'error',
    (e: ErrorEvent) => {
      if (isBenignTransitionAbort(e.error)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
}

export function SuppressBenignErrors() {
  return null;
}
