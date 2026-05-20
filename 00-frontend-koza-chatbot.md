# Koza AI Agent (Instagram + Chatbot) — Tam stack teslim notu

Backend ekibinin [00-backend-spec/SPEC.md](../backend/00-backend-spec/SPEC.md) dosyasında tanımlanan Instagram chatbot iş akışının **hem frontend hem backend** tarafının teslim notu.

> **Kim için:** Backend, n8n ve QA ekipleri.
> **Sürüm:** v1 — full feature set (phase-1 + phase-2 birlikte tamamlandı).
> **Durum:** Frontend + backend kodlandı, TypeScript build temiz, Prisma migration hazır. DB'ye uygulanması + Meta uygulamasının onboarding'i + env var'ların doldurulması bekleniyor.

---

## 1. Genel akış (özet)

```
Müşteri → Instagram DM
        │
        ▼
   Meta webhook  ──▶  n8n workflow
                       │
                       ▼
                   balinaOS External API (X-API-Key)
                       │  (chat-threads, RAG search, tools)
                       ▼
                   OpenAI (Tool-calling loop)
                       │
                       ▼
                   AI cevap → Meta Graph API → Müşteri
                       │
                       ▼
                   chat_messages tablosu

Admin panel (balinaOS frontend)
   - "Sohbetler" → JWT ile dashboard API
   - Mesajları gör, devral, bilgi tabanını yönet
```

Frontend, **iki kontrat** ile çalışır:

1. **Dashboard API** (`/api/company/:companyId/...`) — JWT bearer. Sohbet listesi, takeover, bilgi tabanı CRUD vs.
2. **OAuth callback sayfaları** — Meta'dan dönen public redirect'i karşılar.

n8n ve external API endpoint'leri (`/api/api/v1/...`) frontend'in işi değildir — sadece backend ekibi tetikler.

---

## 2. Eklenen / değişen frontend parçaları

### 2.1 Yeni Zustand store'lar (`frontend/src/stores/`)

| Dosya | Sorumluluk | Bağlı endpoint'ler |
|---|---|---|
| `chatThreadStore.ts` | Sohbet listesi, detay, takeover, polling | `GET /chat-threads`, `GET /chat-threads/:id`, `PATCH /chat-threads/:id/takeover` |
| `instagramIntegrationStore.ts` | Instagram OAuth + per-store chatbot konfigürasyonu | `POST /stores/:sid/instagram/auth/start`, `GET /stores/:sid/instagram/auth/status/:state`, `GET/PUT/DELETE /stores/:sid/instagram`, `POST /stores/:sid/instagram/test-connection` |
| `knowledgeBaseStore.ts` | KB pattern CRUD + learning cluster onayı | `GET/POST/PATCH/DELETE /stores/:sid/knowledge-base`, `GET /stores/:sid/learning-clusters`, `POST /learning-clusters/:id/approve\|reject` |

Hepsi `useXyzStore()` hook'u olarak export edilir, `api.ts` interceptor'unu kullanır.

### 2.2 Yeni route'lar

| Route | Dosya | Ne yapar |
|---|---|---|
| `/{slug}/conversations` | `app/(dashboard)/[companySlug]/conversations/page.tsx` | Split-panel sohbet listesi + detay + takeover/release butonu. 15 sn aralıkla polling ile mesajları tazeler. |
| `/{slug}/conversations/setup` | `.../conversations/setup/page.tsx` | Mağaza listesi; her biri için Instagram **Bağla / Test / Ayarlar / Kaldır**. "Ayarlar" tıklayınca chatbot ayarları modali açılır (active toggle, sysPrompt override, IBAN, hesap adı, DHL kodu, admin Instagram ID, varsayılan model). |
| `/{slug}/conversations/knowledge-base` | `.../conversations/knowledge-base/page.tsx` | Mağaza seçici + pattern listesi + ekle/düzenle/aç-kapa/sil. |
| `/{slug}/conversations/learning` | `.../conversations/learning/page.tsx` | Onay bekleyen cluster kuyruğu. Onaylayınca cevabı düzenleyip KB'ye taşır. |
| `/integrations/instagram/return` | `app/integrations/instagram/return/page.tsx` | **Public** OAuth callback sayfası — Meta'dan dönüş sonrası `getAuthStatus` ile durumu poll'lar, başarı/başarısızlık ekranı gösterir. |

Sohbetler için ortak rail layout: `.../conversations/layout.tsx` — Pazarlama layout'u ile aynı patern (solda 3 menü item, sağda içerik kartı).

