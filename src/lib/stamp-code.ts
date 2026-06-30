/**
 * Görselin sağ-orta kısmına, arkasında beyaz pill olan bir kod (SKU) yazıp
 * yeni bir JPEG data URL döndürür. Canvas tabanlı — üretilen görseller data URL
 * olduğu için CORS taint sorunu olmaz. (Video tarafında kod backend ffmpeg ile.)
 */
export async function stampCodeOnImage(src: string, code: string): Promise<string> {
  const trimmed = code.trim();
  if (!trimmed) return src;
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Görsel genişliğinin ~%2.8'i kadar font (maks 40px) — eskisi çok büyüktü.
    const fontSize = Math.min(Math.max(14, Math.round(canvas.width * 0.028)), 40);
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';

    const textW = ctx.measureText(trimmed).width;
    const padX = fontSize * 0.55;
    const padY = fontSize * 0.35;
    const rectW = textW + padX * 2;
    const rectH = fontSize + padY * 2;
    const margin = canvas.width * 0.03;
    const rx = canvas.width - margin - rectW;
    const ry = canvas.height * 0.5 - rectH / 2;

    // Okunabilirlik için arkaya beyaz pill.
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(rx, ry, rectW, rectH, rectH / 2);
      ctx.fill();
    } else {
      ctx.fillRect(rx, ry, rectW, rectH);
    }

    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.fillText(trimmed, rx + rectW / 2, canvas.height * 0.5);

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return src;
  }
}

/**
 * Kod için saydam zeminli bir "pill" PNG (beyaz hap + siyah metin) üretir.
 * Backend bunu ffmpeg overlay ile videonun üzerine sabit basar.
 */
export function makeCodePillPng(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const fontSize = 48;
  const font = `600 ${fontSize}px Arial, sans-serif`;
  ctx.font = font;
  const textW = ctx.measureText(trimmed).width;
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.4;
  const w = Math.ceil(textW + padX * 2);
  const h = Math.ceil(fontSize + padY * 2);
  canvas.width = w;
  canvas.height = h;
  // Boyut değişince font sıfırlanır — yeniden ayarla.
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, h / 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = '#111111';
  ctx.fillText(trimmed, w / 2, h / 2);
  return canvas.toDataURL('image/png');
}

/** Türkçe karakterleri sadeleştirip dosya adı için slug üretir. */
export function trSlug(s: string): string {
  return (s || '')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
