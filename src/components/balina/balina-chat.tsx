'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/components/ui/cn';
import {
  BalinaChatInput,
  type BalinaChatInputHandle,
  type BalinaChatMode,
} from './balina-chat-input';
import { BalinaAvatar } from './balina-avatar';
import { BalinaButton } from './balina-button';
import { BalinaTooltip } from './balina-tooltip';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useBalinaScrollbar } from './use-balina-scrollbar';
import {
  BalinaFloatingIcon,
  BalinaSidebarIcon,
  BalinaCloseIcon,
  BalinaThinkingIcon,
  BalinaSearchIcon,
  BalinaCopyIcon,
  BalinaLikeIcon,
  BalinaDislikeIcon,
  BalinaRegenerateIcon,
  BalinaDownloadIcon,
  type BalinaIconProps,
} from './icons';

/* Balina Chat — kaynak .assistant_* / .UserMessage_* / .AiStatus_* / .AiResponse_*
 * spec'lerinin portu. Asistan paneli: header + kaydırılabilir mesajlar + composer. */

function HeaderIconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <BalinaTooltip content={label} side="bottom">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          'flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors focus-visible:outline-none',
          active
            ? 'bg-[var(--balina-background-dark-default)] text-[var(--balina-icon-loud)]'
            : 'text-[var(--balina-icon-strong)] hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)]',
        )}
      >
        {children}
      </button>
    </BalinaTooltip>
  );
}

/** Kullanıcı mesajı — sağa yaslı baloncuk. */
export function BalinaChatUserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end px-3 py-1">
      <div className="text-body-mail w-fit max-w-[80%] whitespace-pre-wrap break-words rounded-3xl bg-[var(--balina-background-dark-default)] px-4 py-2.5 text-[var(--balina-text-shout)]">
        {children}
      </div>
    </div>
  );
}

/** AI durum satırı — düşünme (thinking) veya sonuç (results). */
export function BalinaChatStatus({
  variant = 'thinking',
  avatars,
  children,
}: {
  variant?: 'thinking' | 'results';
  avatars?: string[];
  children: React.ReactNode;
}) {
  const Icon = variant === 'results' ? BalinaSearchIcon : BalinaThinkingIcon;
  const thinking = variant === 'thinking';
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-left">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--balina-icon-default)]">
        <Icon className="h-4 w-4" />
      </span>
      <span
        className={
          thinking
            ? 'ai-text-shimmer text-body-small-regular'
            : 'text-body-small-regular text-[var(--balina-text-default)]'
        }
      >
        {children}
      </span>
      {avatars && avatars.length > 0 && (
        <div className="ml-1 flex items-center gap-1.5">
          {avatars.map((src, i) => (
            <BalinaAvatar key={i} size="medium" src={src} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionIconButton({ Icon, label }: { Icon: (p: BalinaIconProps) => React.ReactElement; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--balina-icon-strong)] transition-colors hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)]"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** AI yanıtı — gövde içeriği + aksiyon satırı (Insert + kopya/beğen/beğenme/yeniden). */
export function BalinaChatAiResponse({
  children,
  onInsert,
}: {
  children: React.ReactNode;
  onInsert?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-1">
      <div className="text-body-mail flex flex-col gap-2 px-1 text-[var(--balina-text-shout)]">
        {children}
      </div>
      <div className="flex items-center gap-1 py-1">
        <button
          type="button"
          onClick={onInsert}
          className="text-body-small-one-liner-medium flex h-7 items-center rounded-lg px-2 text-[var(--balina-text-strong)] transition-colors hover:bg-[var(--balina-background-dark-default)]"
        >
          Insert
        </button>
        <div className="mx-1 h-3 w-px rounded-full bg-[var(--balina-border-strong)]" />
        <ActionIconButton Icon={BalinaCopyIcon} label="Kopyala" />
        <ActionIconButton Icon={BalinaLikeIcon} label="Beğen" />
        <ActionIconButton Icon={BalinaDislikeIcon} label="Beğenme" />
        <ActionIconButton Icon={BalinaRegenerateIcon} label="Yeniden oluştur" />
      </div>
    </div>
  );
}

/** AI metnini daktilo efektiyle (harf harf) yazar. Mount'ta bir kez animasyon
 *  oynar — mesaj listesi key'li olduğu için eski mesajlar yeniden animasyona
 *  girmez. */
export function BalinaChatTypingText({
  text,
  speed = 14,
}: {
  text: string;
  speed?: number;
}) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!text) return;
    setCount(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && (
        <span className="ai-text-shimmer">▍</span>
      )}
    </span>
  );
}

export interface BalinaChatProps {
  title?: string;
  children?: React.ReactNode;
  /** Composer'ın hemen üstünde sabit duran hızlı aksiyonlar. `fill` ile
   *  tıklayınca composer'a metin yazdırılır. */
  quickActions?: (fill: (prompt: string) => void) => React.ReactNode;
  /** Yüzen (serbest sürüklenebilir) mod — kontrollü. */
  floating?: boolean;
  onSend?: (value: string) => void;
  onToggleFloating?: () => void;
  /** Yüzen modda header'a basıldığında sürüklemeyi başlatır. */
  onHeaderPointerDown?: (e: React.PointerEvent) => void;
  /** Sürükle-bırak/ataç ile dosya eklendiğinde. */
  onFiles?: (files: File[]) => void;
  /** Composer bağlam satırı içeriği (ürün picker'ı + dosya chip'leri). */
  contextSlot?: React.ReactNode;
  /** "@"/"Bağlam ekle" tetiklenince. */
  onAddContext?: () => void;
  /** Composer imperative API (hızlı aksiyon prompt'u + ürün ekleme için). */
  inputRef?: React.RefObject<BalinaChatInputHandle | null>;
  /** Composer modu (sohbet/görsel/video) — kontrollü. */
  mode?: BalinaChatMode;
  onModeChange?: (mode: BalinaChatMode) => void;
  /** Sohbet modunda gösterilen model seçenekleri (boşsa gizli). */
  textModels?: { id: string; label: string }[];
  textModel?: string;
  onTextModelChange?: (id: string) => void;
  onClose?: () => void;
  className?: string;
}

/** Hızlı aksiyon satırı (ikon + etiket) — hover'da pill arka plan. */
export function BalinaChatQuickAction({
  icon,
  onClick,
  children,
}: {
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit cursor-pointer items-center gap-2 rounded-[0.625rem] px-2 py-1.5 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] focus-visible:outline-none"
    >
      {icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
          {icon}
        </span>
      )}
      <span className="text-body-small-one-liner-medium text-[var(--balina-text-strong)]">
        {children}
      </span>
    </button>
  );
}

