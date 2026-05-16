# BalinaApp Frontend

Çok mağazalı WooCommerce / marketplace analitik dashboard'u. Multi-tenant SaaS — şirket bazlı (slug) yönlendirme, Türkçe arayüz.

## Teknoloji Yığını

- **Framework:** Next.js 16.1.2 (App Router) + React 19.2 + TypeScript 5 (strict)
- **UI:** HeroUI v3.0.3 + Tailwind CSS v4 + lucide-react
- **State:** Zustand 5 (persist) + TanStack Query 5
- **Form:** react-hook-form + zod
- **HTTP:** axios (interceptor + otomatik token refresh)
- **Charts:** recharts
- **Toast:** sonner
- **Test:** Jest + Testing Library + jsdom
- **Path alias:** `@/*` → `./src/*`

## Başlangıç

```bash
npm install
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

### Ortam Değişkenleri

```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api
```

## Komutlar

```bash
npm run dev            # Geliştirme sunucusu
npm run build          # Production build
npm run start          # Production sunucu
npm run lint           # ESLint
npm test               # Jest
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage raporu
```

## Mimari

### Route Yapısı (App Router groups)

- `src/app/(auth)/` — `login`, `register`, `verify-email`, `forgot-password`, `reset-password`, `setup-company`, `invite`
- `src/app/(dashboard)/[companySlug]/` — şirket-scoped sayfalar:
  - `page.tsx` (dashboard), `stores/`, `products/` (+ `[productId]/`), `inventory/`, `product-mappings/`, `orders/`, `payments/`, `reports/`, `refunds/`, `pricing/`, `notifications/`, `ai-creator/`
  - `settings/` (+ `profile`, `team`, `api/keys`, `billing/{invoices,payment}`, `security`, `about`, `activity-log`, `theme`, `company`, `notifications`)
- `src/app/auth/google-callback/` — Google OAuth dönüş
- `src/app/integrations/woocommerce/return/` — WooCommerce OAuth dönüş

### Multi-tenancy

URL-driven: `/[companySlug]/...`. `currentCompany` ve `companies` listesi `companyStore`'da; user'ın `currentCompanyId`'si auth store'da tutulur ve slug yönlendirmesi buna göre yapılır.

### Auth Akışı

`AuthGuard` (`src/components/providers/AuthGuard.tsx`) sıralı yönetir:

1. Hydration bekle
2. `accessToken` varsa `checkAuth()` çağır
3. Authenticated ise `fetchCompanies()`
4. Koşullu redirect: company yoksa `/setup-company`, varsa ilk slug'a, public path'lerdeyse dashboard'a

- **Public paths:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- **Company setup paths:** `/setup-company`, `/invite`
- **Token storage:** Zustand persist `auth-storage` (localStorage) — sadece `accessToken` + `refreshToken` partialize edilir
- **Axios interceptor** (`src/services/api.ts`) 401'de otomatik refresh + retry; başarısızsa token'ları temizler, AuthGuard redirect eder
- Email doğrulama akışı (`requiresVerification` flag) destekli

### Yetki / Roller

`OWNER`, `ADMIN`, `MEMBER`/`STOCKIST`, `PRODUCT_UPLOADER`. Sidebar nav itemleri rol bazlı filtreleniyor (`src/components/layout/app-sidebar.tsx`). `RoleGuard` provider mevcut.

### State Yönetimi (Zustand, `src/stores/`)

20 store, ~5.6k LOC:

| Store | LOC | Konu |
|---|---|---|
| `aiStore` | 1076 | AI guided chat, FAL/Fashn.ai model katalog, generation history |
| `inventoryStore` | 553 | Ürün/varyasyon stok yönetimi |
| `orderStore` | 398 | Siparişler |
| `productMappingStore` | 386 | Multi-store SKU eşleştirme |
| `aiCreatorStore` | 302 | AI creator state |
| `invoiceIntegrationStore` | 282 | Paraşüt/BizimHesap invoice sync |
| `refundStore` | 276 | İadeler |
| `profitStore` | 255 | Kar/zarar hesaplama |
| `storeStore` | 212 | Marketplace mağazaları |
| `paymentStore` | 207 | Ödeme yönetimi |
| `companyStore` | 189 | Şirket listesi/seçimi |
| `pricingStore` | 178 | Plan, feature-gating, store limiti |
| `savedFilterStore` | 171 | Ürün filtreleri (backend-synced) |
| `apiKeyStore` | 168 | API anahtarı yönetimi |
| `authStore` | 165 | Login/token/checkAuth |
| `notificationStore` | 165 | Bildirimler |
| `auditLogStore` | 108 | Activity log |
| `themeStore` | 94 | Dark/light tema |
| `uiStore` | 89 | Sidebar/modal UI state |

### Service Katmanı

Tek dosya: `src/services/api.ts` — axios instance + interceptor + 401 refresh logic. Tüm endpoint çağrıları store action'ları içinden bu instance üzerinden yapılır.

### Component Organizasyonu (`src/components/`)

- `layout/app-sidebar.tsx` — TÜM sidebar (team-switcher + nav + user-menu, mobile drawer dahil) tek dosyada
- `providers/` — `QueryProvider`, `AuthGuard`, `RoleGuard`, `CompanyProvider`
- `ai/` — `ai-chat-drawer`, `ai-chat-fab`, `ai-chat-panel`, `guided-ai-chat-panel`, `ai-chat-history`, `ai-setup-modal`
- `inventory/` — `EditableStockCell`, `EditablePriceCell`
- `products/` — `FilterPopover`, `SavedFilterTabs`, `ActiveFilterChips`, `BulkActionsBar`
- `pricing/` — `FeatureGate`, `UpgradePrompt`, `UpgradeModal`, `StoreLimitModal`, `UsageWarning`, `PlanBadge`, `ProBadge`
- `audit/` — activity log UI
- `auth-form.tsx` — paylaşılan login/register multi-step formu
- `date-range-input.tsx` — HeroUI DateRangePicker wrapper (JS Date in/out)

## HeroUI v3 Konvansiyonları

- **Provider yok:** v3'te `<HeroUIProvider>` gerekmiyor; sadece `@import "@heroui/styles"` yeterli (`src/app/globals.css`).
- **Compound API:** `Card.Header`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Select.Trigger`, `Select.Popover`, vb. dot-notation.
- **`onPress` (not `onClick`)**, **`isDisabled` (not `disabled`)**, **`isIconOnly`** + `aria-label`.
- **Tema:** `[data-theme='light|dark']` selector (`.dark` class değil).
- **Renk tokenları:** `--accent`, `--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`, `--overlay`, `--border`, `--separator`, `--muted`, `--default`, `--success`, `--warning`, `--danger`.

