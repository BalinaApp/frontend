/** Üretilen görsele sağ-altta küçük siyah Arial yazıyla SKU kodunu işler.
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

    // SKU stili — siyah, Arial 24px (kullanıcı talebi). Görüntü çok büyükse
    // 24px görece küçük kalır; bu kullanıcının istediği davranış.
    ctx.font = '600 24px Arial, sans-serif';
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    const padding = 16;
    ctx.fillText(sku, canvas.width - padding, canvas.height - padding);

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