/** Programatik indirme. Cross-origin URL'lerde (`fal.media` vb.) `<a download>`
 *  sessizce yok sayılıp sayfa medya URL'sine gidebiliyor; bu yüzden önce fetch
 *  ile blob'a çevirip same-origin blob URL üzerinden indiriyoruz. CORS/network
 *  hatasında fallback: yeni sekmede aç. */
async function triggerDownload(url: string, filename: string): Promise<void> {
  const clickAnchor = (href: string, newTab?: boolean) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    if (newTab) a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    clickAnchor(url);
    return;
  }
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    clickAnchor(blobUrl);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    clickAnchor(url, true);
  }
}

/** Tam ekran medya önizlemesi — kaynak .PreviewFileOverlay_* spec'inin portu.
 *  Backdrop blur'lu zemin; tıklama / Escape / kapat butonu ile kapanır. */
export function BalinaChatMediaOverlay({
  url,
  type,
  filename,
  onClose,
}: {
  url: string;
  type: 'image' | 'video';
  filename: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] grid select-none place-items-center bg-[var(--balina-neutral-dark-90)] backdrop-blur-[12px]"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute left-6 top-6 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--balina-neutral-light-20)] text-[var(--balina-neutral-light-100)] outline-none transition-colors hover:bg-[var(--balina-neutral-light-10)] focus-visible:outline-none"
      >
        <BalinaCloseIcon className="h-4 w-4" />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full max-w-full flex-col items-center gap-3 p-8"
      >
        {type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={filename}
            className="max-h-[80vh] max-w-[90vw] rounded-[10px] object-contain"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-[90vw] rounded-[10px]"
          />
        )}
        <div className="flex items-center gap-2 text-[var(--balina-neutral-light-90)]">
          <span className="text-body-tiny-regular">{filename}</span>
          <button
            type="button"
            aria-label="İndir"
            onClick={() => triggerDownload(url, filename)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--balina-neutral-light-90)] outline-none transition-colors hover:bg-white/10 focus-visible:outline-none"
          >
            <BalinaDownloadIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Sohbet medya kartı — üretilen görsel/video.
 *  - `card` (varsayılan): preview + altta dosya adı/uzantı; hover'da metadata
 *    blur'lanıp yukarı kayar, alttan "İndir" butonu fade-in olur (mobilde buton
 *    her zaman görünür).
 *  - `compact`: yalnızca küçük önizleme (kullanıcı baloncuğundaki yüklemeler).
 *  Her iki modda da tıklayınca tam ekran önizleme açılır. */