Detaylı eşleştirme tablosu için bkz. [`CLAUDE.md`](./CLAUDE.md).

## Entegrasyonlar

8 marketplace: Shopify, WooCommerce, Trendyol, Hepsiburada, N11, ÇiçekSepeti, Amazon, PTT AVM. Stores sayfasında ortak akış: store test → kaydet → otomatik sync polling → SKU auto-matching → mapping listesi.

Muhasebe entegrasyonları: Paraşüt, BizimHesap, İşbaşı. Kargo: DHL, MNG, Hepsiburada, Paraşüt.

AI: FAL (video) + Fashn.ai (görsel) — `ai-creator/` sayfası ve guided chat panel.

İlgili dokümanlar:
- [`SHOPIFY-ENDPOINTS.md`](./SHOPIFY-ENDPOINTS.md) — Shopify entegrasyonu backend API referansı
- [`PRODUCTS_REFACTOR.md`](./PRODUCTS_REFACTOR.md) — Products sayfası redesign aşamaları

## Proje Konvansiyonları

- UI metinleri ve hata mesajları **Türkçe**. HTML `lang="tr"`.
- Server bileşeni varsayılan; `'use client'` direktifi gerektiğinde.
- Form validasyonu: zod schema + react-hook-form.
- API çağrıları store action'ları içinde (`api.ts` instance'ı ile).
- Toast: `import { toast } from 'sonner'`.
- **shadcn yok:** Tüm UI HeroUI v3 üzerinden gelir.

## Bilinen Sorunlar

1. **Test boşluğu:** Sadece `stores/profitStore.test.ts` var (1 test / 97 kaynak dosya).
2. **Token storage XSS riski:** `localStorage` + manuel JSON parse (`src/services/api.ts`). Backend uygunsa httpOnly cookie'ye geçiş düşünülebilir; `withCredentials: true` zaten set edilmiş.
3. **Refresh logic duplicate:** `api.ts` interceptor + `authStore.refreshTokens` ayrı yerlerde — drift riski.
4. **`next.config.ts` image remotePatterns `**` ile her host'a açık** — proxy abuse vektörü.

## İlgili

- Backend: `../backend/`
