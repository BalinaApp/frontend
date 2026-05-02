# BalinaApp Frontend

Çok mağazalı WooCommerce analitik dashboard'u (Türkçe arayüz). Multi-tenant SaaS.

## Teknoloji Yığını

- **Framework:** Next.js 16.1.2 (App Router) + React 19.2 + TypeScript 5 (strict)
- **State:** Zustand 5 (persist) + TanStack Query 5
- **UI:** **HeroUI v3.0.3** + Tailwind CSS v4 + lucide-react
- **Form:** react-hook-form + zod
- **Charts:** recharts (raw, no wrapper)
- **HTTP:** axios (interceptor + auto token refresh)
- **Toast:** sonner
- **Date:** date-fns + @internationalized/date (HeroUI DateRangePicker için)
- **Test:** Jest + Testing Library + jsdom
- **Path alias:** `@/*` → `./src/*`

## HeroUI v3 Konvansiyonları

- **Provider yok:** v3'te `<HeroUIProvider>` gerekmiyor; sadece `@import "@heroui/styles"` yeterli.
- **Compound API:** `Card.Header`, `Card.Body`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Select.Trigger`, `Select.Popover`, vb. dot-notation ile erişilir; flat prop kullanma.
- **`onPress` not `onClick`:** Button ve interaktif elemanlar `onPress`/`onPressStart` kullanır.
- **`isDisabled` not `disabled`:** Boolean prop'lar `is*` prefix'iyle (`isDisabled`, `isPending`, `isSelected`, `isInvalid`, `isRequired`, `isReadOnly`).
- **`isIconOnly`:** Icon-only butonlar için ayrı prop; `aria-label` zorunlu.
- **`fullWidth`:** width=100% yerine; `className="w-full"` da çalışır ama bu daha temiz.
- **`slot="close"`:** Modal/AlertDialog footer'larda iptal butonu için modal'ı kapatır.
- **Form alan kompozisyonu:** `<TextField value onChange isRequired isDisabled><Label>...</Label><Input /><Description /><FieldError /></TextField>`
- **Tema:** light/dark `[data-theme='light|dark']` selector ile kontrol edilir (`.dark` class değil).
- **Renk tokenları:** `--accent`, `--accent-foreground`, `--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`, `--overlay`, `--border`, `--separator`, `--muted`, `--default`, `--success`, `--warning`, `--danger`. (eski `--primary`, `--secondary`, `--card`, `--popover` kullanılmıyor)

### Component Eşleştirmeleri (referans)

| Eski (shadcn/Radix) | Yeni (HeroUI v3) |
|---|---|
| Button | Button |
| Input + Label + Field | TextField + Label + Input |
| Select trigger/content/item | Select + Select.Trigger/Value/Indicator + Select.Popover + ListBox + ListBox.Item |
| Dialog | Modal (Backdrop/Container/Dialog/Header/Body/Footer) |
| AlertDialog | AlertDialog (with Icon status="danger\|warning\|success\|accent") |
| DropdownMenu | Dropdown + Dropdown.Trigger + Dropdown.Popover + Dropdown.Menu + Dropdown.Item |
| Switch checked/onCheckedChange | Switch isSelected/onChange + Switch.Control + Switch.Thumb |
| Checkbox | Checkbox isSelected/onChange |
| Tooltip | Tooltip + Tooltip.Content (delay=0 önerilir) |
| Tabs/TabsList/TabsTrigger/TabsContent | Tabs + Tabs.ListContainer + Tabs.List + Tabs.Tab + Tabs.Indicator + Tabs.Panel |
| Card/CardHeader/CardContent | Card + Card.Header/Title/Description + Card.Content + Card.Footer |
| Badge (status) | Chip variant="primary\|secondary\|tertiary\|soft" |
| Avatar/AvatarImage/AvatarFallback | Avatar + Avatar.Image + Avatar.Fallback |
| Alert/AlertDescription | Alert status="..." + Alert.Indicator + Alert.Content + Alert.Title/Description |
| Calendar + Popover (date range) | `@/components/date-range-input.tsx` (HeroUI DateRangePicker wrapper, JS Date in/out) |
| InputOTP/Group/Slot | InputOTP + InputOTP.Group + InputOTP.Slot + InputOTP.Separator |
| Sidebar | `src/components/layout/app-sidebar.tsx` (custom, HeroUI Dropdown + Avatar + Modal kullanır) |
| ChartContainer/ChartTooltip wrapper | recharts `ResponsiveContainer` + native `Tooltip` (inline custom render) |
| Sheet | (henüz kullanım yok; gerekirse HeroUI Drawer) |
| DataTable wrapper | plain `<table>` + Tailwind |
| cn(clsx + twMerge) | template literal `${a} ${b}` veya `[...].filter(Boolean).join(' ')` |

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

- `src/components/layout/app-sidebar.tsx` — TÜM sidebar (team-switcher + nav + user-menu, mobile drawer dahil) tek dosyada.
- `src/components/providers/` — `QueryProvider`, `AuthGuard`, `RoleGuard`, `CompanyProvider`
- `src/components/inventory/` — `EditableStockCell`, `EditablePriceCell`
- `src/components/auth-form.tsx` — paylaşılan login/register multi-step formu
- `src/components/date-range-input.tsx` — HeroUI DateRangePicker wrapper (JS Date in/out)
- `src/components/pricing/` — feature-gating UI

## Proje Konvansiyonları

- UI metinleri Türkçe. Hata mesajları Türkçe.
- HTML lang `tr`.
- Server bileşeni varsayılan; `'use client'` direktifi gerektiğinde.
- Form validation zod schema + react-hook-form pattern'i.
- API çağrıları store action'ları içinden (`api.ts` instance'ı kullanılarak).
- Toast: `import { toast } from 'sonner'` — sonner direkt kullanılır.
- **shadcn yok:** `src/components/ui/`, `components.json`, `src/lib/utils.ts` silindi. Tüm UI HeroUI v3 üzerinden gelir.

## Bilinen Sorunlar / Dikkat Edilmesi Gerekenler

1. **Test boşluğu:** Sadece `stores/profitStore.test.ts` var (1 test / 98 kaynak dosya). Jest hazır ama kullanılmıyor.
2. **Token storage XSS riski:** `localStorage` + manuel JSON parse (`src/services/api.ts:6-52`). Backend uygunsa httpOnly cookie'ye geçiş düşünülebilir; `withCredentials: true` zaten set edilmiş.
3. **Refresh logic duplicate:** `api.ts` interceptor + `authStore.refreshTokens` ayrı yerlerde — drift riski.
4. **`next.config.ts` image remotePatterns `**` ile her host'a açık** — proxy abuse vektörü.
5. **`profitStore` orphan olabilir:** 391 satır test var ama dedicated sayfası yok — kullanım yerleri doğrulanmalı.
