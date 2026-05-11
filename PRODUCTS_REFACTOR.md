# Products Sayfası Refactor — Linear-vari UX

> **Figma Implement (2026-05-11):** Tasarım uyarlandı. Stage 6'da eklenen `vatRate` + `labels` schema rollback edildi (Figma'da bu kolonlar yok). Yeni tab strip + saved-tab dropdown (Adı Değiştir / Çoğalt / Sil) + chip-style sortable column header + card-style satırlar + status chip (✓ Aktif / ○ Pasif, ✓ Eşleştirildi / ○ Eşleştirme yok). Detay: `F0..F4` aşağıda.

## Figma Implement — F0..F4

- [x] F0 — Schema rollback: `vatRate` + `labels` kolonları silindi (`20260511100000_remove_product_vat_labels`); DTO/service/controller/frontend Product tipi temizlendi.
- [x] F1 — Tab strip: "Tüm Ürünler" + saved tabs (dark-filled active chip) + "+" icon button + filter icon at far right (slot=rightAction).
- [x] F2 — Saved tab dropdown menü: chevron-down → Dropdown.Menu (Adı Değiştir / Çoğalt / Sil). Eski hover-X/pencil kaldırıldı.
- [x] F3 — Column header chip-style sortable: aktif sort = `bg-foreground text-background` filled chip + arrow-down (asc/desc rotate); pasif = düz `text-foreground/60`.
- [x] F4 — Row card redesign: grid layout `[24px_40px_1fr_120px_140px_120px_140px_100px]` (checkbox + image + name + sales + purchase + stores + mapping + status). Stok / Satılabilir Stok / KDV / Etiketler kolonları kaldırıldı. Yeni helper component'ler: `PriceChip` (dark filled), `StatusChip` (check/dashed variantları), `SortHeaderButton`.



**Hedef:** Mevcut filter bar (Aktif/Marka/Stok/KDV/Bağlı/İsim/SKU + Filtrele/Temizle) → tek bir filter icon + popover. Aktif filtreler chip olarak. Filtreler kaydedilebilir → sekme. Tablo hücreleri tıklayınca inline popover ile düzenlenebilir.

**Referans dosyalar:**
- Frontend page: `src/app/(dashboard)/[companySlug]/products/page.tsx` (833 LOC)
- Frontend store: `src/stores/inventoryStore.ts`
- Frontend service: `src/services/api.ts`
- Backend: `/Users/melihozdemir/Desktop/balinaapp/backend` (NestJS + Prisma + PostgreSQL)
- Backend inventory module: `backend/src/modules/inventory/{controller,service,module}.ts`
- Backend Prisma: `backend/prisma/schema.prisma` → `model Product` (line 340)

**Backend mevcut endpoint'ler (Inventory):**
- `GET    company/:companyId/inventory/products` — list with filters
- `PATCH  company/:companyId/inventory/products/:productId/stock`
- `PATCH  company/:companyId/inventory/products/:productId/purchase-price`
- `PATCH  company/:companyId/inventory/variations/:variationId/{stock,purchase-price}`
- `POST   company/:companyId/inventory/bulk-update`

**Eksik backend (yeni):**
- `PATCH  .../products/:productId` — name + isActive + vatRate + labels
- `GET    company/:companyId/saved-filters?context=products`
- `POST   company/:companyId/saved-filters`
- `PATCH  company/:companyId/saved-filters/:id`
- `DELETE company/:companyId/saved-filters/:id`

**Schema migration (yeni alanlar):**
- `Product.vatRate Int?`  (0/8/10/20)
- `Product.labels String[]`  (Postgres array; ya da ayrı `Label` modeli — şimdilik array tercih)
- yeni model `SavedFilter { id, companyId, userId, context, name, payload Json, createdAt, updatedAt }`

---

## Stage 1 — Filter popover UI (frontend, backend dokunulmaz)

- [x] 1.1 `<FilterPopover>` komponenti: filter icon button → tıklayınca kategori listesi (Aktif, Marka, Satılabilir Stok, KDV, Bağlı, İsim, SKU)
- [x] 1.2 Her kategoriye hover/click → submenu (radio/checkbox/text input)
- [x] 1.3 `<ActiveFilterChips>` bar: seçili filtreler chip olarak; X ile kaldır
- [x] 1.4 Products page'i bağla: mevcut state'leri popover ile yönet, eski filtre bar gizlensin
- [ ] 1.5 Klavye desteği (Esc kapat, F shortcut popover'ı aç) _(Dropdown ESC zaten kapatıyor; F shortcut Stage 8'de eklenecek)_
- [x] 1.6 Typecheck + lint temiz

## Stage 2 — Saved filter tabs UI (frontend, in-memory)

