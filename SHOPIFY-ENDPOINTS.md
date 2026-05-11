# 🛒 Shopify Mağaza Bağlama — Backend API Referansı

Bu dosya frontend ekibi için Shopify entegrasyonunun tüm backend endpoint'lerini listeler.
Mağaza bağlama, sync, mapping ve stok yönetimi akışlarını kapsar.

**Base URL (production):** `https://api.kluestudio.cloud`
**Base URL (development):** `http://localhost:3001`
**Auth:** Tüm endpoint'lere `Authorization: Bearer <JWT>` header gerekir (auth/webhook hariç).

---

## İçindekiler

1. [Auth (Magic Link)](#1-auth-magic-link)
2. [Provider Listesi (Form Doldurma)](#2-provider-listesi-form-doldurma)
3. [Bağlantı Testi (Mağaza Kaydetmeden)](#3-bağlantı-testi-mağaza-kaydetmeden)
4. [Mağazayı Kaydet](#4-mağazayı-kaydet)
5. [Sync Tetikle (Manuel)](#5-sync-tetikle-manuel)
6. [Mağaza Listesi](#6-mağaza-listesi)
7. [Mağaza Detay](#7-mağaza-detay)
8. [Mağaza Güncelle](#8-mağaza-güncelle)
9. [Mağaza Sil](#9-mağaza-sil)
10. [Otomatik SKU Eşleştirme](#10-otomatik-sku-eşleştirme)
11. [Mapping Önerileri (Manuel Onay)](#11-mapping-önerileri-manuel-onay)
12. [Manuel Mapping Oluştur](#12-manuel-mapping-oluştur)
13. [Mapping Listesi](#13-mapping-listesi)
14. [Mapping Sil](#14-mapping-sil)
15. [Webhook Endpoint'leri (Bilgi)](#15-webhook-endpointleri-bilgi)
16. [Frontend UX Akışı](#16-frontend-ux-akışı)
17. [Önemli Notlar](#17-önemli-notlar)

---

## 1) Auth (Magic Link)

```
POST /api/auth/request-code
Body: { "email": "user@example.com" }
→ Maile 6 haneli kod gönderir.

POST /api/auth/verify-code
Body: { "email": "user@example.com", "code": "123456" }
→ { user, accessToken, refreshToken }

POST /api/auth/refresh
Body: { "refreshToken": "..." }
→ { accessToken }

GET /api/auth/me
→ { user }
```

---

## 2) Provider Listesi (Form Doldurma)

Mağaza ekleme formundaki "Pazaryeri seç" dropdown'ı için.

**`GET /api/company/:companyId/stores/marketplace/providers`**

**Response:**
```json
[
  { "platform": "WOOCOMMERCE",  "displayName": "WooCommerce" },
  { "platform": "TRENDYOL",     "displayName": "Trendyol" },
  { "platform": "HEPSIBURADA",  "displayName": "Hepsiburada" },
  { "platform": "N11",          "displayName": "N11" },
  { "platform": "CICEKSEPETI",  "displayName": "ÇiçekSepeti" },
  { "platform": "AMAZON",       "displayName": "Amazon" },
  { "platform": "PTTAVM",       "displayName": "PTT AVM" },
  { "platform": "SHOPIFY",      "displayName": "Shopify" }
]
```

> Frontend platform seçimine göre form alanlarını çizer:
> - **SHOPIFY** seçilirse: `shopDomain` + `accessToken` alanları göster.
> - **WOOCOMMERCE** seçilirse: `url` + `consumerKey` + `consumerSecret`.
> - Diğer pazaryerleri için her birinin kendi credential şeması var.

---

## 3) Bağlantı Testi (Mağaza Kaydetmeden)

Form submit edilmeden önce Shopify ile bağlantıyı doğrula. TRY currency check de burada yapılır.

**`POST /api/company/:companyId/stores/marketplace/SHOPIFY/test`**

**Body:**
```json
{
  "credentials": {
    "shopDomain": "mystore.myshopify.com",
    "accessToken": "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Başarılı (HTTP 200):**
```json
{
  "success": true,
  "meta": {
    "shopName": "mystore",
    "currency": "TRY",
    "domain": "mystore.myshopify.com",
    "country": "TR"
  }
}
```

**Hata örnekleri:**
```json
// Para birimi yanlış
{
  "success": false,
  "error": "Mağaza para birimi USD. BalinaOS yalnızca TRY mağazalarını destekliyor."
}

// Token yanlış
{
  "success": false,
  "error": "Shopify kimlik doğrulama başarısız (401). Admin API access token doğru ve scope yetkileri verilmiş mi kontrol edin."
}

// Domain formatı yanlış
{
  "success": false,
  "error": "Geçersiz Shopify domain: \"xxx\". Beklenen format: mystore.myshopify.com"
}

// Scope eksik
{
  "success": false,
  "error": "Shopify isteği reddetti (403). Custom App scope yetkileri eksik (read_products, write_inventory vb.)."
}
```

> Frontend `success: false` durumunda `error` mesajını kullanıcıya göster. Test başarısız ise "Mağazayı Kaydet" butonu disabled olsun.

---

## 4) Mağazayı Kaydet

Bağlantı testi başarılı olunca.

**`POST /api/company/:companyId/stores/marketplace/SHOPIFY`**

**Body:**
```json
{
  "name": "Mağazamın Adı",
  "credentials": {
    "shopDomain": "mystore.myshopify.com",
    "accessToken": "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Başarılı (HTTP 201):**
```json
{
  "id": "cmotxuted003qng01pq09slr4",
  "name": "Mağazamın Adı",
  "platform": "SHOPIFY",
  "url": "https://example.com",
  "status": "ACTIVE",
  "externalId": null,
  "createdAt": "2026-05-06T10:52:50.389Z"
}
```

> `id`'yi frontend store list'inde sakla, sync/sil için lazım.
> `url: "https://example.com"` cosmetic placeholder; ileride `https://{shopDomain}` olarak düzeltilecek.

**Hata kodları:**
- `403` — Plan store limit aşıldı (FREE plan: 2 mağaza)
- `400` — Bağlantı kurulamadı / TRY değil

---

## 5) Sync Tetikle (Manuel)

Mağaza eklendikten sonra ilk sync veya sonradan "Sync Now" butonu.

**`POST /api/company/:companyId/stores/:storeId/sync`**

**Response (anında):**
```json
{
  "success": true,
  "message": "Senkronizasyon başlatıldı",
  "started": true
}
```

> Sync **arka planda** çalışır. Frontend "syncing..." göstermek için `GET /stores/:storeId` endpoint'ini polling yapabilir (her 3 saniyede bir).
>
> Sync aşamaları (`syncStep` field):
> - `connection` → bağlantı testi
> - `products` → ürünler çekiliyor
> - `variations` → varyantlar
> - `orders` → siparişler
> - `saving` → finalize
> - `null` (+ `lastSyncAt` set) → tamamlandı

---

## 6) Mağaza Listesi

**`GET /api/company/:companyId/stores`**

**Response:**
```json
[
  {
    "id": "cmotxuted003qng01pq09slr4",
    "name": "BalinaOS Shopify",
    "platform": "SHOPIFY",
    "url": "https://example.com",
    "status": "ACTIVE",
    "isSyncing": false,
    "syncStep": null,
    "syncProductsCount": 2,
    "syncVariationsCount": 8,
    "syncOrdersCount": 5,
    "lastSyncAt": "2026-05-06T10:55:34.925Z",
    "syncError": null,
    "createdAt": "2026-05-06T10:52:50.389Z",
    "updatedAt": "2026-05-06T10:55:34.925Z"
  }
]
```

---

## 7) Mağaza Detay

**`GET /api/company/:companyId/stores/:storeId`**

> Yukarıdakiyle aynı şema. Sync polling için ideal — `isSyncing`, `syncStep`, counts, `syncError`.

---

## 8) Mağaza Güncelle

**`PUT /api/company/:companyId/stores/:storeId`**

**Body:**
```json
{ "name": "Yeni İsim" }
```

> Credentials güncellemek için **mağaza sil + yeniden ekle** akışı önerilir (token rotasyonu için temiz).

---

## 9) Mağaza Sil

**`DELETE /api/company/:companyId/stores/:storeId`**

> **Cascade:** Mağazaya bağlı tüm ürün/sipariş/varyant/refund/integration silinir. Mapping'lerden de çıkar.

---

## 10) Otomatik SKU Eşleştirme

Tüm SKU eşleşen ürünleri otomatik mapping olarak kurar + arka planda stok sync'ler.

**`POST /api/company/:companyId/products/mappings/auto`**

**Body:**
```json
{ "storeIds": ["wc-store-id", "shopify-store-id"] }
```

**Response:**
```json
{ "created": 1, "skipped": 0 }
```

> Frontend "Otomatik Eşleştir" butonu için. `storeIds` opsiyonel — verilmezse tüm mağazalar arasında çalışır.
> Mapping'ler oluşturulduktan sonra **arka planda** ilk source stoğu target'lara push'lanır.

---

## 11) Mapping Önerileri (Manuel Onay)

Otomatik eşleştirme yerine kullanıcı tek tek onaylasın istiyorsan.

**`GET /api/company/:companyId/products/mappings/suggestions`**

**Response:**
```json
[
  {
    "masterSku": "ml123",
    "suggestionKey": "sku:ml123",
    "products": [
      {
        "id": "...",
        "storeId": "...",
        "storeName": "Kozaeşarp WC",
        "name": "Deneme",
        "sku": "ML123",
        "stockQuantity": 10,
        "price": 250
      },
      {
        "id": "...",
        "storeId": "...",
        "storeName": "BalinaOS Shopify",
        "name": "Deneme Yeni",
        "sku": "ML123",
        "stockQuantity": 10,
        "price": 250
      }
    ],
    "storeCount": 2,
    "totalStock": 20,
    "realStock": 10
  }
]
```

> Frontend bunu liste olarak göster, her satırda "Bağla" / "Reddet" butonu olsun.

### Öneriyi Reddet

**`POST /api/company/:companyId/products/mappings/suggestions/dismiss`**

```json
{ "suggestionKey": "sku:ml123" }
```

### Reddedilen Öneriyi Geri Getir

**`DELETE /api/company/:companyId/products/mappings/suggestions/dismiss`**

```json
{ "suggestionKey": "sku:ml123" }
```

---

## 12) Manuel Mapping Oluştur

**`POST /api/company/:companyId/products/mappings`**

**Body:**
```json
{
  "masterSku": "ML123",
  "name": "Deneme - ML123",
  "productIds": ["wc-product-id", "shopify-product-id"]
}
```

> İlk `productId` **source** olur (kaynak stok). Sonrakiler target.
> En az 2 farklı mağazadan ürün gerekir.

**Response:** Tam mapping objesi (items + store + product detayları ile).

---

## 13) Mapping Listesi

**`GET /api/company/:companyId/products/mappings`**

**Response:**
```json
[
  {
    "id": "cmottnc6d0003oqv2l2371brp",
    "masterSku": "ml123",
    "name": "Deneme - ML123",
    "items": [
      {
        "id": "...",
        "storeId": "...",
        "storeName": "Kozaeşarp WC",
        "productId": "...",
        "productName": "Deneme",
        "sku": "ML123",
        "stockQuantity": 10,
        "price": 250,
        "isSource": true
      },
      {
        "id": "...",
        "storeId": "...",
        "storeName": "BalinaOS Shopify",
        "productId": "...",
        "productName": "Deneme Yeni",
        "sku": "ML123",
        "stockQuantity": 10,
        "price": 250,
        "isSource": false
      }
    ],
    "totalStock": 20,
    "realStock": 10,
    "storeCount": 2,
    "createdAt": "2026-05-06T11:00:00.000Z",
    "updatedAt": "2026-05-06T11:00:00.000Z"
  }
]
```

---

## 14) Mapping Sil

**`DELETE /api/company/:companyId/products/mappings/:id`**

**Response:** HTTP 204 (no content)

---

## 15) Webhook Endpoint'leri (Bilgi)

> **Frontend bunları çağırmaz.** Sadece Shopify tarafından çağrılır.
> Bilgi için: Shopify Admin'de bu URL'lerle webhook subscription kuruldu.

```
POST /api/webhook/shopify/orders      (orders/create, orders/updated, orders/cancelled)
POST /api/webhook/shopify/inventory   (inventory_levels/update)
POST /api/webhook/shopify/products    (products/update, products/delete)
POST /api/webhook/shopify/refunds     (refunds/create)
```

Her webhook HMAC SHA-256 ile doğrulanır. Geçersiz imza → 401.

---

## 16) Frontend UX Akışı

### Önerilen Mağaza Bağlama Wizard'ı

```
Adım 1 — Pazaryeri Seç
  GET /marketplace/providers
  → Dropdown'da Shopify seç

Adım 2 — Bilgileri Gir
  Form alanları (Shopify için):
    - Mağaza Adı: [____________]    (panel görünüm adı)
    - Shop Domain: [_____.myshopify.com]
    - Access Token: [shpat_____]

Adım 3 — Bağlantıyı Test Et
  POST /marketplace/SHOPIFY/test
  ✅ Başarılı: "Bağlandı: mystore (TRY)" rozeti göster
  ❌ Hata: error mesajını kullanıcıya göster, "Kaydet" butonu disabled

Adım 4 — Kaydet
  POST /marketplace/SHOPIFY
  → store.id al, list'e ekle

Adım 5 — Otomatik Sync Başlat
  POST /stores/:id/sync
  → Polling: GET /stores/:id her 3sn
    Progress bar: syncStep'e göre %0 → %25 → %50 → %75 → %100
    syncProductsCount + syncOrdersCount canlı güncelle
  → lastSyncAt set olunca "Tamamlandı" göster

Adım 6 — Otomatik Eşleştirme Öner
  Eğer kullanıcının başka mağazası varsa:
  GET /products/mappings/suggestions → öneri sayısı
  Eğer >0: "X SKU eşleşmesi bulundu, otomatik eşleştir?" CTA
  POST /products/mappings/auto → toplu mapping kur

Adım 7 — Tamamlandı
  Mağaza listesi + mapping listesi göster
  Stok değişimi artık real-time iki yönlü çalışıyor
```

### Yeni Bir Shopify Sipariş Gelince Ne Olur?

Frontend hiçbir şey yapmaz — Shopify'dan webhook backend'e gelir, BalinaOS DB güncellenir, mapping varsa diğer mağazalara otomatik push'lanır. Frontend yeni siparişi `GET /companies/:id/orders` ile görür (auto-refresh polling veya WebSocket — şu an polling).

---

## 17) Önemli Notlar

### TRY Currency Zorunlu
Bağlantı testi TRY olmayan Shopify mağazalarını reddeder. Frontend hata mesajını net gösterir.

### Sync Arka Planda
`POST /sync` anında 200 döner ama gerçek iş 5-30+ saniye sürebilir. Frontend mağaza detay endpoint'ini polling yapmalı.

### BigInt Field'ları
`wcProductId`, `wcVariationId`, `wcOrderId`, `wcRefundId` JSON'da string olarak gelir (örn `"10219701535002"`). JS Number'a `Number(x)` ile cast edilebilir, safe (Shopify ID'leri 14 hane, Number safe range 16 hane).

### Auth Token TTL
- Access token: 15 dk
- Refresh token: 7 gün (default), "remember me" checkbox ile 30 gün
- 401 alınca `/auth/refresh` ile yenile

### Test Mağazası (Geliştirme İçin)
```
shopDomain:   balinaos.myshopify.com
accessToken:  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
```
> ⚠️ Production'a çıkmadan önce bu token'ı **Shopify Admin'den rotate et**.

### Mağaza Limiti
Plan'a göre değişir:
- **FREE:** 2 mağaza
- **PRO:** 5 mağaza
- **ENTERPRISE:** 10 mağaza
Limit aşıldığında `POST /marketplace/SHOPIFY` `403` döner. Frontend "Plan yükselt" CTA göstermeli.

---

## 18) Hata Kodları Özeti

| HTTP | Anlam | Aksiyon |
|---|---|---|
| 200 | OK | — |
| 201 | Created (mağaza, mapping) | — |
| 204 | No content (silme) | — |
| 400 | Validation / business rule | Hata mesajını göster |
| 401 | Auth eksik/yanlış | Login'e yönlendir veya `/auth/refresh` |
| 403 | Yetki yok / limit aşıldı | "Plan yükselt" veya "Yetkiniz yok" |
| 404 | Bulunamadı (store, mapping, vs.) | Liste yenile |
| 409 | Conflict (duplicate SKU mapping vs.) | Hata göster |
| 500 | Sunucu hatası | "Tekrar deneyin" + Sentry'ye log |

---

**Son güncelleme:** 2026-05-06
**Backend version:** Shopify Faz 1+2+3 tamamlandı, üretimde aktif.