### 2.3 Sidebar
`components/layout/app-sidebar.tsx` — **Sohbetler** nav item'ı eklendi (`Comments` icon, OWNER/ADMIN'e açık). Pazarlama'dan sonra konumlandı.

### 2.4 Mağaza entegrasyonları
`stores/page.tsx`:
- INSTAGRAM kartı `comingSoon: false` yapıldı.
- Karta tıklayınca `/{slug}/conversations/setup`'a yönlendiriyor (handler `handleMarketplaceClick` içinde).

---

## 3. Backend API kontratı (özet)

> Tüm endpoint'ler `00-backend-spec/SPEC.md` ile aynı şemada. Frontend bunlara güvenerek yazıldı.

### Dashboard (JWT)
```
POST   /api/company/:cid/stores/:sid/instagram/auth/start
        body: { redirectUri }
        → { authorizeUrl, state }

GET    /api/company/:cid/stores/:sid/instagram/auth/status/:state
        → { status: 'pending'|'completed'|'failed', instagram, error }

GET    /api/company/:cid/stores/:sid/instagram
        → InstagramConfig | 404 (bağlı değil)

PUT    /api/company/:cid/stores/:sid/instagram
        body: Partial<InstagramConfig patch>
        side-effect: chatbotActive değişirse Meta webhook subscribe/unsubscribe

DELETE /api/company/:cid/stores/:sid/instagram

POST   /api/company/:cid/stores/:sid/instagram/test-connection
        → { ok, account? }

GET    /api/company/:cid/chat-threads?storeId&status&search&limit&offset
        → { items: ChatThreadListItem[], total, hasMore }

GET    /api/company/:cid/chat-threads/:threadId
        → { thread: ChatThreadDetail, messages: ChatMessage[] }

PATCH  /api/company/:cid/chat-threads/:threadId/takeover
        body: { takeover: boolean, reason? }
        → ChatThreadDetail

GET    /api/company/:cid/stores/:sid/knowledge-base
        → KnowledgeBaseItem[]
POST   /api/company/:cid/stores/:sid/knowledge-base
        body: { questionPattern, idealAnswer, examples?, appliesTo? }
        → KnowledgeBaseItem
PATCH  /api/company/:cid/stores/:sid/knowledge-base/:id
        body: { idealAnswer?, examples?, active? }
DELETE /api/company/:cid/stores/:sid/knowledge-base/:id

GET    /api/company/:cid/stores/:sid/learning-clusters?status=pending
        → LearningCluster[]
POST   /api/company/:cid/stores/:sid/learning-clusters/:id/approve
        body: { idealAnswer? }   // admin son anda override edebilir
POST   /api/company/:cid/stores/:sid/learning-clusters/:id/reject
```

### Public callback (Meta yönlendirir)
Backend'in `GET /api/instagram/oauth/callback?code&state` endpoint'i state'i tüketip `instagram_oauth_states.status = 'completed'` yazar. **Frontend bu endpoint'i çağırmaz**, sadece backend'in HTML response'unun ardından kullanıcı kapatabilir veya frontend `/integrations/instagram/return` sayfası açıksa orası polling ile durumu görür.

---

## 4. OAuth akışı (frontend tarafı)

```
1. Kullanıcı "/{slug}/conversations/setup" → "Bağla" tıklar.
2. Frontend POST /instagram/auth/start çağırır.
3. Backend { authorizeUrl, state } döner.
4. Frontend sessionStorage'a kaydeder:
     igAuthCompanyId, igAuthStoreId, igAuthState, igAuthSlug
5. window.location.href = authorizeUrl  (aynı sekme).
6. Kullanıcı Meta consent ekranını onaylar.
7. Meta → balinaOS backend callback'i (token exchange) → backend'in HTML response'u veya
   redirect ile `/integrations/instagram/return`'e geri gönderir.
8. Return sayfası sessionStorage'tan companyId+storeId+state alır, 1.5 sn aralıkla
   getAuthStatus poll'lar (max 60 sn).
9. status='completed' olunca başarı ekranı + "Mağaza ayarlarına dön" linki.
   status='failed' olunca hata mesajı.
```

> **Backend'in dikkat edeceği nokta:** OAuth callback flow'unda token exchange tamamlandıktan sonra backend ya browser'a HTML "kapanır" sayfası göndermeli, ya da kullanıcıyı `/integrations/instagram/return?state=...` URL'ine yönlendirmeli. Frontend zaten state'i sessionStorage'da bekliyor, herhangi bir yöntem işe yarar — kullanıcı `/integrations/instagram/return` sayfasına döndüğünde polling tamamlanır.

