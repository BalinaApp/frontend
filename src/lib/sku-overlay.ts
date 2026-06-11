/** Üretilen görsele SKU kodunu siyah Arial yazıyla işler. Birkaç aday konum
 *  (sağ/sol/alt kenarlar) arasında arka planı EN AÇIK olanı seçer ki kod açık
 *  zemine denk gelip okunsun. Canvas pixel-embed yapar; başarılı olursa data
 *  URL döner, başarısız olursa (CORS, image load fail) orijinal URL — panel
 *  CSS overlay'e fallback eder. */
export async function applySkuOverlayToImage(
  imageUrl: string,
  sku: string,
): Promise<{ url: string; embedded: boolean }> {
  if (!sku) return { url: imageUrl, embedded: false };
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { url: imageUrl, embedded: false };
    ctx.drawImage(img, 0, 0);

    const fontSize = 48;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    const textW = Math.ceil(ctx.measureText(sku).width);
    const textH = fontSize;
    const margin = Math.round(canvas.width * 0.04);

    // Aday konumlar (referans nokta + hizalama). Metin, bunların arasında
    // arka planı EN AÇIK (beyaz/aydınlık) olana yerleştirilir ki okunsun.
    type Cand = { x: number; y: number; align: CanvasTextAlign };
    const candidates: Cand[] = [
      { x: canvas.width - margin, y: canvas.height * 0.5, align: 'right' },
      { x: canvas.width - margin, y: canvas.height * 0.88, align: 'right' },
      { x: canvas.width - margin, y: canvas.height * 0.12, align: 'right' },
      { x: margin, y: canvas.height * 0.88, align: 'left' },
      { x: margin, y: canvas.height * 0.12, align: 'left' },
      { x: margin, y: canvas.height * 0.5, align: 'left' },
      { x: canvas.width * 0.5, y: canvas.height * 0.93, align: 'center' },
    ];

    const avgLuminance = (c: Cand): number => {
      let x0 = c.x;
      if (c.align === 'right') x0 = c.x - textW;
      else if (c.align === 'center') x0 = c.x - textW / 2;
      const bx = Math.max(0, Math.min(canvas.width - 1, Math.round(x0)));
      const by = Math.max(0, Math.min(canvas.height - 1, Math.round(c.y - textH / 2)));
      const bw = Math.max(1, Math.min(canvas.width - bx, textW));
      const bh = Math.max(1, Math.min(canvas.height - by, textH));
      const d = ctx.getImageData(bx, by, bw, bh).data;
      let sum = 0;
      let n = 0;
      // Her 4. pikseli örnekle (hız için).
      for (let i = 0; i < d.length; i += 16) {
        sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        n++;
      }
      return n ? sum / n : 0;
    };

    let best = candidates[0];
    let bestLum = -1;
    for (const c of candidates) {
      const lum = avgLuminance(c);
      if (lum > bestLum) {
        bestLum = lum;
        best = c;
      }
    }

    // En açık (beyaz/aydınlık) aday konuma düz siyah yazı.
    ctx.textAlign = best.align;
    ctx.fillStyle = '#000';
    ctx.fillText(sku, best.x, best.y);

    // Data URL boyutunu sınırlandırmak için JPEG kalitesi düşük tutulur;
    // PNG kullanırsak çok büyür ve backend'e tekrar gönderirken sorun olur.
    return { url: canvas.toDataURL('image/jpeg', 0.92), embedded: true };
  } catch {
    return { url: imageUrl, embedded: false };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/** Backend ffmpeg drawtext endpoint'ine source URL + sku gönderir, SKU'lu mp4
 *  blob URL'ini döner. Hata olursa orijinal URL ile fallback eder (CSS overlay
 *  hâlâ gösterilebilir). */
export async function applySkuOverlayToVideo(params: {
  companyId: string;
  videoUrl: string;
  sku: string;
  api: {
    post: <T = unknown>(
      url: string,
      data?: unknown,
      config?: { responseType?: 'blob' | 'json' },
    ) => Promise<{ data: T }>;
  };
}): Promise<{ url: string; embedded: boolean }> {
  const { companyId, videoUrl, sku, api } = params;
  if (!sku.trim()) return { url: videoUrl, embedded: false };
  try {
    const { data } = await api.post<Blob>(
      `/company/${companyId}/ai/video/embed-sku`,
      { url: videoUrl, sku },
      { responseType: 'blob' },
    );
    const objectUrl = URL.createObjectURL(data);
    return { url: objectUrl, embedded: true };
  } catch {
    return { url: videoUrl, embedded: false };
  }
}
