/**
 * Mail block types — kampanya gövdesi için yapısal editör. Her blok
 * inline-styled HTML'e derlenir (Gmail/Outlook uyumlu). bodyMeta.blocks
 * olarak saklanır → editör tekrar açıldığında yeniden render edilir.
 *
 * Compile() çıktısı `renderCampaignHtml`'ın wrapper'ı içinde gövde olarak
 * kullanılır. {{firstName}} / {{product:id}} placeholder'ları yine destekli.
 */

export type MailBlock =
  | { id: string; type: 'heading'; text: string; level: 'h1' | 'h2' | 'h3'; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'text'; text: string; align?: 'left' | 'center' | 'right' }
  | {
      id: string;
      type: 'image';
      url: string;
      alt: string;
      href: string | null;
    }
  | { id: string; type: 'logo'; url: string; href: string | null }
  | { id: string; type: 'product'; productId: string }
  | {
      id: string;
      type: 'product-grid';
      productIds: string[];
      columns: 2 | 3;
    }
  | { id: string; type: 'button'; label: string; href: string; align: 'left' | 'center' | 'right' }
  | { id: string; type: 'divider' }
  | { id: string; type: 'spacer'; height: number };

export const BLOCK_LABELS: Record<MailBlock['type'], string> = {
  heading: 'Başlık',
  text: 'Paragraf',
  image: 'Görsel',
  logo: 'Logo (ortalı)',
  product: 'Ürün kartı',
  'product-grid': 'Ürün grid (2/3 kolon)',
  button: 'Buton',
  divider: 'Ayırıcı çizgi',
  spacer: 'Boşluk',
};