---

## 5. Real-time mesaj güncellemeleri

**Şu an polling:** Sohbetler sayfası seçili thread'i 15 sn aralıkla `GET /chat-threads/:id` ile yeniliyor.

**Sonraki iterasyon önerisi:**
- Backend SSE veya WebSocket endpoint'i açar (örn. `GET /chat-threads/:id/stream`)
- Frontend `EventSource` ile bağlanır, yeni mesaj geldiğinde `selectedMessages`'a ekler.
- `chatThreadStore`'da `subscribeToThread(threadId)` action'ı eklenebilir.

Polling, MVP için yeterlidir; backend ekibi SSE eklemek istediğinde `chatThreadStore.refreshMessages` yerine subscribe pattern'ine geçilir.

---

## 6. Permissions / Roller

Sidebar'da Sohbetler nav item'ı `roles: ['OWNER', 'ADMIN']` olarak gösteriliyor. STOCKIST veya PRODUCT_UPLOADER görmez. Backend'in dashboard endpoint'lerinin de aynı yetki şartını uygulaması beklenir.

---

## 7. Konfigürasyon

Frontend tarafında ek env vars **YOK**. Hepsi backend kontratıyla çalışıyor. `NEXT_PUBLIC_API_URL` zaten var ve kullanılıyor.

OAuth callback redirect URI runtime'da hesaplanıyor:
```
const redirectUri = `${window.location.origin}/integrations/instagram/return`;
```

Meta uygulamasında bu URL'in (örn. `https://app.balinaos.com/integrations/instagram/return`) **Authorized Redirect URI** listesine eklenmesi gerekiyor.

> **Backend'in dikkat edeceği nokta:** `INSTAGRAM_OAUTH_CALLBACK_URL` backend'in kendi callback'idir (`https://api.balinaos.com/api/instagram/oauth/callback`). Bu Meta'ya backend tarafından gönderilir. Frontend'in `/integrations/instagram/return` URL'i, backend callback'i `redirectUri` query parametresiyle alıp en sonda yönlendirdiği yerdir. **İkisi farklıdır:**
> - Meta → balinaOS backend callback
> - Backend → frontend return sayfası (token exchange başarılı olunca)

---

## 8. Test akışı (manuel)

**Ön koşul:** Backend'in en az aşağıdaki endpoint'leri çalışır olmalı:
- `POST /instagram/auth/start`
- `GET /instagram/auth/status/:state`
- `GET /instagram` (config döner)
- `GET /chat-threads`
- `GET /chat-threads/:id`

Akış:

1. Admin olarak login ol.
2. Sidebar → **Sohbetler** → sayfa açılır, boş liste gösterir.
3. **Sohbetler / Bilgi tabanı / Öğrenme kuyruğu** alt nav görünür.
4. Sol rail → **Bilgi tabanı**: mağaza seçici, boş liste, "Yeni pattern" butonu.
5. **Entegrasyon** sayfası → Sosyal Medya kategorisi → **Instagram** kartı → `/conversations/setup`'a yönlendirir.
6. Setup sayfasında mağaza listesi: her satırda **Bağla** butonu.
7. Bağla → Meta consent ekranı (test app gerekli) → onayla → Return sayfası → "Bağlandı" mesajı.
8. Setup sayfasına dön → mağaza **@username** ile listelenir, **Ayarlar** butonu açar.
9. Chatbot **Active** toggle aç → kaydet → setup sayfasında "Chatbot aktif" yazısı.
10. Müşteri test Instagram hesabından DM yollar → n8n webhook'u alır → chat-threads'e yazılır → Sohbetler sayfasında yeni thread görünür.
11. Thread'i tıkla → mesajlar görünür. **Devral** butonu → status `human_takeover` olur.
12. Bilgi tabanına test pattern ekle → "İade var mı?" → "Hijyen sebebiyle iade kabul etmiyoruz." → AI sonraki ilgili soruda bu cevabı kullanır.

---

## 9. Bilinen sınırlamalar / TODO

