'use client';

import * as React from 'react';

/* Otomatik gizlenen scrollbar — kaydırınca görünür, durunca (700ms) kaybolur.
 * Döndürülen ref'i kaydırılabilir elemana bağla ve `balina-scrollbar` sınıfıyla
 * birlikte kullan (stiller src/styles/theme/balina.css'te). */
export function useBalinaScrollbar<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      el.setAttribute('data-scrolling', 'true');
      clearTimeout(timer);
      timer = setTimeout(() => el.setAttribute('data-scrolling', 'false'), 700);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  return ref;
}