/** Yeni unique id — crypto.randomUUID varsa onu kullan, yoksa fallback. */
export function newBlockId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function makeDefaultBlock(type: MailBlock['type']): MailBlock {
  const id = newBlockId();
  switch (type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        text: 'Yeni başlık',
        level: 'h2',
        align: 'left',
      };
    case 'text':
      return {
        id,
        type: 'text',
        text: 'Bu paragrafı düzenleyebilirsin. {{firstName}} ile kişiselleştirebilirsin.',
        align: 'left',
      };
    case 'image':
      return { id, type: 'image', url: '', alt: '', href: null };
    case 'logo':
      return { id, type: 'logo', url: '', href: null };
    case 'product':
      return { id, type: 'product', productId: '' };
    case 'product-grid':
      return { id, type: 'product-grid', productIds: [], columns: 2 };
    case 'button':
      return {
        id,
        type: 'button',
        label: 'Alışverişe başla',
        href: '',
        align: 'center',
      };
    case 'divider':
      return { id, type: 'divider' };
    case 'spacer':
      return { id, type: 'spacer', height: 24 };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tek bir bloğu inline HTML'e derler. Wrapper template kendisi tablo
 *  + body container'ı sağlar; biz yalnızca içerikleri üretiyoruz. */
function renderBlock(block: MailBlock): string {
  switch (block.type) {
    case 'heading': {
      const sizes = { h1: 26, h2: 20, h3: 16 } as const;
      const size = sizes[block.level];
      const align = block.align ?? 'left';
      return `<${block.level} style="margin:0 0 12px 0;font-size:${size}px;line-height:1.3;color:#111827;font-weight:600;text-align:${align};">${escapeHtml(block.text)}</${block.level}>`;
    }
    case 'text': {
      const align = block.align ?? 'left';
      const html = escapeHtml(block.text).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#111827;text-align:${align};">${html}</p>`;
    }
    case 'image': {
      const img = `<img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.alt || '')}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px;" />`;
      const inner = block.href
        ? `<a href="${escapeHtml(block.href)}" style="text-decoration:none;color:inherit;">${img}</a>`
        : img;
      return `<div style="margin:8px 0 16px 0;">${inner}</div>`;
    }
    case 'logo': {
      if (!block.url) return '';
      const img = `<img src="${escapeHtml(block.url)}" alt="Logo" style="display:block;max-width:160px;max-height:48px;height:auto;width:auto;margin:0 auto;border:0;" />`;
      const inner = block.href
        ? `<a href="${escapeHtml(block.href)}" style="text-decoration:none;">${img}</a>`
        : img;
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 20px 0;"><tr><td align="center">${inner}</td></tr></table>`;
    }
    case 'product': {
      // bodyHtml içine placeholder bırak — backend template renderer
      // {{product:id}}'yi ürün kartına çevirir.
      return `{{product:${block.productId}}}`;
    }
    case 'product-grid': {
      // Çok kolonlu ürün grid — placeholder'ları tek bir tabloda kümele.
      // Backend template her placeholder'ı tam-genişlik kart olarak render
      // ediyor; burada manuel tablo ile yan yana sığdırıyoruz.
      const cols = block.columns;
      const ids = block.productIds.filter(Boolean);
      if (ids.length === 0) return '';
      const cellWidth = `${Math.floor(100 / cols)}%`;
      const rows: string[][] = [];
      for (let i = 0; i < ids.length; i += cols) {
        rows.push(ids.slice(i, i + cols));
      }
      const trs = rows
        .map((row) => {
          const cells = row
            .map(
              (id) =>
                `<td valign="top" width="${cellWidth}" style="padding:8px;">{{product:${id}}}</td>`,
            )
            .join('');
          // Eksik hücreleri boş td ile doldur ki son satır da hizalı olsun.
          const padding =
            row.length < cols
              ? Array(cols - row.length)
                  .fill(`<td width="${cellWidth}"></td>`)
                  .join('')
              : '';
          return `<tr>${cells}${padding}</tr>`;
        })
        .join('');
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;border-collapse:collapse;">${trs}</table>`;
    }
    case 'button': {
      const align = block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : 'center';
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
  <tr><td align="${align}">
    <a href="${escapeHtml(block.href || '#')}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(block.label)}</a>
  </td></tr>
</table>`;
    }
    case 'divider':
      return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />`;
    case 'spacer':
      return `<div style="height:${Math.max(0, Math.min(120, block.height))}px;line-height:1px;">&nbsp;</div>`;
  }
}

/** Blok listesini birleştirilmiş HTML string'ine derler.
 *  Kişiselleştirme placeholder'ları olduğu gibi kalır
 *  (`{{firstName}}`, `{{product:id}}`); backend renderer substitute eder. */
export function compileBlocksToHtml(blocks: MailBlock[]): string {
  return blocks.map(renderBlock).join('\n');
}

/** Live canvas önizleme — editör sağ panelinde göstermek için kendi başına
 *  çalışan HTML. Backend `renderCampaignHtml` ile yapısal olarak aynı,
 *  ama auth gerektirmediği gibi `{{product:id}}` placeholder'larını
 *  geçici kart placeholder'ına çeviriyor (gerçek ürün verisi yok).
 *  Gerçek render (Resend'in göndereceği) "Önizle" modal'ında alınır. */
export function compileBlocksToPreviewHtml(
  blocks: MailBlock[],
  brandName = 'balinaOS',
): string {
  let inner = blocks.map(renderBlock).join('\n');
  // Placeholder'lar — preview için minimal substitution.
  inner = inner
    .replace(/\{\{\s*firstName\s*\}\}/gi, 'Ad')
    .replace(/\{\{\s*lastName\s*\}\}/gi, 'Soyad')
    .replace(/\{\{\s*name\s*\}\}/gi, 'Müşteri')
    .replace(/\{\{\s*email\s*\}\}/gi, 'musteri@ornek.com')
    .replace(
      /\{\{\s*product:[^}]+\}\}/gi,
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px auto;border-collapse:collapse;width:100%;max-width:200px;">
        <tr><td style="padding:8px 0;text-align:center;">
          <div style="width:100%;max-width:200px;height:200px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">Ürün görseli</div>
          <div style="margin-top:8px;font-size:14px;font-weight:600;color:#111827;">Ürün adı</div>
          <div style="margin-top:4px;font-size:14px;color:#374151;">₺—</div>
        </td></tr>
      </table>`,
    );

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eaeaea;">
      <tr><td style="padding:24px;border-bottom:1px solid #f3f4f6;">
        <div style="font-size:14px;font-weight:600;color:#4b5563;">${brandName}</div>
      </td></tr>
      <tr><td style="padding:24px;font-size:15px;line-height:1.6;color:#111827;">${inner}</td></tr>
      <tr><td style="padding:24px;border-top:1px solid #f3f4f6;font-size:12px;line-height:1.5;color:#6b7280;text-align:center;">
        Bu maili ${brandName} mağazalarından alışveriş yaptığınız için aldınız.<br/>
        <span style="color:#6b7280;text-decoration:underline;">Mailing servisinden çıkmak ister misiniz?</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Compile sırasında kullanılan ürün id'lerini topla — bodyMeta.productIds'a
 *  yazıyoruz ki backend template'i ürünleri prefetch edebilsin.
 *  Tek `product` blokları + `product-grid`'in tüm hücreleri dahil. */
export function collectProductIds(blocks: MailBlock[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) {
    if (b.type === 'product' && b.productId) ids.push(b.productId);
    if (b.type === 'product-grid') {
      for (const pid of b.productIds) if (pid) ids.push(pid);
    }
  }
  return Array.from(new Set(ids));
}
