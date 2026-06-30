import JSZip from 'jszip';

/**
 * Verilen görselleri (data URL veya uzak URL) bir ZIP yapıp indirir.
 * Dosya adları `name` alanından gelir (uzantı `.png` olarak eklenir).
 */
export async function downloadImagesZip(
  files: { url: string; name: string }[],
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  const used = new Set<string>();

  for (const f of files) {
    const base64 = await urlToBase64(f.url);
    if (!base64) continue;
    // Çakışan adları benzersizleştir.
    let fname = `${f.name || 'gorsel'}.png`;
    let n = 1;
    while (used.has(fname)) fname = `${f.name || 'gorsel'}-${++n}.png`;
    used.add(fname);
    zip.file(fname, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${zipName || 'gorseller'}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/** data URL veya uzak URL'i base64 (header'sız) içeriğe çevirir. */
async function urlToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',');
      return comma >= 0 ? url.slice(comma + 1) : null;
    }
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToBase64(blob);
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
