'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { Xmark } from '@gravity-ui/icons';
import {
  BalinaHomeIcon,
  BalinaIntegrationIcon,
  BalinaProductsIcon,
  BalinaOrderIcon,
  BalinaReportIcon,
  BalinaMailIcon,
  BalinaCommentsIcon,
  BalinaSettingsIcon,
  BalinaBellIcon,
} from '@/components/balina';
import { cn } from '@/components/ui/cn';
import { useTabsStore, type WorkspaceTab } from '@/stores/tabsStore';

/* Workspace sekmeleri — kalıcı tab bar (tarayıcı tarzı). Sekmeler açık route'ları
 * temsil eder; tıklayınca o route'a gidilir. İçerik normal Next sayfasıdır
 * ({children}). Alt sayfaya geçince üst sayfa da sekme olarak görünür. */

const SECTION_LABELS: Record<string, string> = {
  products: 'Ürünler',
  orders: 'Siparişler',
  stores: 'Entegrasyonlar',
  reports: 'Raporlar',
  marketing: 'Pazarlama',
  conversations: 'Sohbetler',
  refunds: 'İadeler',
  payments: 'Ödemeler',
  notifications: 'Bildirimler',
  settings: 'Ayarlar',
  'ai-creator': 'AI Studio',
};
const DETAIL_LABELS: Record<string, string> = {
  products: 'Ürün',
  orders: 'Sipariş',
  marketing: 'Kampanya',
  // Entegrasyon detayında (/stores/[id]) üst "Entegrasyonlar" sekmesi kalkar;
  // detay sekmesinin adı/logosu sayfada useWorkspaceTab ile set edilir.
  stores: 'Entegrasyon',
};

/** Bölüm alt sayfaları (derinlik-3) için özel başlıklar — ör. marketing'in
 *  contacts/campaigns alt rotaları "Ürün/Kampanya" değil kendi adlarını alır. */
const SUBROUTE_LABELS: Record<string, Record<string, string>> = {
  marketing: { contacts: 'Kontaklar', campaigns: 'Kampanyalar' },
};

/** Route'tan sekme başlığı türet. */
export function tabTitleFor(href: string): string {
  const segs = href.split('?')[0].split('/').filter(Boolean); // [slug, section, sub, id?]
  const section = segs[1];
  if (!section) return 'Anasayfa';
  const base = SECTION_LABELS[section] ?? section;
  if (segs.length === 2) return base; // /section
  if (segs.length === 3) {
    // Alt-bölüm (marketing/contacts) ya da detay (products/[id]).
    return SUBROUTE_LABELS[section]?.[segs[2]] ?? DETAIL_LABELS[section] ?? base;
  }
  return DETAIL_LABELS[section] ?? base; // derinlik ≥4 → detay
}

/** Alt sayfa için üst (parent) route — alt sayfada üst sayfa da sekme olsun.
 *  Ör. /klue/products/123 → /klue/products. Üst yoksa null. */
export function parentHref(href: string): string | null {
  const segs = href.split('?')[0].split('/').filter(Boolean);
  if (segs.length <= 2) return null; // [slug] veya [slug, section] — üstü yok
  return '/' + segs.slice(0, -1).join('/');
}

/** Bu href bir "detay" sayfası mı (ör. ürün/sipariş detayı)? Detayda üst liste
 *  sekmesi (Ürünler vb.) kalmaz — detay sekmesi onun yerini alır. Bilinen
 *  alt-rotalar (marketing/contacts gibi) detay sayılmaz. */
export function isDetailHref(href: string): boolean {
  const segs = href.split('?')[0].split('/').filter(Boolean); // [slug, section, sub, ...]
  const section = segs[1];
  if (segs.length === 3) {
    return !SUBROUTE_LABELS[section]?.[segs[2]] && !!DETAIL_LABELS[section];
  }
  return segs.length >= 4; // daha derin → detay
}

const SECTION_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  stores: BalinaIntegrationIcon,
  products: BalinaProductsIcon,
  orders: BalinaOrderIcon,
  reports: BalinaReportIcon,
  marketing: BalinaMailIcon,
  conversations: BalinaCommentsIcon,
  settings: BalinaSettingsIcon,
  notifications: BalinaBellIcon,
};

/** Sekme ikonu — görsel varsa (ör. ürün) avatar, yoksa route ikonu. */
function tabIconFor(tab: WorkspaceTab): React.ReactNode {
  if (tab.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tab.image}
        alt=""
        className="h-4 w-4 shrink-0 rounded-[3px] object-cover"
      />
    );
  }
  const section = tab.href.split('?')[0].split('/').filter(Boolean)[1];
  const Icon = section ? SECTION_ICON[section] : BalinaHomeIcon;
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

