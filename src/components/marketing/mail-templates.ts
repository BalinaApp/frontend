/**
 * Hazır kampanya şablonları. Yeni kampanya oluştururken kullanıcıya
 * gösterilir; seçim sonrası `bodyMeta.blocks` bu listeyle dolar ve
 * kullanıcı düzenlemeye başlar.
 *
 * Her şablon yalnızca seed — id'ler editörde regenerate edilebilir,
 * placeholder'lar (`{{firstName}}`, ürün id'leri) kullanıcı tarafından
 * düzenlenmek üzere bırakılmıştır.
 */

import { makeDefaultBlock, type MailBlock } from './mail-blocks';

export interface MailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  blocks: MailBlock[];
}

function buildBlocks(
  factories: Array<(b: MailBlock) => MailBlock>,
): MailBlock[] {
  return factories.map((f, i) => {
    const types: MailBlock['type'][] = [
      'heading',
      'text',
      'image',
      'product',
      'button',
      'divider',
      'spacer',
    ];
    // Faktöriyi tip-güvenli kullanmak için sırayla makeDefault çağıralım;
    // her factory kendi type'ını biliyor olacak.
    void i;
    return f(makeDefaultBlock('text'));
  });
}

/** Şablon listesi — yeni şablon eklemek için bu diziye eklersen UI otomatik gösterir. */
export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'blank',
    name: 'Boş tema',
    description: 'Sıfırdan kendi mailini tasarla.',
    subject: '',
    blocks: [],
  },
  {
    id: 'welcome',
    name: 'Hoş geldin',
    description:
      'Yeni müşteriye teşekkür + indirim kuponu + alışverişe yönlendirme.',
    subject: 'Aramıza hoş geldin! 🎉',
    blocks: buildBlocks([
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Hoş geldin, {{firstName}}!',
        level: 'h2',
      }),
      () => ({
        ...makeDefaultBlock('text'),
        text:
          'Aramıza katıldığın için teşekkürler. İlk alışverişin için sana özel %15 indirim kuponu hediye:',
      }),
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'WELCOME15',
        level: 'h1',
      }),
      () => ({
        ...makeDefaultBlock('button'),
        label: 'Alışverişe başla',
        align: 'center',
      }),
      () => ({ ...makeDefaultBlock('divider') }),
      () => ({
        ...makeDefaultBlock('text'),
        text:
          'Soruların için cevap@vermek istediğin adresleri buraya yaz — biz hep yanındayız.',
      }),
    ]),
  },
  {
    id: 'promo',
    name: 'Sezon indirimi',
    description:
      'Görsel banner + indirim açıklaması + öne çıkan ürünler + CTA.',
    subject: '%30 indirim — sadece bu hafta sonu',
    blocks: buildBlocks([
      () => ({
        ...makeDefaultBlock('image'),
        url: '',
        alt: 'Kampanya banner görseli',
      }),
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Bahar koleksiyonu açıldı',
        level: 'h2',
      }),
      () => ({
        ...makeDefaultBlock('text'),
        text:
          'Yeni sezon parçalarımızı bu hafta sonu özel %30 indirimle keşfet. Stoklarla sınırlıdır.',
      }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({
        ...makeDefaultBlock('button'),
        label: 'Tümünü gör',
        align: 'center',
      }),
    ]),
  },
  {
    id: 'product-launch',
    name: 'Yeni ürün duyurusu',
    description: 'Tek ürüne odaklı lansman maili — büyük görsel + detay + CTA.',
    subject: '🎁 Yeni ürün: ',
    blocks: buildBlocks([
      () => ({
        ...makeDefaultBlock('heading'),
        text: '{{firstName}}, sana yeni bir şey hazırladık',
        level: 'h2',
      }),
      () => ({
        ...makeDefaultBlock('text'),
        text:
          'Aylar süren tasarım ve test sonrası en yeni ürünümüz raflarda yerini aldı. İlk gören sen olursun istedik.',
      }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({ ...makeDefaultBlock('spacer'), height: 16 }),
      () => ({
        ...makeDefaultBlock('button'),
        label: 'Hemen incele',
        align: 'center',
      }),
    ]),
  },
  {
    id: 'event-discount',
    name: 'Sepet indirimi (etkinlik)',
    description:
      'Tepede logo + ortalanmış başlık + büyük görsel + tek ürün vurgusu + diğer ürünler 2x2 grid + footer.',
    subject: 'Sepetinizdeki ürüne özel %20 indirim',
    blocks: buildBlocks([
      () => ({ ...makeDefaultBlock('logo') }),
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Sepetinizde bir adet ürüne %20 indirim uyguladık.',
        level: 'h2',
        align: 'center',
      }),
      () => ({
        ...makeDefaultBlock('image'),
        alt: 'Öne çıkan etkinlik / ürün',
      }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({
        ...makeDefaultBlock('button'),
        label: 'Satın al',
        align: 'left',
      }),
      () => ({ ...makeDefaultBlock('divider') }),
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Diğer etkinlikler',
        level: 'h3',
        align: 'center',
      }),
      () => ({ ...makeDefaultBlock('product-grid'), columns: 2 }),
    ]),
  },
  {
    id: 'newsletter',
    name: 'Bülten',
    description:
      'Aylık güncelleme — başlık, kısa içerik, 2-3 öne çıkan ürün.',
    subject: 'Bu ay sende neler oldu?',
    blocks: buildBlocks([
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Mart bülteni',
        level: 'h2',
      }),
      () => ({
        ...makeDefaultBlock('text'),
        text:
          'Merhaba {{firstName}}, bu ay sende neler oldu? Yeni gelenler, en çok satanlar ve özel haberler:',
      }),
      () => ({ ...makeDefaultBlock('divider') }),
      () => ({
        ...makeDefaultBlock('heading'),
        text: 'Bu ayın öne çıkanları',
        level: 'h3',
      }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({ ...makeDefaultBlock('product') }),
      () => ({
        ...makeDefaultBlock('button'),
        label: 'Hepsini gör',
        align: 'center',
      }),
    ]),
  },
];