| Konu | Durum | Çözüm önerisi |
|---|---|---|
| Real-time mesaj akışı | Polling (15 sn) | Backend SSE endpoint'i → `EventSource` |
| Mesaj gönderme (admin → müşteri) | UI yok | `POST /chat-threads/:id/messages` (role=assistant, source=admin) ile message composer eklenir |
| Görsel/video ek yükleme | Yok | Multipart upload + media URL alıp message'a ekleme |
| Thread "yeni mesaj" badge | Yok | `last_message_at` ile karşılaştırma + unread cache |
| Pagination | Limit=100 hard-coded | Infinite scroll veya "Daha fazla yükle" butonu |
| Conversation outcome filtresi | Yok | `closed` thread'lerde outcome dropdown filtresi |
| KB embedding preview | Yok | Pattern ekleyince benzer KB'leri "Bunlar gibi mi?" önerisi |
| WhatsApp | comingSoon hâlâ true | Aynı şablonu kopyalayıp WhatsApp Cloud API'ye uyarlanır |

---

## 10. Kodun bulunduğu yerler (cheat sheet)

### Frontend
```
frontend/
├─ src/stores/
│  ├─ chatThreadStore.ts                    # Sohbet listesi/detay/takeover
│  ├─ instagramIntegrationStore.ts          # OAuth + config CRUD
│  └─ knowledgeBaseStore.ts                 # KB + learning clusters
├─ src/app/(dashboard)/[companySlug]/conversations/
│  ├─ layout.tsx                            # Alt nav (Sohbetler / KB / Öğrenme)
│  ├─ page.tsx                              # Sohbetler list+detail+takeover
│  ├─ setup/page.tsx                        # Instagram bağla + chatbot ayarları
│  ├─ knowledge-base/page.tsx               # KB CRUD
│  └─ learning/page.tsx                     # Cluster onay kuyruğu
├─ src/app/integrations/instagram/return/
│  └─ page.tsx                              # OAuth public return
├─ src/components/layout/app-sidebar.tsx    # Sohbetler nav item
└─ src/app/(dashboard)/[companySlug]/stores/page.tsx
                                            # INSTAGRAM card aktive
```

### Backend (phase-1 tamamlandı)
```
backend/
├─ prisma/
│  ├─ schema.prisma                         # ChatThread, ChatMessage,
│  │                                          KnowledgeBaseItem, LearningCluster,
│  │                                          InstagramOauthState modelleri + 
│  │                                          stores tablosuna IG/chatbot alanları
│  └─ migrations/20260520120000_add_koza_chatbot/
│     └─ migration.sql                       # Raw SQL (pgvector phase-2'de)
├─ src/config/configuration.ts              # `instagram.*` env namespace
└─ src/modules/chatbot/
   ├─ chatbot.module.ts                     # Module registration
   ├─ dto/index.ts                          # Tüm DTO'lar (class-validator)
   ├─ services/
   │  ├─ instagram-encryption.service.ts    # AES-256-GCM token enc/dec
   │  ├─ instagram-graph.service.ts         # Meta Graph API client
   │  ├─ instagram-auth.service.ts          # OAuth orchestration
   │  ├─ instagram-config.service.ts        # Per-store chatbot config CRUD
   │  ├─ chat-threads.service.ts            # Threads CRUD + takeover + external
   │  ├─ chat-messages.service.ts           # Mesaj append/list (n8n için)
   │  ├─ knowledge-base.service.ts          # KB + clusters
   │  └─ oauth-state-cleaner.service.ts     # @Cron her saat — expired state temizler
   └─ controllers/
      ├─ instagram.controller.ts            # Dashboard JWT — /stores/:sid/instagram/*
      ├─ instagram-oauth.controller.ts      # Public — /instagram/oauth/callback
      ├─ chat-threads.dashboard.controller.ts  # Dashboard JWT — /chat-threads/*
      ├─ knowledge-base.controller.ts       # Dashboard JWT — KB + clusters
      └─ external-chatbot.controller.ts     # API Key — /api/v1/chat-threads/*
                                              + /api/v1/instagram/account/:igId/store
```

Backend dokümanları:
```
backend/00-backend-spec/
├─ SPEC.md                                  # API kontratı (master kaynak)
├─ TODO.md                                  # Backend iş listesi
├─ db-schema.sql                            # SQL referansı (Prisma'ya çevrildi)
└─ tools-spec.md                            # n8n / OpenAI tool definitions
```

## 12. Backend — phase-1 nasıl çalıştırılır

