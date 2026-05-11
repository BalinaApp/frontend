/**
 * Bir File'ı verilen maksimum boyuta yeniden ölçeklendirip JPEG data URL döner.
 * Backend body limit'ini (10MB) aşmamak için kullanılır.
 *
 * @param file Kullanıcının yüklediği dosya
 * @param maxDim En uzun kenarın geçemeyeceği piksel sayısı (default 1024)
 * @param quality JPEG kalitesi 0-1 (default 0.85)
 */
export async function resizeImageToDataUrl(
  file: File,
  maxDim = 1024,
  quality = 0.85,
): Promise<string> {
  // Önce data URL olarak oku, sonra Image'a yükle.
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context yok');
    // Beyaz arkaplan — şeffaf PNG'lerin JPEG'de siyah olmasını engellemek için.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w >= h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
