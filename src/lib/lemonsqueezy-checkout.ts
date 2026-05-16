/**
 * LemonSqueezy overlay yardımcısı.
 *
 * Resmi yöntem: `assets.lemonsqueezy.com/lemon.js` script'ini sayfaya inject
 * eder; checkout URL'sine `embed=1` parametresi ekleyerek **gizli bir anchor
 * element** oluşturur ve programmatik click ile lemon.js'in click-handler'ını
 * tetikler. Böylece checkout sayfa üstünde **küçük modal overlay** olarak açılır,
 * tam sayfa redirect yapmaz.
 *
 * Programmatik `Url.Open()` çağrısı bazı durumlarda fullscreen navigate ediyordu
 * (lemon.js'in overlay paths'i sadece anchor click event'inde aktif). Anchor
 * tıklama yöntemi en güvenilir olanı.
 */

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup?: (config: { eventHandler?: (event: unknown) => void }) => void;
      Url?: {
        Open?: (url: string) => void;
        Close?: () => void;
      };
    };
  }
}

const LEMON_SCRIPT_SRC = 'https://assets.lemonsqueezy.com/lemon.js';
let scriptPromise: Promise<void> | null = null;
let isSetup = false;

function loadLemonScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.LemonSqueezy?.Url?.Open) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${LEMON_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.LemonSqueezy?.Url?.Open) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('lemon.js yüklenemedi')),
          { once: true },
        );
      }
      return;
    }
    const script = document.createElement('script');
    script.src = LEMON_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('lemon.js yüklenemedi'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function withEmbedParam(url: string): string {
  if (/[?&]embed=1\b/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}embed=1`;
}

function setupLemon(): void {
  if (isSetup) return;
  if (typeof window.createLemonSqueezy === 'function') {
    window.createLemonSqueezy();
  }
  if (window.LemonSqueezy?.Setup) {
    window.LemonSqueezy.Setup({
      eventHandler: () => {
        // Checkout.Success / Closed event'leri burada handle edilebilir.
      },
    });
  }
  isSetup = true;
}

export async function openLemonCheckout(url: string): Promise<boolean> {
  try {
    await loadLemonScript();
    setupLemon();

    const finalUrl = withEmbedParam(url);
    // Lemon.js click handler'ını tetikleyecek gizli anchor — overlay modu için
    // en güvenilir yol (Url.Open bazı durumlarda fullscreen navigate ediyor).
    const anchor = document.createElement('a');
    anchor.href = finalUrl;
    anchor.className = 'lemonsqueezy-button';
    anchor.rel = 'nofollow';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    // Kısa süre sonra DOM'dan temizle.
    setTimeout(() => {
      anchor.remove();
    }, 250);
    return true;
  } catch {
    // Script yüklenemediyse yeni sekmede aç — kullanıcı tamamen kaybolmasın.
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }
}
