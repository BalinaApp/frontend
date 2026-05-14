/** Üretilen görsele sol-altta küçük siyah Arial yazıyla SKU kodunu işler.
 *  Canvas pixel-embed yapar; başarılı olursa data URL döner, başarısız olursa
 *  orijinal URL'i. Başarısız durum (CORS, image load fail) için panel CSS
 *  overlay'e fallback eder. */
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

    ctx.font = '48px Arial, sans-serif';
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    const padding = 32;
    ctx.fillText(sku, padding, canvas.height - padding);

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