export function BalinaChatMedia({
  url,
  type,
  compact,
  name,
}: {
  url: string;
  type: 'image' | 'video';
  compact?: boolean;
  /** İndirme dosya adı tabanı — görsel için verilen ürün kodu. */
  name?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ext = type === 'image' ? 'jpg' : 'mp4';
  const base = name?.trim() || (type === 'image' ? 'gorsel' : 'video');
  const filename = `${base}.${ext}`;

  const overlay = open && (
    <BalinaChatMediaOverlay
      url={url}
      type={type}
      filename={filename}
      onClose={() => setOpen(false)}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Önizleme aç"
          className="block cursor-pointer overflow-hidden rounded-xl outline-none focus-visible:outline-none"
        >
          {type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="block max-h-48 w-auto object-cover" />
          ) : (
            <video
              src={url}
              muted
              loop
              playsInline
              autoPlay
              className="block max-h-48 w-auto"
            />
          )}
        </button>
        {overlay}
      </>
    );
  }

  const media =
    type === 'image' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="block w-full" />
    ) : (
      <video src={url} muted loop playsInline autoPlay className="block w-full" />
    );

  return (
    <>
      <div className="group relative flex w-full max-w-[10rem] cursor-pointer flex-col gap-1 rounded-3xl pb-3 transition-colors hover:bg-[var(--balina-background-dark-muted)]">
        <div className="flex flex-1 items-center justify-center p-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Önizleme aç"
            className="relative block w-full overflow-hidden rounded-[10px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.18)] outline-none focus-visible:outline-none"
          >
            {media}
          </button>
        </div>

        {/* Metadata — mobilde hep görünür; md+ hover'da blur+fade, yukarı kayar. */}
        <div className="pointer-events-none flex flex-col items-center gap-0.5 transition-all duration-200 md:group-hover:-translate-y-2.5 md:group-hover:opacity-0 md:group-hover:blur-sm">
          <span className="text-body-small-one-liner-regular text-[var(--balina-text-strong)]">
            {filename}
          </span>
          <span className="text-body-tiny-regular text-[var(--balina-text-muted)]">
            {ext.toUpperCase()}
          </span>
        </div>

        {/* Aksiyon — mobilde metadata altında statik & hep görünür; md+ absolute
            + hover'da alttan fade-in. */}
        <div className="mt-1 flex items-center justify-center md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:translate-y-[10%] md:opacity-0 md:blur-sm md:transition-all md:duration-200 md:group-hover:pointer-events-auto md:group-hover:-translate-y-4 md:group-hover:opacity-100 md:group-hover:blur-none">
          <BalinaButton
            variant="soft"
            size="large"
            rightIcon={<BalinaDownloadIcon className="h-4 w-4" />}
            onClick={() => triggerDownload(url, filename)}
            className="rounded-full"
          >
            İndir
          </BalinaButton>
        </div>
      </div>
      {overlay}
    </>
  );
}

export function BalinaChat({
  title = 'balinaOS AI',
  children,
  quickActions,
  floating = false,
  onSend,
  onToggleFloating,
  onHeaderPointerDown,
  onFiles,
  contextSlot,
  onAddContext,
  inputRef,
  mode,
  onModeChange,
  textModels,
  textModel,
  onTextModelChange,
  onClose,
  className,
}: BalinaChatProps) {
  const scrollRef = useBalinaScrollbar<HTMLDivElement>();
  const fillDraft = React.useCallback(
    (p: string) => inputRef?.current?.setText(p),
    [inputRef],
  );
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden',
        floating
          ? 'shadow-raised rounded-t-[1.125rem] rounded-b-[1.75rem] backdrop-blur-[24px]'
          : 'shadow-panel-surface rounded-[0.625rem]',
        className,
      )}
      style={{ backgroundImage: 'var(--balina-panel-surface)' }}
    >
      {/* Header — yüzen modda sürükleme tutamacı */}
      <div
        onPointerDown={floating ? onHeaderPointerDown : undefined}
        className={cn(
          'flex h-12 shrink-0 items-center justify-between gap-1 border-b border-[var(--balina-background-light-default)] p-2.5',
          floating && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <div className="flex h-7 items-center gap-1.5 px-1">
          <BalinaOsMark className="h-5 w-5" aria-label="balinaOS" />
          <span className="text-body-small-one-liner-medium text-[var(--balina-text-strong)]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <HeaderIconButton
            label={floating ? 'Panele tuttur' : 'Yüzen pencere'}
            active={floating}
            onClick={onToggleFloating}
          >
            {floating ? (
              <BalinaSidebarIcon className="h-4 w-4" />
            ) : (
              <BalinaFloatingIcon className="h-4 w-4" />
            )}
          </HeaderIconButton>
          <HeaderIconButton label="Kapat" onClick={onClose}>
            <BalinaCloseIcon className="h-4 w-4" />
          </HeaderIconButton>
        </div>
      </div>

      {/* Mesajlar */}
      <div
        ref={scrollRef}
        className="balina-scrollbar min-h-0 flex-1 overflow-y-auto px-2"
        style={{
          maskImage: 'linear-gradient(180deg, transparent, #000 5%, #000)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 5%, #000)',
        }}
      >
        <div className="flex flex-col gap-4 py-4">{children}</div>
      </div>

      {/* Hızlı aksiyonlar — composer'ın hemen üstünde sabit; tıklayınca
          ilgili prompt composer'a yazdırılır. */}
      {quickActions && (
        <div className="flex shrink-0 flex-col gap-0.5 px-4 py-1">
          {/* fillDraft yalnızca tıklamada ref'e erişir (render'da değil). */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {quickActions(fillDraft)}
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 p-2">
        <BalinaChatInput
          ref={inputRef}
          onSend={onSend}
          onFiles={onFiles}
          contextSlot={contextSlot}
          onAddContext={onAddContext}
          mode={mode}
          onModeChange={onModeChange}
          textModels={textModels}
          textModel={textModel}
          onTextModelChange={onTextModelChange}
        />
      </div>
    </div>
  );
}
