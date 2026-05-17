/**
 * Mail block types — kampanya gövdesi için yapısal editör. Her blok
 * inline-styled HTML'e derlenir (Gmail/Outlook uyumlu). bodyMeta.blocks
 * olarak saklanır → editör tekrar açıldığında yeniden render edilir.
 *
 * Compile() çıktısı `renderCampaignHtml`'ın wrapper'ı içinde gövde olarak
 * kullanılır. {{firstName}} / {{product:id}} placeholder'ları yine destekli.
 */

export type MailBlock =
  | { id: string; type: 'heading'; text: string; level: 'h1' | 'h2' | 'h3' }
  | { id: string; type: 'text'; text: string }
  | {
      id: string;
      type: 'image';
      url: string;
      alt: string;
      href: string | null;
    }
  | { id: string; type: 'product'; productId: string }
  | { id: string; type: 'button'; label: string; href: string; align: 'left' | 'center' | 'right' }
  | { id: string; type: 'divider' }
  | { id: string; type: 'spacer'; height: number };

export const BLOCK_LABELS: Record<MailBlock['type'], string> = {
  heading: 'Başlık',
  text: 'Paragraf',
  image: 'Görsel',
  product: 'Ürün kartı',
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
      return { id, type: 'heading', text: 'Yeni başlık', level: 'h2' };
    case 'text':
      return {
        id,
        type: 'text',
        text: 'Bu paragrafı düzenleyebilirsin. {{firstName}} ile kişiselleştirebilirsin.',
      };
    case 'image':
      return { id, type: 'image', url: '', alt: '', href: null };
    case 'product':
      return { id, type: 'product', productId: '' };
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
      return `<${block.level} style="margin:0 0 12px 0;font-size:${size}px;line-height:1.3;color:#111827;font-weight:600;">${escapeHtml(block.text)}</${block.level}>`;
    }
    case 'text': {
      // Satır sonlarını <br> ile koru; placeholder substitution wrapper'da.
      const html = escapeHtml(block.text).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#111827;">${html}</p>`;
    }
    case 'image': {
      const img = `<img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.alt || '')}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px;" />`;
      const inner = block.href
        ? `<a href="${escapeHtml(block.href)}" style="text-decoration:none;color:inherit;">${img}</a>`
        : img;
      return `<div style="margin:8px 0 16px 0;">${inner}</div>`;
    }
    case 'product': {
      // bodyHtml içine placeholder bırak — backend template renderer
      // {{product:id}}'yi ürün kartına çevirir.
      return `{{product:${block.productId}}}`;
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

/** Compile sırasında kullanılan ürün id'lerini topla — bodyMeta.productIds'a
 *  yazıyoruz ki backend template'i ürünleri prefetch edebilsin. */
export function collectProductIds(blocks: MailBlock[]): string[] {
  return Array.from(
    new Set(
      blocks
        .filter((b): b is Extract<MailBlock, { type: 'product' }> => b.type === 'product')
        .map((b) => b.productId)
        .filter(Boolean),
    ),
  );
}
