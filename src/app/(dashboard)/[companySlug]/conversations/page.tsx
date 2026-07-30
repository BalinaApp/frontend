'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Archive,
  ArrowShapeTurnUpLeft,
  Comments,
  Ellipsis,
  Magnifier,
  PaperPlane,
  Star,
  StarFill,
  TriangleExclamation,
  Xmark,
} from '@gravity-ui/icons';
import {
  BalinaButton,
  BalinaChip,
  BalinaInput,
  BalinaTooltip,
  toast,
} from '@/components/balina';
import { usePageTitle } from '@/hooks/use-page-title';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import {
  useChatThreadStore,
  type ChatMessage,
  type ChatThreadListItem,
  type ThreadStatus,
} from '@/stores/chatThreadStore';

const POLL_INTERVAL_MS = 45_000;

/** Meta'nın görsel içeren mesaj tipleri. Gönderi/story/reel paylaşımları da
 *  resim URL'i taşır; yalnızca 'image' kontrol edilirse panelde link olarak
 *  görünür ve admin müşterinin ne gönderdiğini göremez. */
const VISUAL_MEDIA_TYPES = [
  'image',
  'ig_post',
  'ig_story',
  'story_reply',
  'reel',
  'share',
];

const STATUS_LABEL: Record<ThreadStatus, string> = {
  ai: 'AI',
  observing: 'Gözlem',
  human_takeover: 'Devralındı',
  closed: 'Kapandı',
};

const STATUS_CHIP_COLOR: Record<
  ThreadStatus,
  'success' | 'warning' | 'accent' | 'neutral'
> = {
  ai: 'success',
  observing: 'accent',
  human_takeover: 'warning',
  closed: 'neutral',
};

const STATUS_TABS: { id: ThreadStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: 'observing', label: 'Gözlem' },
  { id: 'ai', label: 'AI' },
  { id: 'human_takeover', label: 'Devralındı' },
  { id: 'closed', label: 'Kapandı' },
];