- [x] 2.1 `<SavedFilterTabs>`: üst satırda "Tümü" + kaydedilmiş set'ler; aktif tab vurgu
- [x] 2.2 Active chip bar'da "Save" butonu → isim sor → in-memory'ye kaydet (Modal name prompt)
- [x] 2.3 Tab tıklayınca filtre state'i o set'e geçer
- [x] 2.4 Tab üzerinde X ile sil; rename (kalem ikonu)
- [x] 2.5 LocalStorage'a yaz (Zustand persist, key: `saved-filters`)
- [x] 2.6 "Güncelle" / "Yeni olarak kaydet" — sekme dirty state'i

## Stage 3 — Backend: Saved Filters

- [x] 3.1 Prisma: `model SavedFilter` + migration `20260510140000_add_saved_filters`
- [x] 3.2 Module: `backend/src/modules/saved-filter/{controller,service,module}.ts`
- [x] 3.3 DTO + validation (`CreateSavedFilterDto`, `UpdateSavedFilterDto`)
- [x] 3.4 CRUD endpoints + `requireMember` access guard
- [x] 3.5 Swagger annotations (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`)
- [x] 3.6 Migration uygulandı; backend typecheck temiz

## Stage 4 — Frontend: Saved Filters API entegrasyonu

- [x] 4.1 `src/stores/savedFilterStore.ts` — backend CRUD (GET/POST/PATCH/DELETE)
- [x] 4.2 Tabs UI backend'e bağlandı; localStorage persist kaldırıldı
- [x] 4.3 Error state store'da; backend response state'i set ediyor (sade)
- [ ] 4.4 Optimistic update _(şimdilik sunucu-yetkili; smooth UX gerekirse Stage 8'de)_

## Stage 5 — Backend: Product PATCH (name + isActive)

- [x] 5.1 `PATCH .../products/:productId` endpoint
- [x] 5.2 `UpdateProductDto` — name?, isActive?, vatRate?, labels? (son ikisi Stage 6'ya kadar service'te ignore)
- [x] 5.3 `requireCompanyMember` + `assertNotLimitedRole` + product ownership check
- [x] 5.4 Swagger annotations

## Stage 6 — Backend: vatRate + labels schema

- [x] 6.1 Migration `20260511090000_add_product_vat_labels` — `vat_rate INT`, `labels TEXT[]`
- [x] 6.2 PATCH `updateProduct` artık vatRate + labels alanlarını set ediyor (trim + dedupe)
- [x] 6.3 Listing select + return shape'ine `vatRate`, `labels` eklendi
- [x] 6.4 Query filter desteği: `?vatRate=`, `?label=`, `?isActive=true|false`

## Stage 7 — Frontend: Inline cell editors

- [x] 7.1 `<EditableTextCell>` — Ürün Adı (Link + hover-pencil → inline edit toggle)
- [x] 7.2 `<EditableSelectCell>` — KDV (yeni kolon eklendi; %0/1/8/10/18/20)
- [x] 7.3 `<EditableTagsCell>` — Etiketler (knownTags auto-suggest + new tag input)
- [x] 7.4 `<EditableSwitchCell>` — Satış Durumu (Switch onChange → updateProduct)
- [x] 7.5 Entegrasyonlar — read-only (favicon listesi; multi-store schema'da yok)
- [x] 7.6 `inventoryStore.updateProduct(companyId, productId, patch)` — multi-field PATCH
- [x] 7.7 Optimistic update + snapshot rollback (toast.danger on failure)

## Stage 8 — Cleanup & polish

- [x] 8.1 Eski `FilterPill` / `BoundFilterPill` Stage 1'de page'den silindi
- [x] 8.2 "Filtrele" + "Temizle" CTA butonları Stage 1'de kaldırıldı (auto-apply useEffect)
- [ ] 8.3 Responsive: filter popover mobilde bottom sheet _(sonraki PR — global mobile pass)_
- [x] 8.4 Frontend + backend typecheck temiz; lint sadece pre-existing 4 sorun (EditablePriceCell setState-in-effect + inventoryStore'da 3 `error: any`)

---

## Notlar / Açık Konular

- **Marka filtresi:** backend `brand` alanı yok; mevcut UI placeholder. Bu sayfa kapsamında atlandı. (Sonraki refactor.)
- **Bağlı (multi-store):** backend tek storeId destekliyor; mevcut Bağlı filtresi UI'da multi-checkbox ama backend'e tek storeId gönderiyor. Aynı davranış korunacak.
- **Entegrasyonlar inline edit:** ürün → store atama mevcut şemada 1:1. Multi-store mapping `ProductMapping` modelinde ayrı kavram. Bu sayfada inline edit yok, sadece görüntü.
- **vatRate decimal mı integer mı?** Şimdilik Int (0/8/10/20). İleride decimal gerekirse migration.
- **Labels — array mı ayrı model mi?** İlk tur `String[]`. Şirket bazında etiket havuzu istenirse ayrı `Label` model'e geçilir.