/** Sayfaların kendi sekme başlığını/görselini ayarlaması için (ör. ürün detayı). */
export function useWorkspaceTab(meta: { title?: string | null; image?: string | null }) {
  const pathname = usePathname();
  const updateTab = useTabsStore((s) => s.updateTab);
  const { title, image } = meta;
  React.useEffect(() => {
    const patch: { title?: string; image?: string | null } = {};
    if (title) patch.title = title;
    if (image !== undefined) patch.image = image;
    if (Object.keys(patch).length) updateTab(pathname, patch);
  }, [pathname, title, image, updateTab]);
}

/** Detay sayfası "geri" butonu için: mevcut sekmeyi kapat + üst route'a dön. */
export function useCloseCurrentTab() {
  const pathname = usePathname();
  const router = useRouter();
  const closeTab = useTabsStore((s) => s.closeTab);
  return React.useCallback(() => {
    const parent = parentHref(pathname);
    closeTab(pathname);
    router.push(parent ?? pathname);
  }, [pathname, router, closeTab]);
}

export function WorkspaceTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const openTab = useTabsStore((s) => s.openTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const reorderTabs = useTabsStore((s) => s.reorderTabs);
  // Sürükle-bırak ile sıralama — sürüklenen sekmenin id'si.
  const dragIdRef = React.useRef<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);

  // Geçilen route'u sekme olarak kaydet + aktive et. Detay sayfasında (ör. ürün)
  // üst liste sekmesi (Ürünler) kaldırılır — yalnızca detay sekmesi kalır;
  // diğer alt sayfalarda üst sayfa da sekme olarak görünmeye devam eder.
  React.useEffect(() => {
    const parent = parentHref(pathname);
    if (parent) {
      if (isDetailHref(pathname)) {
        closeTab(parent);
      } else {
        openTab({ id: parent, href: parent, title: tabTitleFor(parent) }, { activate: false });
      }
    }
    openTab({ id: pathname, href: pathname, title: tabTitleFor(pathname) });
  }, [pathname, openTab, closeTab]);

  const handleClose = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    const idx = tabs.findIndex((t) => t.id === id);
    const neighbor = remaining[idx] ?? remaining[idx - 1] ?? null;
    const wasActive = id === activeId;
    closeTab(id);
    if (wasActive && neighbor) router.push(neighbor.href);
  };

  const active = activeId ?? pathname;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {/* Pill tab bar (Linear tarzı) — sekmeler yuvarlak pill; aktif = renkli
          (beyaz + gölge), inaktif hover'da hafif zemin. Çok sekme sığmazsa kayar. */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-1.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="shrink-0"
            >
              <div
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  dragIdRef.current = t.id;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== t.id) setDragOverId(t.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdRef.current) reorderTabs(dragIdRef.current, t.id);
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
                onClick={() => router.push(t.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(t.href);
                  }
                }}
                className={cn(
                  'group/tab relative flex h-8 min-w-[7rem] max-w-[12rem] cursor-pointer items-center gap-1.5 rounded-[0.625rem] pl-2.5 transition-colors',
                  // X varken sağda yer ayır ki başlık X'in altına girmesin.
                  tabs.length > 1 ? 'pr-7' : 'pr-2.5',
                  isActive
                    ? 'bg-[var(--balina-background-light-shout)] shadow-[0_1px_2px_rgba(13,13,13,0.06)]'
                    : 'hover:bg-[var(--balina-background-dark-default)]',
                  dragOverId === t.id && 'ring-2 ring-[var(--balina-icon-strong)]/20',
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
                  {tabIconFor(t)}
                </span>
                <span className="text-body-small-medium min-w-0 flex-1 truncate text-[var(--balina-text-strong)]">
                  {t.title}
                </span>
                {tabs.length > 1 && (
                  <span className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover/tab:opacity-100">
                    <button
                      type="button"
                      aria-label="Sekmeyi kapat"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose(t.id);
                      }}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[var(--balina-icon-strong)] outline-none transition-colors hover:text-[var(--balina-icon-loud)]"
                    >
                      <Xmark className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      {/* İçerik kartı — ayrı panel-surface kart, tüm köşeler yuvarlatılmış. */}
      <div
        className="shadow-panel-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-[0.625rem]"
        style={{ backgroundImage: 'var(--balina-panel-surface)' }}
      >
        <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