export default function ConversationsPage() {
  usePageTitle('Sohbetler');
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    threads,
    total,
    selectedThread,
    selectedMessages,
    isLoadingList,
    isLoadingDetail,
    fetchThreads,
    fetchThreadDetail,
    toggleTakeover,
    sendAdminMessage,
    refreshMessages,
    clearSelected,
  } = useChatThreadStore();

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<ThreadStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(() => new Set());

  void slug;

  const refreshList = useCallback(() => {
    if (!currentCompany?.id) return;
    fetchThreads(currentCompany.id, {
      status: statusTab === 'all' ? undefined : statusTab,
      search: search.trim() || undefined,
      limit: 100,
    });
  }, [currentCompany?.id, statusTab, search, fetchThreads]);

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!currentCompany?.id || !selectedId) {
      clearSelected();
      return;
    }
    fetchThreadDetail(currentCompany.id, selectedId);
  }, [currentCompany?.id, selectedId, fetchThreadDetail, clearSelected]);

  // Canlı akış (SSE). Backend şirket geneli event yayınlıyor; yeni mesaj
  // geldiğinde listeyi ve (açıksa) seçili sohbeti anında tazeliyoruz.
  // EventSource header gönderemediği için fetch + ReadableStream kullanıyoruz —
  // token'ı URL'e koymak zorunda kalmıyoruz.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  // Tazeleme mantığını ref'te tutuyoruz: aksi halde arama kutusuna yazdıkça
  // refreshList kimliği değişir ve stream her tuşta yeniden kurulurdu.
  const onEventRef = useRef<() => void>(() => {});
  onEventRef.current = () => {
    refreshList();
    const openThread = selectedIdRef.current;
    if (openThread && currentCompany?.id) {
      refreshMessages(currentCompany.id, openThread);
    }
  };

  useEffect(() => {
    const companyId = currentCompany?.id;
    if (!companyId) return;

    const controller = new AbortController();
    let cancelled = false;
    let retryTimer: number | undefined;

    const onEvent = () => onEventRef.current();

    const connect = async () => {
      let token: string | null = null;
      try {
        const raw = localStorage.getItem('auth-storage');
        token = raw ? (JSON.parse(raw)?.state?.accessToken ?? null) : null;
      } catch {
        token = null;
      }
      const base =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';
      try {
        const res = await fetch(`${base}/company/${companyId}/chat-stream`, {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE paketleri boş satırla ayrılır; 'ping' dışındakiler tazeleme tetikler.
          const packets = buffer.split('\n\n');
          buffer = packets.pop() ?? '';
          for (const packet of packets) {
            if (!packet.includes('data:')) continue;
            if (/^event:\s*ping/m.test(packet)) continue;
            onEvent();
          }
        }
        throw new Error('stream kapandı');
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        void err;
        // Bağlantı koparsa (deploy, uyku, ağ) 5 sn sonra yeniden dene.
        retryTimer = window.setTimeout(connect, 5_000);
      }
    };

    void connect();
    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
    // Yalnızca şirket değişince yeniden bağlan.
  }, [currentCompany?.id]);

  // SSE koparsa sessizce geride kalmayalım — seyrek bir emniyet ağı.
  useEffect(() => {
    if (!currentCompany?.id || !selectedId) return;
    const interval = window.setInterval(() => {
      refreshMessages(currentCompany.id!, selectedId);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentCompany?.id, selectedId, refreshMessages]);

  const selectedIndex = useMemo(
    () => (selectedId ? threads.findIndex((t) => t.id === selectedId) : -1),
    [threads, selectedId],
  );

  const counts = useMemo(() => {
    const c: Record<ThreadStatus, number> = {
      ai: 0,
      observing: 0,
      human_takeover: 0,
      closed: 0,
    };
    for (const t of threads) c[t.status]++;
    return c;
  }, [threads]);

  const handleTakeover = async (takeover: boolean) => {
    if (!currentCompany?.id || !selectedId) return;
    const result = await toggleTakeover(
      currentCompany.id,
      selectedId,
      takeover,
    );
    if (result) {
      toast.success(takeover ? 'Sohbeti devraldın' : 'AI sohbete geri verildi');
    } else {
      toast.danger('İşlem başarısız');
    }
  };

  const toggleStar = (threadId: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const storeName = (id: string | null | undefined) =>
    stores.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-1">
      {/* SOL: thread list */}
      <aside className="flex w-[380px] shrink-0 flex-col gap-2 p-2">
        {/* Search */}
        <BalinaInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Sohbet ara"
          placeholder="Ara..."
          leftIcon={<Magnifier className="h-4 w-4" />}
          wrapperClassName="mx-1"
        />

        {/* Status tabs */}
        <div className="mx-1 flex items-center gap-0.5 rounded-full bg-surface-secondary p-0.5">
          {STATUS_TABS.map((t) => {
            const active = statusTab === t.id;
            const countText =
              t.id !== 'all' && counts[t.id as ThreadStatus] > 0
                ? ` (${counts[t.id as ThreadStatus]})`
                : '';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusTab(t.id)}
                className={[
                  'flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground',
                ].join(' ')}
              >
                {t.label}
                {countText}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoadingList && threads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Yükleniyor…
            </div>
          ) : threads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Henüz sohbet yok
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {threads.map((t) => (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  storeName={storeName(t.storeId) || t.storeName}
                  isSelected={selectedId === t.id}
                  isStarred={starred.has(t.id)}
                  onSelect={() => setSelectedId(t.id)}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    toggleStar(t.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-1 pb-1 pt-1 text-[11px] text-muted">
          {total} sohbet
        </div>
      </aside>

      {/* SAĞ: detail */}
      <main className="flex min-w-0 flex-1 flex-col rounded-2xl bg-background">
        {selectedId && selectedThread ? (
          <ThreadDetailPanel
            indexLabel={
              selectedIndex >= 0
                ? `${selectedIndex + 1} / ${threads.length}`
                : ''
            }
            isLoading={isLoadingDetail}
            messages={selectedMessages}
            status={selectedThread.status}
            customerName={selectedThread.instagramUsername ?? 'İsimsiz'}
            customerAvatar={selectedThread.instagramProfilePic}
            customerHandle={
              selectedThread.instagramUsername
                ? `@${selectedThread.instagramUsername}`
                : selectedThread.instagramUserId
            }
            storeName={storeName(selectedThread.storeId)}
            isStarred={starred.has(selectedId)}
            onToggleStar={() => toggleStar(selectedId)}
            onClose={() => setSelectedId(null)}
            onTakeover={() => handleTakeover(true)}
            onRelease={() => handleTakeover(false)}
            onSend={async (text) => {
              if (!currentCompany?.id || !selectedId) return false;
              const ok = await sendAdminMessage(
                currentCompany.id,
                selectedId,
                text,
              );
              if (!ok) toast.danger('Mesaj gönderilemedi');
              return ok;
            }}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Thread card (list item)
// ============================================================================

function ThreadCard({
  thread,
  storeName,
  isSelected,
  isStarred,
  onSelect,
  onToggleStar,
}: {
  thread: ChatThreadListItem;
  storeName: string;
  isSelected: boolean;
  isStarred: boolean;
  onSelect: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
}) {
  const hasUnread = thread.status === 'ai' && (thread.messageCount ?? 0) > 0;
  const initials = (thread.instagramUsername ?? thread.storeName)
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? 'true' : undefined}
      className={[
        'group relative flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
        isSelected
          ? 'border-default-300 bg-surface-secondary shadow-sm'
          : 'border-transparent hover:bg-surface-secondary/60',
      ].join(' ')}
    >
      <UserAvatar
        seed={thread.instagramUsername ?? thread.id}
        fallback={initials}
        src={thread.instagramProfilePic}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-sm font-semibold text-foreground">
            {thread.instagramUsername ?? 'İsimsiz'}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
            {formatListTime(thread.lastMessageAt)}
            {hasUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </div>
        </div>
        <div className="mt-0.5 truncate text-[13px] font-medium text-foreground/85">
          {storeName}
        </div>
        <div className="mt-0.5 flex items-end gap-2">
          <p className="line-clamp-1 flex-1 text-[12px] text-muted">
            {thread.preview || 'Önizleme yok'}
          </p>
          <span
            onClick={onToggleStar}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleStar(e as unknown as React.MouseEvent);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={isStarred ? 'Yıldızı kaldır' : 'Yıldızla'}
            className="shrink-0 rounded p-0.5 text-muted hover:text-warning"
          >
            {isStarred ? (
              <StarFill className="h-3.5 w-3.5 text-warning" />
            ) : (
              <Star className="h-3.5 w-3.5" />
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Thread detail panel
// ============================================================================

function ThreadDetailPanel({
  indexLabel,
  isLoading,
  messages,
  status,
  customerName,
  customerAvatar,
  customerHandle,
  storeName,
  isStarred,
  onToggleStar,
  onClose,
  onTakeover,
  onRelease,
  onSend,
}: {
  indexLabel: string;
  isLoading: boolean;
  messages: ChatMessage[];
  status: ThreadStatus;
  customerName: string;
  customerAvatar?: string | null;
  customerHandle: string;
  storeName: string;
  isStarred: boolean;
  onToggleStar: () => void;
  onClose: () => void;
  onTakeover: () => void;
  onRelease: () => void;
  onSend: (text: string) => Promise<boolean>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = await onSend(text);
    setSending(false);
    if (ok) {
      setDraft('');
      setReplying(false);
    }
  };

  const lastCustomerMsg = useMemo(
    () => [...messages].reverse().find((m) => m.source === 'customer'),
    [messages],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <IconButton label="Kapat" onPress={onClose}>
            <Xmark className="h-4 w-4" />
          </IconButton>
          {status === 'ai' || status === 'observing' ? (
            <IconButton label="Devral" onPress={onTakeover}>
              <TriangleExclamation className="h-4 w-4" />
            </IconButton>
          ) : status === 'human_takeover' ? (
            <IconButton label="AI'a bırak" onPress={onRelease}>
              <TriangleExclamation className="h-4 w-4 text-warning" />
            </IconButton>
          ) : null}
          <IconButton label="Arşivle" isDisabled>
            <Archive className="h-4 w-4" />
          </IconButton>
          <IconButton label="Daha fazla" isDisabled>
            <Ellipsis className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="text-sm text-muted">{indexLabel}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2" ref={scrollRef}>
        {/* Subject */}
        <div className="mb-5">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {storeName}
          </h2>
          <div className="mt-1 text-sm text-muted">
            Instagram DM ile {customerName}
          </div>
        </div>

        {/* Customer header */}
        <div className="mb-6 flex items-start gap-3">
          <UserAvatar
            seed={customerName}
            fallback={customerName.slice(0, 2)}
            size="md"
            src={customerAvatar}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-medium text-foreground">
                  {customerName}
                </div>
                <div className="truncate text-sm text-muted">
                  {customerHandle}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <BalinaChip variant={STATUS_CHIP_COLOR[status]} size="sm">
                  {STATUS_LABEL[status]}
                </BalinaChip>
                {status !== 'closed' && (
                  <IconButton
                    label="Cevapla"
                    onPress={() => setReplying((s) => !s)}
                  >
                    <ArrowShapeTurnUpLeft className="h-4 w-4" />
                  </IconButton>
                )}
                <IconButton
                  label={isStarred ? 'Yıldızı kaldır' : 'Yıldızla'}
                  onPress={onToggleStar}
                >
                  {isStarred ? (
                    <StarFill className="h-4 w-4 text-warning" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {isLoading && messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">Yükleniyor…</div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">
            Henüz mesaj yok
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      {(status === 'human_takeover' || replying) && status !== 'closed' && (
        <div className="shrink-0 border-t border-default-200 px-6 py-4">
          {status === 'human_takeover' ? (
            <Composer
              draft={draft}
              onDraft={setDraft}
              onSend={handleSend}
              isSending={sending}
              hint={lastCustomerMsg?.content ?? null}
            />
          ) : (
            <div className="rounded-xl border border-warning/40 bg-warning/[0.08] px-4 py-3 text-sm text-warning-foreground">
              Mesaj yazmak için önce <strong>Devral</strong> butonuyla sohbeti
              al.
            </div>
          )}
        </div>
      )}
      {status === 'observing' && !replying && (
        <div className="shrink-0 border-t border-default-200 px-6 py-3 text-center text-xs text-muted">
          Bu sohbet <strong>gözlem (learning)</strong> modunda — AI cevap
          üretmiyor, sadece mesajlar kaydediliyor. Devralırsan kendin cevap
          yazabilirsin; mağazayı <em>Live</em>'a alırsan AI devreye girer.
        </div>
      )}
      {status === 'closed' && (
        <div className="shrink-0 border-t border-default-200 px-6 py-3 text-center text-xs text-muted">
          Bu sohbet kapatılmış.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Composer
// ============================================================================

function Composer({
  draft,
  onDraft,
  onSend,
  isSending,
  hint,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  hint: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {hint && (
        <div className="rounded-lg bg-surface-secondary px-3 py-1.5 text-[12px] text-muted">
          <span className="font-medium text-foreground/70">Son müşteri mesajı:</span>{' '}
          <span className="line-clamp-1">{hint}</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Müşteriye mesaj yaz... (Cmd/Ctrl+Enter)"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-default-200 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-default-400"
        />
        <BalinaButton
          variant="primary"
          disabled={!draft.trim() || isSending}
          onClick={onSend}
          aria-label="Gönder"
          className="h-10 w-10 shrink-0"
        >
          <PaperPlane className="h-4 w-4" />
        </BalinaButton>
      </div>
    </div>
  );
}

// ============================================================================
// Message bubble
// ============================================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <div className="my-1 flex justify-center">
        <div className="rounded-full bg-surface-secondary px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {message.content ?? 'Sistem'}
        </div>
      </div>
    );
  }
  if (message.role === 'tool') {
    return (
      <div className="self-center my-1 max-w-[80%] rounded-lg border border-warning/30 bg-warning/[0.08] px-3 py-1.5 text-[11px] text-warning-foreground">
        <div className="font-mono opacity-60">
          tool#{(message.toolCallId ?? '').slice(0, 8)}
        </div>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px]">
          {JSON.stringify(message.toolResult, null, 2)}
        </pre>
      </div>
    );
  }

  const isCustomer = message.source === 'customer';
  const isAdmin = message.source === 'admin';
  const align = isCustomer ? 'self-start' : 'self-end';
  const bubble = isCustomer
    ? 'bg-surface-secondary text-foreground'
    : isAdmin
      ? 'bg-warning/15 text-warning-foreground'
      : 'bg-accent text-accent-foreground';
  const meta = isCustomer ? 'Müşteri' : isAdmin ? 'Admin' : 'AI';

  return (
    <div className={`flex max-w-[78%] flex-col gap-1 ${align}`}>
      <div className={`rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${bubble}`}>
        {message.toolCall && (
          <div className="mb-1 inline-flex items-center gap-1 rounded-md bg-black/10 px-1.5 py-0.5 font-mono text-[10px]">
            → {message.toolCall.name}
          </div>
        )}
        {message.content && <div>{message.content}</div>}
        {message.mediaUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.mediaUrls.map((m, i) =>
              // Paylaşılan gönderi/story/reel de görsel olarak gelir — hepsini
              // önizle, yoksa müşterinin ne gönderdiği panelde görünmüyor.
              VISUAL_MEDIA_TYPES.includes(m.type) ? (
                <figure key={i} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.title ?? ''}
                    className="max-h-40 rounded-md object-cover"
                  />
                  {m.title && (
                    <figcaption className="max-w-40 whitespace-pre-wrap text-[11px] opacity-70">
                      {m.title.length > 140 ? `${m.title.slice(0, 140)}…` : m.title}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <a
                  key={i}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] underline opacity-80"
                >
                  Medya #{i + 1}
                </a>
              ),
            )}
          </div>
        )}
      </div>
      <div className={`px-1 text-[11px] text-muted ${isCustomer ? '' : 'text-right'}`}>
        {meta} · {formatListTime(message.createdAt)}
      </div>
    </div>
  );
}

// ============================================================================
// Generic bits
// ============================================================================

function IconButton({
  label,
  onPress,
  isDisabled,
  children,
}: {
  label: string;
  onPress?: () => void;
  isDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <BalinaTooltip content={label}>
      <BalinaButton
        variant="soft"
        size="small"
        onClick={onPress}
        disabled={isDisabled}
        aria-label={label}
        className="h-9 w-9"
      >
        {children}
      </BalinaButton>
    </BalinaTooltip>
  );
}

/** Deterministik kullanıcı avatarı — username hash'inden gradient seçer.
 *  Mail uygulamasındaki renkli avatar görünümünü taklit eder. */
function UserAvatar({
  seed,
  fallback,
  size = 'sm',
  src,
}: {
  seed: string;
  fallback: string;
  size?: 'sm' | 'md';
  /** Instagram profil fotoğrafı. Meta CDN linki süreli olduğu için
   *  yüklenemezse renkli baş harf rozetine düşüyoruz. */
  src?: string | null;
}) {
  const gradients = [
    'linear-gradient(135deg,#86efac 0%,#34d399 100%)', // green
    'linear-gradient(135deg,#a5b4fc 0%,#818cf8 100%)', // indigo
    'linear-gradient(135deg,#fde68a 0%,#fb923c 100%)', // amber
    'linear-gradient(135deg,#c4b5fd 0%,#8b5cf6 100%)', // violet
    'linear-gradient(135deg,#fda4af 0%,#fb7185 100%)', // rose
    'linear-gradient(135deg,#a7f3d0 0%,#22d3ee 100%)', // teal
    'linear-gradient(135deg,#fcd34d 0%,#f59e0b 100%)', // gold
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bg = gradients[hash % gradients.length];
  const dim = size === 'md' ? 'h-10 w-10' : 'h-9 w-9';
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={fallback}
        onError={() => setImgFailed(true)}
        className={`${dim} shrink-0 rounded-full border border-white/40 object-cover shadow-sm`}
      />
    );
  }
  return (
    <div
      className={`${dim} shrink-0 rounded-full border border-white/40 shadow-sm`}
      style={{ background: bg }}
      aria-hidden="true"
    >
      <span className="sr-only">{fallback}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center text-sm text-muted">
      <Comments className="h-10 w-10 text-muted/50" aria-hidden="true" />
      <div className="font-medium text-foreground">Bir sohbet seç</div>
      <div className="max-w-xs text-xs text-muted">
        Soldan bir sohbet seçtiğinde mesajlar burada görünür.
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatListTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Dün';
  if (days < 7) {
    return d.toLocaleDateString('tr-TR', { weekday: 'short' });
  }
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
