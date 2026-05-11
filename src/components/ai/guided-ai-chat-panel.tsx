'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Xmark,
  TrashBin as Trash2,
} from '@gravity-ui/icons';
import { Button, TextField, Label, Input, toast } from '@heroui/react';
import {
  useAiCreatorStore,
  useAiCreatorHistoryStore,
  deriveSessionTitle,
  buildImagePrompt,
  buildVideoPrompt,
  buildCloseupPrompt,
  shouldGenerateCloseup,
  createProductFromGuidedSession,
  PRODUCT_INFO_ORDER,
  PRODUCT_INFO_LABELS,
  type GuidedMessage,
  type ProductInfoField,
} from '@/stores/aiCreatorStore';
import { useAiStore, FAL_MODEL_CATALOG, type ProductType } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useUIStore } from '@/stores/uiStore';
import { resizeImageToDataUrl } from '@/lib/image-resize';

interface Props {
  variant: 'drawer' | 'full';
  onClose?: () => void;
}

export function GuidedAiChatPanel({ variant, onClose }: Props) {
  const { currentCompany } = useCompanyStore();
  const {
    fals,
    selectedFalId,
    fetchFalIntegrations,
    generateImageRaw,
    generateVideoRaw,
  } = useAiStore();
  const { stores, fetchStores } = useStoreStore();
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);
  const toggleAiDrawerExpanded = useUIStore((s) => s.toggleAiDrawerExpanded);

  const {
    sessionId,
    step,
    messages,
    selectedType,
    productImageUrl,
    lastImageUrl,
    closeupImageUrl,
    videoUrl,
    imageHistory,
    videoHistory,
    productInfo,
    currentInfoField,
    selectedStoreId,
    isBusy,
    start,
    reset,
    pushBot,
    pushUser,
    setStep,
    appendMessage,
    resolveMessage,
    selectType,
    setProductImage,
    setGeneratedImage,
    setVideo,
    setSelectedStoreId,
    setProductInfoField,
  } = useAiCreatorStore();
  const saveSnapshot = useAiCreatorHistoryStore((s) => s.saveSnapshot);
  const fetchSessions = useAiCreatorHistoryStore((s) => s.fetchSessions);

  const scrollRef = useRef<HTMLDivElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  const selectedFal = fals.find((f) => f.id === selectedFalId) ?? fals[0] ?? null;
  const types: ProductType[] = selectedFal?.productTypes ?? [];
  const hasIntegration = fals.length > 0;

  // Hesaba bağlı seçili görsel/video modelleri — hardcoded yerine kullanıcının
  // Yönet > Modeller bölümünde seçtiği model kullanılır. Yoksa varsayılana düşer.
  const selectedImageModel =
    selectedFal?.models?.find((id) => {
      const meta = FAL_MODEL_CATALOG.find((m) => m.id === id);
      return meta?.kind === 'image';
    }) ?? 'fal-ai/nano-banana';
  const selectedVideoModel =
    selectedFal?.models?.find((id) => {
      const meta = FAL_MODEL_CATALOG.find((m) => m.id === id);
      return meta?.kind === 'video';
    });

  useEffect(() => {
    if (currentCompany?.id) {
      fetchFalIntegrations(currentCompany.id);
      fetchStores(currentCompany.id);
      fetchSessions(currentCompany.id);
    }
  }, [currentCompany?.id, fetchFalIntegrations, fetchStores, fetchSessions]);

  // İlk açılışta akışı başlat. aiCreatorStore artık persist edilmiyor —
  // sayfa yenilemede mesajlar sıfırlanır, geçmiş history store'da kalır.
  useEffect(() => {
    if (messages.length === 0 && hasIntegration) {
      start('Merhaba! Üretmek istediğiniz ürün türünü seçerek başlayalım.');
    }
  }, [messages.length, hasIntegration, start]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isBusy]);

  // Anlamlı her değişiklikte backend'e snapshot — debounce ile spam'i engelle.
  // Pending pseudo-mesajları (kind: 'pending') snapshot'a girmez.
  useEffect(() => {
    if (!sessionId || !currentCompany?.id) return;
    const hasMeaningfulProgress = messages.some(
      (m) =>
        m.kind === 'user-text' ||
        m.kind === 'user-image' ||
        m.kind === 'bot-image' ||
        m.kind === 'bot-video' ||
        (m.kind === 'type-picker' && m.resolvedTypeId),
    );
    if (!hasMeaningfulProgress) return;
    const snapshotState = {
      step,
      messages: messages.filter((m) => m.kind !== 'pending'),
      selectedType,
      productImageUrl,
      lastImageUrl,
      imageHistory,
      closeupImageUrl,
      videoUrl,
      videoHistory,
      productInfo,
      currentInfoField,
      selectedStoreId,
    };
    // 1.2 sn debounce — kullanıcı yazarken her tuşta API'a gitmesin.
    const handle = window.setTimeout(() => {
      saveSnapshot(currentCompany.id, {
        id: sessionId,
        title: deriveSessionTitle(snapshotState),
        createdAt: Number(sessionId.split('-')[0]) || Date.now(),
        updatedAt: Date.now(),
        state: snapshotState,
      });
    }, 1200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentCompany?.id, messages, step, selectedType, lastImageUrl, videoUrl]);

  /* ---------------- Step handlers ---------------- */

  const handleTypeSelect = async (type: ProductType) => {
    selectType(type);
    // Type-picker mesajını "resolved" işaretle
    const picker = [...messages].reverse().find((m) => m.kind === 'type-picker');
    if (picker) resolveMessage(picker.id, { resolvedTypeId: type.id });
    pushUser(type.name);
    pushBot(`Harika — "${type.name}" seçtiniz. Şimdi ürün görselinizi yükleyin.`);
    appendMessage({ id: '', kind: 'product-image-uploader' });
    setStep('awaiting-product-image');
  };

  const handleProductImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.danger('Lütfen bir görsel dosyası seçin');
      return;
    }
    // Kullanıcı isteği: ana ürün görseli orijinal boyutunda, sıkıştırılmadan
    // gönderilir. Backend body limit yeterince yüksek tutulmalı.
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setProductImage(url);
    const uploader = [...messages].reverse().find((m) => m.kind === 'product-image-uploader');
    if (uploader) resolveMessage(uploader.id, { resolved: true });
    appendMessage({ id: '', kind: 'user-image', url });
    await runImageGeneration();
  };

  const runImageGeneration = async (userComment?: string) => {
    if (!currentCompany?.id || !selectedType) return;
    const refUrl = selectedType.referenceImageUrl;
    const productUrl = useAiCreatorStore.getState().productImageUrl;
    if (!productUrl) return;

    setStep('generating-image');
    const pendingId = `pending-${Date.now()}`;
    appendMessage({ id: pendingId, kind: 'pending', label: 'Görsel üretiliyor…' });

    // Türün özel prompt'u varsa onu kullan, yoksa varsayılan üret. Yorum
    // her durumda eklenir.
    const customPrompt = selectedType.prompt?.trim();
    let prompt: string;
    if (customPrompt) {
      prompt = customPrompt;
      if (userComment && userComment.trim()) {
        prompt += `\n\nUSER FEEDBACK to address in this regeneration: ${userComment.trim()}`;
      }
    } else {
      prompt = buildImagePrompt(selectedType.name, userComment);
    }
    const result = await generateImageRaw(currentCompany.id, {
      prompt,
      model: selectedImageModel,
      imageUrls: [refUrl, productUrl],
    });

    // Pending mesajını kaldır
    useAiCreatorStore.setState((s) => ({
      messages: s.messages.filter((m) => m.id !== pendingId),
    }));

    if (!result.url) {
      pushBot(
        `Üzgünüm, görsel üretilemedi. ${result.error ? `Sebep: ${result.error}` : ''} Tekrar denemek için bir yorum yazın.`.trim(),
      );
      setStep('awaiting-image-comment');
      appendMessage({
        id: '',
        kind: 'comment-input',
        target: 'image',
        placeholder: 'Yeniden denemek için bir yorum yazın veya "tekrar" yazın',
      });
      return;
    }

    setGeneratedImage(result.url);
    appendMessage({ id: '', kind: 'bot-image', url: result.url, caption: 'Üretilen görsel' });
    pushBot('Bu nasıl oldu? Beğendiyseniz devam edelim.');
    appendMessage({ id: '', kind: 'image-feedback' });
    setStep('image-ready');
  };

  const handleImageFeedback = (liked: boolean) => {
    const fb = [...messages].reverse().find((m) => m.kind === 'image-feedback');
    if (fb) resolveMessage(fb.id, { resolved: liked ? 'liked' : 'disliked' });
    pushUser(liked ? 'Beğendim' : 'Beğenmedim');
    if (liked) {
      pushBot('Süper! Bu görselden bir video da oluşturmak ister misiniz?');
      appendMessage({ id: '', kind: 'video-confirm' });
      setStep('asking-video');
    } else {
      pushBot('Neyi beğenmediniz? Kısaca yazın, ona göre yeniden üreteceğim.');
      appendMessage({
        id: '',
        kind: 'comment-input',
        target: 'image',
        placeholder: "Örn. 'arka plan daha sade olsun, ışık daha yumuşak'",
      });
      setStep('awaiting-image-comment');
    }
  };

  const handleImageComment = async (comment: string) => {
    const ci = [...messages].reverse().find(
      (m) => m.kind === 'comment-input' && m.target === 'image' && !m.resolved,
    );
    if (ci) resolveMessage(ci.id, { resolved: comment });
    pushUser(comment);
    await runImageGeneration(comment);
  };

  const handleVideoConfirm = (yes: boolean) => {
    const vc = [...messages].reverse().find((m) => m.kind === 'video-confirm');
    if (vc) resolveMessage(vc.id, { resolved: yes ? 'yes' : 'no' });
    pushUser(yes ? 'Evet, video üretelim' : 'Hayır, gerek yok');
    if (yes) {
      pushBot('Videonuz nasıl olsun? Kamera hareketi, sahne, atmosfer gibi detayları yazın.');
      appendMessage({ id: '', kind: 'video-prompt-input' });
      setStep('awaiting-video-prompt');
    } else {
      pushBot('Tamam. Görseli siteye ürün olarak yüklemek ister misiniz?');
      appendMessage({ id: '', kind: 'upload-confirm' });
      setStep('asking-upload');
    }
  };

  const handleVideoPrompt = async (userPrompt: string) => {
    const vp = [...messages].reverse().find((m) => m.kind === 'video-prompt-input');
    if (vp) resolveMessage(vp.id, { resolved: userPrompt });
    pushUser(userPrompt);
    if (!currentCompany?.id || !selectedType || !lastImageUrl) return;

    setStep('generating-video');

    let startFrameUrl = lastImageUrl;
    // Kullanıcı yakın çekim/zoom isterse önce bir close-up görsel üret
    if (shouldGenerateCloseup(userPrompt)) {
      const closeupPending = `pending-closeup-${Date.now()}`;
      appendMessage({ id: closeupPending, kind: 'pending', label: 'Yakın çekim hazırlanıyor…' });
      const closeup = await generateImageRaw(currentCompany.id, {
        prompt: buildCloseupPrompt(selectedType.name, userPrompt),
        model: selectedImageModel,
        imageUrls: [lastImageUrl],
      });
      useAiCreatorStore.setState((s) => ({
        messages: s.messages.filter((m) => m.id !== closeupPending),
      }));
      if (closeup.url) {
        startFrameUrl = closeup.url;
        useAiCreatorStore.setState({ closeupImageUrl: closeup.url });
        appendMessage({ id: '', kind: 'bot-image', url: closeup.url, caption: 'Yakın çekim karesi' });
      }
    }

    const videoPending = `pending-video-${Date.now()}`;
    appendMessage({ id: videoPending, kind: 'pending', label: 'Video üretiliyor (1-3 dk sürebilir)…' });
    const result = await generateVideoRaw(currentCompany.id, {
      prompt: buildVideoPrompt(userPrompt, selectedType.name),
      imageUrl: startFrameUrl,
      model: selectedVideoModel,
    });
    useAiCreatorStore.setState((s) => ({
      messages: s.messages.filter((m) => m.id !== videoPending),
    }));

    if (!result.url) {
      pushBot(
        `Video üretilemedi. ${result.error ? `Sebep: ${result.error}` : ''} Yeniden denemek için bir yorum yazın.`.trim(),
      );
      appendMessage({
        id: '',
        kind: 'comment-input',
        target: 'video',
        placeholder: 'Yeniden denemek için bir yorum yazın',
      });
      setStep('awaiting-video-comment');
      return;
    }

    setVideo(result.url);
    appendMessage({ id: '', kind: 'bot-video', url: result.url, caption: 'Üretilen video' });
    pushBot('Videoyu beğendiniz mi?');
    appendMessage({ id: '', kind: 'video-feedback' });
    setStep('video-ready');
  };

  const handleVideoFeedback = (liked: boolean) => {
    const fb = [...messages].reverse().find((m) => m.kind === 'video-feedback');
    if (fb) resolveMessage(fb.id, { resolved: liked ? 'liked' : 'disliked' });
    pushUser(liked ? 'Beğendim' : 'Beğenmedim');
    if (liked) {
      pushBot('Bu görsel ve videoyla siteye ürün olarak yüklemek ister misiniz?');
      appendMessage({ id: '', kind: 'upload-confirm' });
      setStep('asking-upload');
    } else {
      pushBot('Videoda neyi beğenmediniz?');
      appendMessage({
        id: '',
        kind: 'comment-input',
        target: 'video',
        placeholder: "Örn. 'kamera çok hızlı', 'aydınlatma daha sıcak olsun'",
      });
      setStep('awaiting-video-comment');
    }
  };

  const handleVideoComment = async (comment: string) => {
    const ci = [...messages].reverse().find(
      (m) => m.kind === 'comment-input' && m.target === 'video' && !m.resolved,
    );
    if (ci) resolveMessage(ci.id, { resolved: comment });
    pushUser(comment);
    await handleVideoPrompt(comment);
  };

  const handleUploadConfirm = (yes: boolean) => {
    const uc = [...messages].reverse().find((m) => m.kind === 'upload-confirm');
    if (uc) resolveMessage(uc.id, { resolved: yes ? 'yes' : 'no' });
    pushUser(yes ? 'Evet, yükleyelim' : 'Hayır, teşekkürler');
    if (!yes) {
      pushBot('Anlaşıldı. Yeni bir ürün için sohbeti sıfırlayabilirsiniz.');
      setStep('done');
      return;
    }
    // İlk alanı sor
    const firstField = PRODUCT_INFO_ORDER[0];
    pushBot(askFieldPrompt(firstField));
    appendMessage({ id: '', kind: 'product-info-prompt', field: firstField });
    useAiCreatorStore.setState({ currentInfoField: firstField });
    setStep('collecting-product-info');
  };

  const handleProductInfoSubmit = async (value: string) => {
    if (!currentInfoField) return;
    // Kullanıcı tek mesajda hepsini yazdıysa parse etmeyi dene
    const parsed = tryParseAllInfo(value);
    if (parsed) {
      // Parse başarılı → tüm alanları doldur, eksikleri sırayla tekrar sor
      for (const k of Object.keys(parsed) as ProductInfoField[]) {
        const v = parsed[k];
        if (v != null) setProductInfoField(k, String(v));
      }
      pushUser(value);
      const missing = PRODUCT_INFO_ORDER.find(
        (f) => isFieldMissing(f, useAiCreatorStore.getState().productInfo),
      );
      if (missing) {
        useAiCreatorStore.setState({ currentInfoField: missing });
        pushBot(askFieldPrompt(missing));
        appendMessage({ id: '', kind: 'product-info-prompt', field: missing });
        return;
      }
      // Hepsi tamam → upload
      await runProductUpload();
      return;
    }

    // Tek alan submit
    const cur = [...messages].reverse().find(
      (m) => m.kind === 'product-info-prompt' && m.field === currentInfoField && !m.resolved,
    );
    if (cur) resolveMessage(cur.id, { resolved: value });
    setProductInfoField(currentInfoField, value);
    pushUser(value);

    const idx = PRODUCT_INFO_ORDER.indexOf(currentInfoField);
    const next = PRODUCT_INFO_ORDER[idx + 1];
    if (next) {
      useAiCreatorStore.setState({ currentInfoField: next });
      pushBot(askFieldPrompt(next));
      appendMessage({ id: '', kind: 'product-info-prompt', field: next });
    } else {
      await runProductUpload();
    }
  };

  const runProductUpload = async () => {
    if (!currentCompany?.id) return;
    const info = useAiCreatorStore.getState().productInfo;
    const imageUrl = useAiCreatorStore.getState().lastImageUrl;
    let storeId = useAiCreatorStore.getState().selectedStoreId;
    if (!storeId) {
      // Tek mağaza varsa otomatik seç
      const active = stores.filter((s) => s.status === 'ACTIVE');
      if (active.length === 1) {
        storeId = active[0].id;
        setSelectedStoreId(active[0].id);
      } else if (active.length === 0) {
        pushBot('Aktif bir mağazanız yok. Lütfen önce Entegrasyonlar sayfasından bir mağaza ekleyin.');
        setStep('done');
        return;
      } else {
        // Birden fazla — ilkini al, ileride store seçici eklenebilir
        storeId = active[0].id;
        setSelectedStoreId(active[0].id);
      }
    }
    if (!imageUrl) {
      pushBot('Görsel bulunamadı, ürün oluşturulamadı.');
      setStep('done');
      return;
    }

    setStep('uploading-product');
    const pending = `pending-upload-${Date.now()}`;
    appendMessage({ id: pending, kind: 'pending', label: 'Ürün siteye yükleniyor…' });

    const created = await createProductFromGuidedSession(currentCompany.id, {
      storeId,
      name: info.name,
      description: info.description,
      sku: info.sku,
      imageUrl,
      price: info.price ?? 0,
      stockQuantity: info.stockQuantity ?? 0,
      variations: info.variations,
    });

    useAiCreatorStore.setState((s) => ({
      messages: s.messages.filter((m) => m.id !== pending),
    }));

    if (created) {
      pushBot(`✓ Ürün siteye yüklendi (id: ${created.id || '—'}). Yeni bir ürün için "Yeni sohbet" başlatabilirsiniz.`);
    } else {
      pushBot('Ürün yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    }
    setStep('done');
  };

  /* ---------------- UI ---------------- */

  const isDrawer = variant === 'drawer';

  if (!hasIntegration) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-foreground">Fal.ai bağlı değil</p>
        <p className="mt-1 text-xs text-muted">
          AI üretim için önce Entegrasyonlar sayfasından bir Fal.ai hesabı bağlayın ve en az
          bir ürün türü tanımlayın.
        </p>
        {currentCompany?.slug && (
          <Link
            href={`/${currentCompany.slug}/stores`}
            className="mt-3 text-xs font-semibold text-accent underline"
          >
            Entegrasyonlara git
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg"
      style={{
        background: 'lch(98 0 142.924)',
        border: '0.5px solid lch(94.6 0 142.924)',
        boxShadow:
          'lch(0 0 0 / 0.02) 0px 6px 18px, lch(0 0 0 / 0.04) 0px 3px 9px, lch(0 0 0 / 0.04) 0px 1px 1px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-black/[0.02] px-3.5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-foreground/70">
            Beta
          </span>
          <button
            type="button"
            onClick={() => {
              reset();
              start('Merhaba! Üretmek istediğiniz ürün türünü seçerek başlayalım.');
            }}
            className="text-sm font-medium text-foreground hover:opacity-80"
          >
            Yeni sohbet
          </button>
        </div>
        {isDrawer && (
          <div className="flex items-center gap-0.5 text-foreground/70">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={isAiDrawerExpanded ? 'Daralt' : 'Genişlet'}
              onPress={() => toggleAiDrawerExpanded()}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.2168 8.72266C6.50798 8.42824 6.98279 8.4257 7.27734 8.7168C7.57154 9.00799 7.57423 9.48287 7.2832 9.77734L4.59863 12.5H6.2998C6.71402 12.5 7.0498 12.8358 7.0498 13.25C7.04964 13.6641 6.71392 14 6.2998 14H2.75C2.55116 14 2.36036 13.9208 2.21973 13.7803C2.07915 13.6397 2.00008 13.4488 2 13.25V9.75C2 9.33579 2.33579 9 2.75 9C3.16421 9 3.5 9.33579 3.5 9.75V11.4775L6.2168 8.72266Z" />
                <path d="M13.25 2C13.4488 2.00006 13.6397 2.07917 13.7803 2.21973C13.9208 2.36033 14 2.55119 14 2.75V6.25C14 6.66414 13.6641 6.99988 13.25 7C12.8358 7 12.5 6.66421 12.5 6.25V4.52246L9.7832 7.27734C9.49206 7.57173 9.01721 7.57419 8.72266 7.2832C8.42838 6.99201 8.42575 6.51716 8.7168 6.22266L11.4014 3.5H9.7002C9.28598 3.5 8.9502 3.16421 8.9502 2.75C8.95028 2.33586 9.28603 2 9.7002 2H13.25Z" />
              </svg>
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" isIconOnly aria-label="Kapat" onPress={onClose}>
                <Xmark className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="flex flex-col">
              <MessageView
                message={m}
                types={types}
                onTypeSelect={handleTypeSelect}
                onProductFile={handleProductImageFile}
                productFileRef={productFileRef}
                onImageFeedback={handleImageFeedback}
                onImageComment={handleImageComment}
                onVideoConfirm={handleVideoConfirm}
                onVideoPrompt={handleVideoPrompt}
                onVideoFeedback={handleVideoFeedback}
                onVideoComment={handleVideoComment}
                onUploadConfirm={handleUploadConfirm}
                onProductInfoSubmit={handleProductInfoSubmit}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Message renderers ---------------- */

interface MessageViewProps {
  message: GuidedMessage;
  types: ProductType[];
  onTypeSelect: (t: ProductType) => void;
  onProductFile: (file: File) => void;
  productFileRef: React.RefObject<HTMLInputElement | null>;
  onImageFeedback: (liked: boolean) => void;
  onImageComment: (comment: string) => void;
  onVideoConfirm: (yes: boolean) => void;
  onVideoPrompt: (text: string) => void;
  onVideoFeedback: (liked: boolean) => void;
  onVideoComment: (comment: string) => void;
  onUploadConfirm: (yes: boolean) => void;
  onProductInfoSubmit: (value: string) => void;
}

function MessageView(p: MessageViewProps) {
  const m = p.message;
  switch (m.kind) {
    case 'bot-text':
      return <BotBubble>{m.text}</BotBubble>;
    case 'user-text':
      return <UserBubble>{m.text}</UserBubble>;
    case 'bot-image':
      return (
        <div className="self-start">
          <MediaCard url={m.url} caption={m.caption ?? 'Görsel'} type="image" />
        </div>
      );
    case 'bot-video':
      return (
        <div className="self-start">
          <MediaCard url={m.url} caption={m.caption ?? 'Video'} type="video" />
        </div>
      );
    case 'user-image':
      return (
        <div className="self-end">
          <MediaCard url={m.url} caption="Yüklediğiniz görsel" type="image" compact />
        </div>
      );
    case 'pending':
      return <PendingBubble label={m.label} />;
    case 'type-picker':
      return (
        <TypePicker types={p.types} disabled={!!m.resolvedTypeId} onSelect={p.onTypeSelect} />
      );
    case 'product-image-uploader':
      return (
        <ProductImageUploader
          disabled={!!m.resolved}
          onFile={p.onProductFile}
          fileRef={p.productFileRef}
        />
      );
    case 'image-feedback':
      return (
        <FeedbackButtons disabled={!!m.resolved} resolved={m.resolved} onChoose={p.onImageFeedback} />
      );
    case 'video-feedback':
      return (
        <FeedbackButtons disabled={!!m.resolved} resolved={m.resolved} onChoose={p.onVideoFeedback} />
      );
    case 'video-confirm':
      return (
        <YesNoButtons
          disabled={!!m.resolved}
          resolved={m.resolved}
          onChoose={p.onVideoConfirm}
          yesLabel="Evet, video üretelim"
          noLabel="Hayır"
        />
      );
    case 'upload-confirm':
      return (
        <YesNoButtons
          disabled={!!m.resolved}
          resolved={m.resolved}
          onChoose={p.onUploadConfirm}
          yesLabel="Evet, siteye yükle"
          noLabel="Hayır"
        />
      );
    case 'comment-input':
      return (
        <TextInputRow
          disabled={!!m.resolved}
          placeholder={m.placeholder}
          submitLabel="Gönder"
          onSubmit={(v) => (m.target === 'image' ? p.onImageComment(v) : p.onVideoComment(v))}
        />
      );
    case 'video-prompt-input':
      return (
        <TextInputRow
          disabled={!!m.resolved}
          placeholder="Örn. 'modelin etrafında yavaş bir kamera dönüşü, sıcak ışık'"
          submitLabel="Video Üret"
          onSubmit={p.onVideoPrompt}
        />
      );
    case 'product-info-prompt':
      return (
        <TextInputRow
          disabled={!!m.resolved}
          placeholder={`${PRODUCT_INFO_LABELS[m.field]}...`}
          submitLabel="Devam"
          onSubmit={p.onProductInfoSubmit}
        />
      );
    default:
      return null;
  }
}

/* ---------------- Sub-components ---------------- */

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-surface-secondary/60 px-4 py-2.5 text-sm text-foreground">
      {children}
    </div>
  );
}

/** Pending state — etiket + geçen süre sayacı ("0:42"). Kullanıcıya
 *  beklemenin ne kadar sürdüğünü göstermek için. */
function PendingBubble({ label }: { label: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const mm = Math.floor(elapsed / 60)
    .toString()
    .padStart(1, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');
  return (
    <BotBubble>
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          {label}
        </span>
        <span className="text-[11px] text-muted">
          Geçen süre: {mm}:{ss}
          {elapsed >= 30 && elapsed < 90 && ' (genelde 30-60 sn sürer)'}
          {elapsed >= 90 && ' — uzun sürüyor, model yoğun olabilir'}
        </span>
      </span>
    </BotBubble>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-foreground">
      {children}
    </div>
  );
}

function MediaCard({
  url,
  caption,
  type,
  compact,
}: {
  url: string;
  caption: string;
  type: 'image' | 'video';
  compact?: boolean;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-black/10 bg-surface ${
        compact ? 'max-w-[180px]' : 'max-w-[360px]'
      }`}
    >
      {type === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={caption} className="w-full" />
      ) : (
        <video src={url} controls className="w-full" />
      )}
      <figcaption className="flex items-center justify-between px-3 py-2 text-[11px] text-muted">
        <span>{caption}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground hover:bg-surface-secondary"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          İndir
        </a>
      </figcaption>
    </figure>
  );
}

function TypePicker({
  types,
  disabled,
  onSelect,
}: {
  types: ProductType[];
  disabled: boolean;
  onSelect: (t: ProductType) => void;
}) {
  if (types.length === 0) {
    return (
      <BotBubble>
        Henüz tür tanımlanmamış. Entegrasyonlar &gt; Yönet bölümünden ürün türü ekleyip
        referans görseli yükleyin, sonra burada kullanabilirsiniz.
      </BotBubble>
    );
  }
  return (
    <div className="flex max-w-full flex-wrap gap-2 self-start">
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => !disabled && onSelect(t)}
          disabled={disabled}
          className="group flex items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-1.5 text-sm hover:border-accent/40 disabled:cursor-default disabled:opacity-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.referenceImageUrl} alt={t.name} className="h-8 w-8 rounded-md object-cover" />
          <span className="font-medium">{t.name}</span>
        </button>
      ))}
    </div>
  );
}

function ProductImageUploader({
  disabled,
  onFile,
  fileRef,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  if (disabled) return null;
  return (
    <div className="w-full max-w-[360px] self-start">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-center transition-colors ${
          dragOver
            ? 'border-accent bg-accent/5'
            : 'border-border bg-surface-secondary/30 hover:border-accent/40'
        }`}
      >
        <span className="text-sm text-foreground">
          {dragOver
            ? 'Bırakın'
            : 'Ürün görselini buraya sürükleyin veya tıklayıp seçin'}
        </span>
        <span className="text-xs text-muted">PNG, JPG, WEBP</span>
      </label>
    </div>
  );
}

function FeedbackButtons({
  disabled,
  resolved,
  onChoose,
}: {
  disabled: boolean;
  resolved?: 'liked' | 'disliked';
  onChoose: (liked: boolean) => void;
}) {
  return (
    <div className="flex gap-2 self-start">
      <Button
        variant={resolved === 'liked' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => !disabled && onChoose(true)}
        isDisabled={disabled}
      >
        <Check className="h-4 w-4" />
        Beğendim
      </Button>
      <Button
        variant={resolved === 'disliked' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => !disabled && onChoose(false)}
        isDisabled={disabled}
      >
        <Trash2 className="h-4 w-4" />
        Beğenmedim
      </Button>
    </div>
  );
}

function YesNoButtons({
  disabled,
  resolved,
  onChoose,
  yesLabel,
  noLabel,
}: {
  disabled: boolean;
  resolved?: 'yes' | 'no';
  onChoose: (yes: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex gap-2 self-start">
      <Button
        variant={resolved === 'yes' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => !disabled && onChoose(true)}
        isDisabled={disabled}
      >
        {yesLabel}
      </Button>
      <Button
        variant={resolved === 'no' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => !disabled && onChoose(false)}
        isDisabled={disabled}
      >
        {noLabel}
      </Button>
    </div>
  );
}

function TextInputRow({
  disabled,
  placeholder,
  submitLabel,
  onSubmit,
}: {
  disabled: boolean;
  placeholder: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  if (disabled) return null;
  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };
  return (
    <div className="flex w-full max-w-[480px] gap-2 self-start">
      <TextField value={value} onChange={setValue} className="flex-1">
        <Label className="sr-only">Mesaj</Label>
        <Input
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </TextField>
      <Button onPress={submit} isDisabled={!value.trim()}>
        <ArrowRight className="h-4 w-4" />
        {submitLabel}
      </Button>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function askFieldPrompt(f: ProductInfoField): string {
  switch (f) {
    case 'name':
      return 'Ürün adı nedir? (Hepsini tek mesajda yazmak isterseniz: "ad: Bordo Kazak, fiyat: 599, sku: KZB-001, stok: 12, beden: M; renk: bordo")';
    case 'description':
      return 'Ürün açıklaması?';
    case 'sku':
      return 'SKU kodu?';
    case 'price':
      return 'Fiyatı (TL)?';
    case 'stockQuantity':
      return 'Stok adedi?';
    case 'variations':
      return 'Varyasyonları yazın (boş bırakılabilir). Örn: "Renk: Bordo, Beden: M; Renk: Siyah, Beden: L"';
  }
}

function isFieldMissing(f: ProductInfoField, info: ReturnType<typeof useAiCreatorStore.getState>['productInfo']): boolean {
  if (f === 'variations') return false; // optional
  if (f === 'price') return info.price == null;
  if (f === 'stockQuantity') return info.stockQuantity == null;
  return !String(info[f] ?? '').trim();
}

/** Kullanıcının "ad: X, fiyat: Y, sku: Z" gibi anahtar-değer mesajını parse et.
 *  Hiçbir tanınan anahtar yoksa null döner. */
function tryParseAllInfo(text: string): Partial<Record<ProductInfoField, string>> | null {
  const result: Partial<Record<ProductInfoField, string>> = {};
  const lower = text.toLowerCase();
  // Anahtar eşleştirmeleri
  const matchers: Array<{ key: ProductInfoField; patterns: RegExp[] }> = [
    {
      key: 'name',
      patterns: [/(?:ad|isim|name)\s*[:=]\s*([^,;\n]+)/i],
    },
    {
      key: 'description',
      patterns: [/(?:a[çc][ıi]klama|description|desc)\s*[:=]\s*([^,;\n]+)/i],
    },
    {
      key: 'sku',
      patterns: [/sku\s*[:=]\s*([^,;\s]+)/i],
    },
    {
      key: 'price',
      patterns: [/(?:fiyat|price)\s*[:=]?\s*([0-9.,]+)/i],
    },
    {
      key: 'stockQuantity',
      patterns: [/(?:stok|stock|adet)\s*[:=]?\s*([0-9]+)/i],
    },
  ];
  let foundAny = false;
  for (const { key, patterns } of matchers) {
    for (const re of patterns) {
      const match = text.match(re);
      if (match) {
        result[key] = match[1].trim();
        foundAny = true;
        break;
      }
    }
  }
  // Varyasyonları algıla — "renk:..., beden:..." gibi parçalar
  if (/renk\s*[:=]|beden\s*[:=]|color\s*[:=]|size\s*[:=]/i.test(lower)) {
    // Tüm anahtar-değer kalıntılarını al, attr olarak kabul et
    const variationParts = text.match(/(?:renk|beden|color|size)\s*[:=]\s*[^,;]+/gi);
    if (variationParts && variationParts.length > 0) {
      result.variations = variationParts.join('; ');
      foundAny = true;
    }
  }
  return foundAny ? result : null;
}
