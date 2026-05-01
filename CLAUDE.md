# BalinaApp Frontend

Çok mağazalı WooCommerce analitik dashboard'u (Türkçe arayüz). Multi-tenant SaaS.

## Teknoloji Yığını

- **Framework:** Next.js 16.1.2 (App Router) + React 19.2 + TypeScript 5 (strict)
- **State:** Zustand 5 (persist) + TanStack Query 5
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4 + lucide-react
- **Form:** react-hook-form + zod (`@hookform/resolvers`)
- **Charts:** recharts
- **HTTP:** axios (interceptor + auto token refresh)
- **Test:** Jest + Testing Library + jsdom
- **Diğer:** next-themes (dark mode), sonner (toast), date-fns, Inter font
- **Path alias:** `@/*` → `./src/*`

## Komutlar

```
npm run dev           # next dev
npm run build         # next build
npm run lint          # eslint
npm test              # jest
npm run test:watch
npm run test:coverage
```

API base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:3003/api`).

## Mimari

### Route Yapısı (App Router groups)

- `src/app/(auth)/` — login, register, verify-email, forgot-password, reset-password, setup-company
- `src/app/(dashboard)/[companySlug]/` — şirket-scoped sayfalar:
  - `page.tsx` (dashboard), `stores/`, `inventory/` (+ `[productId]/`), `product-mappings/`, `orders/`, `payments/`, `reports/`, `refunds/`, `pricing/`, `notifications/`, `settings/` (+ profile, team, api, notifications, company)

### Multi-tenancy

URL-driven: `/[companySlug]/...`. Tüm dashboard sayfaları slug üzerinden çalışır. `currentCompany` ve `companies` listesi `companyStore`'da; user'ın `currentCompanyId`'si auth store'da tutulur ve slug yönlendirmesi buna göre yapılır.

### Auth Akışı

- `AuthGuard` (`src/components/providers/AuthGuard.tsx`) sıralı yönetiyor:
  1. Hydration bekle
  2. `accessToken` varsa `checkAuth()` çağır
  3. Authenticated ise `fetchCompanies()`
  4. Koşullu redirect: company yoksa `/setup-company`, varsa ilk slug'a, public path'lerdeyse dashboard'a
- Public paths: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- Company setup paths: `/setup-company`, `/invite`
- Token storage: Zustand persist `auth-storage` (localStorage) — sadece `accessToken` + `refreshToken` partialize edilir
- Axios interceptor (`src/services/api.ts`) 401'de otomatik refresh + retry; başarısızsa token'ları temizler, AuthGuard redirect eder
- Email doğrulama akışı destekleniyor (`requiresVerification` flag)

### Yetki / Roller

`OWNER`, `ADMIN`, `MEMBER`, `STOCKIST`. Sidebar nav itemleri rol bazlı filtreleniyor (`src/components/layout/app-sidebar.tsx`). `RoleGuard` provider mevcut.

### State (Zustand stores, `src/stores/`)

`authStore`, `companyStore`, `storeStore`, `inventoryStore`, `orderStore`, `refundStore`, `profitStore`, `productMappingStore`, `paymentStore`, `pricingStore`, `apiKeyStore`, `notificationStore`. Toplam ~3.4k LOC.

### Pricing / Feature-gating

`src/components/pricing/`: `FeatureGate`, `UpgradePrompt`, `UpgradeModal`, `StoreLimitModal`, `UsageWarning`, `PlanBadge`, `ProBadge`. Dashboard layout (`src/app/(dashboard)/layout.tsx`) usage banner'ı render ediyor; mağaza limiti plana bağlı. `pricingStore.isPricingEnabled` flag'i sidebar'da Planlar item'ını koşullu gösteriyor.

### Bileşenler

- `src/components/ui/` — shadcn primitives (40+ dosya)
- `src/components/layout/` — `app-sidebar`, `nav-main`, `nav-secondary`, `nav-user`, `team-switcher` (yeni); `Header.tsx`, `Sidebar.tsx` (eski — kullanım kontrol edilmeli)
- `src/components/providers/` — `QueryProvider`, `AuthGuard`, `RoleGuard`, `CompanyProvider`
- `src/components/inventory/` — `EditableStockCell`, `EditablePriceCell`
- `src/components/auth-form.tsx` — paylaşılan auth formu

## Bilinen Sorunlar / Dikkat Edilmesi Gerekenler

1. **Şişkin sayfa dosyaları:** `stores/page.tsx` 1279, `orders/page.tsx` 993, `product-mappings/page.tsx` 758, `refunds/page.tsx` 580, `reports/page.tsx` 569 satır — bölünmeye değer.
2. **Test boşluğu:** Sadece `stores/profitStore.test.ts` var (1 test / 98 kaynak dosya). Jest hazır ama kullanılmıyor.
3. **Token storage XSS riski:** `localStorage` + manuel JSON parse (`src/services/api.ts:6-52`). Backend uygunsa httpOnly cookie'ye geçiş düşünülebilir; `withCredentials: true` zaten set edilmiş.
4. **Refresh logic duplicate:** `api.ts` interceptor + `authStore.refreshTokens` ayrı yerlerde — drift riski.
5. **`next.config.ts` image remotePatterns `**` ile her host'a açık** — proxy abuse vektörü.
6. **Eski layout bileşenleri:** `Header.tsx`, `Sidebar.tsx` yeni `app-sidebar` ile birlikte duruyor; kullanım yoksa silinmeli.
7. **`profitStore` orphan olabilir:** 391 satır test var ama dedicated sayfası yok — kullanım yerleri doğrulanmalı.
8. **README boilerplate** — create-next-app'ten kalma, proje açıklaması yok.

## Proje Konvansiyonları

- UI metinleri Türkçe. Hata mesajları Türkçe.
- HTML lang `tr`.
- Server bileşeni varsayılan; `'use client'` direktifi gerektiğinde.
- Form validation zod schema + react-hook-form pattern'i.
- API çağrıları store action'ları içinden (`api.ts` instance'ı kullanılarak).
