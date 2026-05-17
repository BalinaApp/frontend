# Marketing Feature TODO

Email marketing modülü — sipariş veren müşterilerin email/isim bilgilerini
toplayıp, AI destekli kampanyalar gönderme. Mail provider: **Resend**
(zaten kurulu — `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env'leri mevcut).

## Mimari özet

- **MarketingContact**: company başına unique email; sipariş sync'inde
  otomatik upsert.
- **MarketingCampaign**: draft → scheduled → sending → sent.
- **MarketingSend**: kampanya × kontak — per-recipient durum, açma/tıklama
  tracking, unsubscribe token.
- **Public unsubscribe**: token tabanlı `/unsubscribe/:token`.
- **Resend webhook**: bounce/complaint/open/click eventleri için.

## Faz 1 — Kontak toplama altyapısı

### Backend
- [ ] Prisma migration: `MarketingContact` tablosu
  - companyId, email (companyId+email unique), firstName, lastName, phone
  - source (`order`/`manual`/`import`), storeIds (string[])
  - orderCount, totalSpent, lastOrderAt
  - isUnsubscribed, unsubscribedAt, status (`active`/`bounced`/`complained`)
  - tags (string[]), createdAt, updatedAt
- [ ] `Company.marketingContacts` back-relation
- [ ] `MarketingModule` iskeleti (controller + service)
- [ ] `MarketingContactService.upsertFromOrder(...)` — order.service / store.service'te
  her yeni siparişte çağrılır (email + billing first/last name).
- [ ] `MarketingContactService.backfillFromOrders(companyId)` — tüm geçmiş
  siparişlerden toplu upsert (idempotent).
- [ ] Endpoints (auth-gated):
  - `GET    /company/:cid/marketing/contacts` — paginate + search + status filter
  - `GET    /company/:cid/marketing/contacts/:id`
  - `PATCH  /company/:cid/marketing/contacts/:id` — firstName/lastName/tags
  - `DELETE /company/:cid/marketing/contacts/:id`
  - `POST   /company/:cid/marketing/contacts/:id/unsubscribe`
  - `POST   /company/:cid/marketing/contacts/backfill` — tek seferlik
    geçmiş siparişlerden senkronize
- [ ] AppModule kaydı

### Frontend
- [ ] `marketingStore` (Zustand) — contacts state + CRUD actions
- [ ] `/[companySlug]/marketing` landing (cards: Kontaklar / Kampanyalar)
- [ ] `/[companySlug]/marketing/contacts` — tablo (email, ad soyad, sipariş, son sipariş, durum, tag)
  - Search bar, status filter (active/unsubscribed/bounced), bulk select
- [ ] Sidebar nav item "Pazarlama" (Mail icon)
- [ ] "Geçmişten Senkronize Et" butonu — backfill endpoint'ini çağırır

## Faz 2 — Kampanya draftı + AI içerik üretimi

### Backend
- [ ] Prisma: `MarketingCampaign` tablosu (draft/scheduled/sending/sent/failed)
- [ ] CRUD: list, get, create draft, update, delete
- [ ] `POST /campaigns/:id/generate-content` — OpenAI ile subject + body üret
  - input: prompt + (opsiyonel) ürünler + tone
  - output: subject + HTML body + plain text fallback

### Frontend
- [ ] `/[companySlug]/marketing/campaigns` — kampanya listesi
- [ ] `/[companySlug]/marketing/campaigns/new` — wizard (ad / hedef kitle / içerik)
- [ ] `/[companySlug]/marketing/campaigns/[id]` — editor (subject, body, ürün ekle, audience)
- [ ] AI yardımı butonu (BalinaOS AI bridge — chroma-border) — generate-content
- [ ] Ürün ekleme modalı — products listesinden seç, embed snippet üret

## Faz 3 — Gönderim + planlama

### Backend
- [ ] Prisma: `MarketingSend` tablosu (campaign × contact × send durumu)
- [ ] `CampaignDispatcherService` — cron her dakika
  - status='scheduled' && scheduledAt <= now() ise dispatch'i başlat
  - Audience filter'a göre `MarketingSend` rows oluştur (queued)
  - Her send için `email.service.sendHtml` çağır → Resend
  - Status update + retry policy
- [ ] `POST /campaigns/:id/send-now` — anlık gönderim (scheduledAt = now())
- [ ] `POST /campaigns/:id/schedule` — scheduledAt belirle
- [ ] `POST /campaigns/:id/cancel` — sending'e başlamadıysa iptal
- [ ] Throttle: dakikada N mail (Resend free tier sınırı)

### Frontend
- [ ] Editor'de "Gönder" / "Planla" butonları
- [ ] Tarih+saat picker
- [ ] Kampanya detayında progress (sent/failed/opened/clicked)

## Faz 4 — Unsubscribe + webhook

### Backend
- [ ] `unsubscribeToken` field zaten `MarketingSend`'de (Faz 3)
- [ ] Public route (no auth):
  - `GET  /marketing/unsubscribe/:token` — kontak email + onay sayfası verisi
  - `POST /marketing/unsubscribe/:token` — kontak.isUnsubscribed = true
- [ ] Resend webhook controller — `email.delivered/opened/clicked/bounced/complained`
  - MarketingSend.providerMessageId ile eşle
  - bounced/complained → MarketingContact.status güncelle

### Frontend (public, auth dışı)
- [ ] `/unsubscribe/[token]` — beyaz card "Mailing servisinden çıkmak ister misiniz?"
  + onayla butonu

## Faz 5 — Email template + ürün embed

### Backend / Shared
- [ ] `marketing-email-template.ts` — body HTML wrapper (header logo + footer
  + unsubscribe link injection)
- [ ] Render fonksiyonu: campaign.bodyHtml + recipient.send.unsubscribeToken
  → final HTML
- [ ] Ürün embed render — `{{product:productId}}` placeholder'larını
  ürün kartına (görsel + ad + fiyat + link) çevirir

### Frontend
- [ ] Editor'de ürün eklenince inline preview
- [ ] Preview butonu — final HTML'i iframe içinde göster

## Faz 6 — Polish + İYS uyumu

- [ ] Default unsubscribe link her mail'in footer'ında
- [ ] İYS (Türkiye E-Posta İzin Sistemi) uyarı banner'ı admin sayfada
  — kullanıcı "ticari elektronik ileti" izni olmadan göndermeye çalışırsa uyar
- [ ] Test send (yalnızca admin emaili)
- [ ] Kampanya raporu (CSV export)
- [ ] Bot/spam koruma — unsubscribe page'inde captcha veya rate limit
