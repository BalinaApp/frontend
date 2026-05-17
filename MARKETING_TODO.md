# Marketing Feature TODO

Email marketing modülü — sipariş veren müşterilerin email/isim bilgilerini
toplayıp, AI destekli kampanyalar gönderme. Mail provider: **Resend**
(zaten kurulu — `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env'leri mevcut).

> **Durum:** Faz 1-5 tamamlandı. Faz 6 (İYS uyumu, raporlama, CSV import)
> bir sonraki iterasyona kaldı.

## Mimari özet

- **MarketingContact**: company başına unique email; sipariş sync'inde
  otomatik upsert.
- **MarketingCampaign**: draft → scheduled → sending → sent.
- **MarketingSend**: kampanya × kontak — per-recipient durum, açma/tıklama
  tracking, unsubscribe token (her gönderim için ayrı).
- **Public unsubscribe**: token tabanlı `/unsubscribe/:token`.
- **Resend webhook**: bounce/complaint/open/click eventleri için.

## Faz 1 — Kontak toplama altyapısı ✅

### Backend
- [x] Prisma migration: `MarketingContact` tablosu
- [x] `Company.marketingContacts` back-relation
- [x] `MarketingModule` iskeleti (controller + service)
- [x] `MarketingContactService.upsertFromOrder(...)` — `maybeNotifyNewOrder`
      içine bağlı; tüm marketplace sync'leri otomatik çağırıyor
- [x] `MarketingContactService.backfillFromOrders(companyId)` — idempotent
- [x] Endpoints: GET/POST/PATCH/DELETE + `/unsubscribe` + `/backfill`
- [x] AppModule kaydı

### Frontend
- [x] `marketingStore` (Zustand)
- [x] `/[companySlug]/marketing/contacts` — products-page parity
      (saved filter tabs, FilterPopover, ActiveFilterChips, sortable headers,
      bulk select + bulk actions bar, AlertDialog confirmations)
- [x] Sidebar nav item "Pazarlama" (Envelope icon, OWNER/ADMIN)
- [x] İlk açılışta auto-backfill (silent, contacts.length === 0 olduğunda)

## Faz 2 — Kampanya draftı + AI içerik üretimi ✅

### Backend
- [x] Prisma: `MarketingCampaign` tablosu (draft/scheduled/sending/sent/...)
- [x] CRUD: list, get, create draft, update, delete (`MarketingCampaignService`)
- [x] `POST /campaigns/:id/generate-content` — OpenAI ile subject + bodyHtml
      üret (JSON-strict prompt; ürün id'leri context olarak iletilir,
      `{{product:id}}` placeholder'larıyla)

### Frontend
- [x] `marketingCampaignStore`
- [x] `/marketing/campaigns` — kampanya listesi (status badge, gönderim
      oranı, sıralanabilir kolonlar)
- [x] `/marketing/campaigns/[id]` — editor (ad / konu / body / AI brief +
      tone / ürün id listesi); audience preview + send/schedule sidebar
- [x] AI Üret butonu — chroma-border + BalinaOsMark
- [x] `/marketing` → `/marketing/contacts` redirect kaldırıldı;
      yerine sub-tab nav layout (Kontaklar / Kampanyalar)

## Faz 3 — Gönderim + planlama ✅

### Backend
- [x] Prisma: `MarketingSend` (per-recipient, unsubscribe_token unique)
- [x] `MarketingCampaignDispatcherService` — `@Cron(EVERY_MINUTE)`:
      - scheduled & due → snapshot recipients + → sending
      - sending → queued sends'i Resend'e gönder (MAX_PER_TICK = 100)
      - tüm sends terminal'e ulaştıysa → sent
- [x] `POST /campaigns/:id/send-now` — anlık snapshot + status=sending
- [x] `POST /campaigns/:id/schedule` — scheduledAt + status=scheduled
- [x] `POST /campaigns/:id/cancel` — kalan queued sends → failed,
      status=cancelled
- [x] Throttle: dakikada 100 mail (Resend free tier güvenli sınır)

### Frontend
- [x] Editor sidebar: "Hemen gönder" + tarih/saat picker + "Planla"
- [x] Sent kampanya için stat grid (sentCount, openedCount, clickedCount,
      failedCount)
- [x] Liste sayfasında progress (sentCount / recipientCount + openRate)

## Faz 4 — Unsubscribe + webhook ✅

### Backend
- [x] `MarketingSend.unsubscribeToken` (cuid, unique, gönderim başına ayrı)
- [x] `MarketingPublicController` (auth dışı, `@Public()`):
      - `GET  /marketing/unsubscribe/:token` — kontak bilgileri
      - `POST /marketing/unsubscribe/:token` — onay → `isUnsubscribed=true`
- [x] Resend webhook controller — `POST /marketing/webhooks/resend`:
      - `email.opened` → openedAt + campaign.openedCount++
      - `email.clicked` → clickedAt + campaign.clickedCount++
      - `email.bounced` → status=bounced; contact.status=bounced (kalıcı)
      - `email.complained` → status=complained + contact.isUnsubscribed
      - HMAC-SHA256 imza doğrulama (`RESEND_WEBHOOK_SECRET`)
- [x] `List-Unsubscribe` + `List-Unsubscribe-Post` headers (Gmail
      bir-tıkla unsubscribe için)

### Frontend
- [x] `/unsubscribe/[token]` public sayfa — "Mailing servisinden çıkmak
      ister misiniz?" confirm UI + done state
- [x] AuthGuard publicPaths listesine `/unsubscribe` eklendi

## Faz 5 — Email template + ürün embed ✅

- [x] `marketing-email-template.ts` — branded HTML wrapper (header
      brand adı + body + footer unsubscribe link)
- [x] `{{firstName}}`, `{{lastName}}`, `{{name}}`, `{{email}}` placeholder
      substitution
- [x] `{{product:productId}}` placeholder — inline ürün kartı render
      (görsel + ad + fiyat + storefront link)
- [x] Plain text fallback (renderCampaignText)
- [x] Preview endpoint + iframe editor önizleme
- [x] Test send rendered HTML response (token = "preview" için dummy
      unsubscribe URL)

## Faz 6 — Polish + İYS uyumu (gelecek iterasyon)

- [ ] İYS (Türkiye E-Posta İzin Sistemi) uyarı banner'ı admin sayfada
- [ ] CSV import flow + source='import'
- [ ] Manual contact add UI (POST endpoint var, form yok)
- [ ] Test send'i gerçekten Resend ile yolla (şu an HTML döner)
- [ ] CSV export raporu
- [ ] Bot/spam koruma — unsubscribe page'inde rate limit
- [ ] Audience filter UI: store/tag/lastOrderAfter editör paneli
      (şu an manuel JSON güncellenebilir)
- [ ] Product picker UI — id girmek yerine ürün listesinden seçim

## Env değişkenleri (backend)

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=marketing@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_...  # opsiyonel; boş ise imza atlanır
APP_PUBLIC_URL=https://app.balinaos.com   # unsubscribe link base
```

## Deploy adımları

1. `cd backend && npx prisma migrate deploy` — yeni iki tablo + relation
2. Backend env'lerini güncelle (`RESEND_WEBHOOK_SECRET`, `APP_PUBLIC_URL`)
3. Resend dashboard → Webhooks → endpoint olarak
   `https://api.yourdomain.com/api/marketing/webhooks/resend` ekle
4. Resend dashboard → Domains → kendi domain'ini doğrula (SPF + DKIM +
   DMARC); aksi halde free `onboarding@resend.dev` kullanılır
5. Cron için ek bir worker yok — `@nestjs/schedule` mevcut Nest sürecinde
   çalışıyor; tek-instance deploy yeterli (multi-instance için ileride
   distributed lock gerekecek)
