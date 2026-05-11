'use client';

import { useEffect } from 'react';

const APP_NAME = 'BalinaOS';

export function usePageTitle(title: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
