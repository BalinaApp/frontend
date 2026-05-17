'use client';

import { useEffect } from 'react';

const APP_NAME = 'balinaOS';

export function usePageTitle(title: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