1. **Env vars** (örnek `.env`):
   ```bash
   # Meta uygulaması (Developer Console > Instagram > Set up)
   INSTAGRAM_APP_ID=...
   INSTAGRAM_APP_SECRET=...
   INSTAGRAM_OAUTH_CALLBACK_URL=https://api.balinaos.com/api/instagram/oauth/callback
   INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<rastgele uzun string>
   INSTAGRAM_WEBHOOK_CALLBACK_URL=https://n8n.balinaos.com/webhook/instagram

   # Token şifreleme — boşsa ENCRYPTION_KEY fallback
   INSTAGRAM_TOKEN_ENCRYPTION_KEY=<32-byte hex>
   ```

2. **DB migration:**
   ```bash
   cd backend
   npx prisma migrate deploy
   # veya local dev için:
   npx prisma migrate dev
   ```
   pgvector extension'ı MVP'de **gerekmiyor** — phase-2'de ayrı migration ile gelecek.

3. **Meta Developer Console:**
   - Yeni Instagram uygulaması oluştur (Business hesap onayı gerekli).
   - **Authorized Redirect URI** olarak hem backend callback (`https://api.balinaos.com/api/instagram/oauth/callback`) hem frontend return (`https://app.balinaos.com/integrations/instagram/return`) eklenmeli.
   - Scope'lar: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
   - Webhook subscription URL'i n8n endpoint'i (`INSTAGRAM_WEBHOOK_CALLBACK_URL`) olmalı; verify token eşleşmeli.

4. **n8n entegrasyonu:**
   - n8n için bir balinaOS API Key oluştur (`write` permission'lı). Bu key chatbot endpoint'lerini de açar (özel scope sistemi MVP'de yok — phase-2'de `chatbot:read`/`chatbot:write` eklenecek).
   - n8n workflow'unun çağıracağı endpoint'ler `00-backend-spec/SPEC.md § 3.2`'de listelenmiştir.

5. **Backend build:**
   ```bash
   npx tsc --noEmit   # type-check (CI'da)
   npm run build       # production build
   npm run start:prod  # veya start:dev
   ```

## 13. Backend — phase-2'de eklenecekler (bilerek ertelendi)

Aşağıdaki maddeler MVP'de **yapılmadı**; spec'te tanımlı ama RAG/clustering altyapısı + ek altyapı gerektirdiği için phase-2'ye bırakıldı:

| Konu | Açıklama |
|---|---|
| pgvector extension + embedding sütunları | Ayrı migration ile `CREATE EXTENSION vector` + `chat_messages.embedding`, `conversation_embeddings`, `knowledge_base.embedding` |
| `EmbeddingWorker` (BullMQ + Redis) | Yeni mesaj insert'inden sonra embedding'i hesaplar |
| `RagSearchService` | `search-similar` endpoint'i şu an boş `matches: []` döner; phase-2'de pgvector ile gerçek arama |
| `ConversationCloserService` | @Cron her saat — 24sa inaktif thread'leri kapat + GPT-4 ile özetle |
| `ClusteringService` | @Cron her gece 03:00 — k-means + cluster önerileri üret |
| `TokenRefreshService` | @Cron her gün — long-lived IG token'ları 60-7 gün önce refresh et |
| Meta webhook signature validation | Backend direkt webhook receive ediyorsa `X-Hub-Signature-256` HMAC kontrolü |
| `chatbot:read`/`chatbot:write` API Key scope'ları | n8n'in key'inin yetki kapsamı daraltılır |
| Real-time mesaj akışı (SSE/WebSocket) | Frontend polling → backend stream'e geçilince çıkar |
| Vision endpoint'leri | `extract-sku`, `verify-receipt`, `extract-cargo-fee` (n8n yerine balinaOS) — opsiyonel |
| Mesaj gönderme (admin → müşteri) | UI ve endpoint (admin Meta Graph üzerinden müşteriye DM atar) |

---

## 11. İletişim notları

- **Frontend bir endpoint çalışmıyor diye crash etmez** — store'lardaki `extractError` her hatayı yakalar, `error` field'ına yazar, sessizce kullanıcıya toast gösterir veya boş UI'ya düşer. Yani backend henüz hazır değilken sayfalar açılıyor ama veri boş.
- **Mock / sahte veri yok.** Backend hazır oluncaya kadar bu sayfalar boş gözükecek. Birim test gerektiğinde her store'a mock injection kolayca eklenebilir (`useChatThreadStore.setState({...})` ile).
- **API path prefix'i `/api`** — `services/api.ts`'deki `NEXT_PUBLIC_API_URL` zaten içeriyor; store'larda yazılan path'ler bu prefix'in **altında** (`/company/...`).

---

**Sorularınız için:** Frontend ekibinden Melih Özdemir (`melihozdemirrrr@gmail.com`).
