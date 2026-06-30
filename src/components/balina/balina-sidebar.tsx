'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { BalinaAvatar } from './balina-avatar';
import { BalinaTooltip } from './balina-tooltip';
import { BalinaDropdown } from './balina-dropdown';
import { BalinaPopover } from './balina-popover';
import { useBalinaScrollbar } from './use-balina-scrollbar';
import {
  BalinaSidebarIcon,
  BalinaSearchIcon,
  BalinaAiIcon,
  BalinaAiFilledIcon,
  BalinaSettingsIcon,
  BalinaStyleIcon,
  BalinaArrowUpIcon,
} from './icons';

/* Balina Sidebar — kaynak .Sidebar_* kabuğunun portu (256px wrapper + üst
 * kullanıcı + aksiyonlar + fade-mask'lı kaydırılabilir nav + alt bar).
 * İçerik (nav) `children` ile verilir; e-posta'ya özgü klasör/carousel YOK. */

export interface BalinaSidebarProps {
  name?: string;
  avatarSrc?: string;
  avatarFallback?: React.ReactNode;
  /** Kaydırılabilir nav içeriği. */
  children?: React.ReactNode;
  /** Sol üst köşe logosu (balinaOS markası). */
  logo?: React.ReactNode;
  /** Üst sağ aksiyon ikonları (verilmezse varsayılan: panel/arama/AI). */
  topActions?: React.ReactNode;
  /** Alt bar ortası (carousel indikatörleri vb.). */
  footerCenter?: React.ReactNode;
  /** Alt bar'ın hemen üstünde (plan/kullanım uyarısı gibi) — ayarlar açıkken gizli. */
  footerExtra?: React.ReactNode;
  /** Verilirse kullanıcı pill'i bu içeriği gösteren bir hesap dropdown'una dönüşür. */
  accountMenu?: React.ReactNode;
  /** Verilirse "Tema" butonu bu içeriği gösteren bir popover'a dönüşür. */
  themeMenu?: React.ReactNode;
  /** AI paneli açık mı — açıkken AI ikonu dolu hale geçer. */
  aiActive?: boolean;
  onUserClick?: () => void;
  /** Daraltma kontrollü kullanım için; verilmezse dahili state tutulur. */
  collapsed?: boolean;
  /** Varsayılan üst aksiyon ikonlarının callback'leri. */
  onToggleSidebar?: () => void;
  onSearch?: () => void;
  onAi?: () => void;
  /** Alt bar: ayarlar / tema. */
  onSettings?: () => void;
  onTheme?: () => void;
  /** Verilirse "Ayarlar" ikonu, nav'ı sola kaydırıp bu menüyü açar
   *  (gerçek navigasyon yerine). Üstte otomatik "Geri dön" satırı eklenir. */
  settingsMenu?: React.ReactNode;
  /** Ayarlar menüsü açılır kapanır — kontrollü kullanım için. */
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  /** "Geri dön" satırına basılınca (menü kapanmasına ek olarak). */
  onBackToApp?: () => void;
  backToAppLabel?: string;
  /** İkinci seviye ayarlar menüsü (alt sayfa öğeleri). Verilirse ayarlar paneli
   *  kendi içinde L1↔L2 olarak yatay kayar (nav↔settings ile aynı efekt). */
  settingsSubmenu?: React.ReactNode;
  settingsSubOpen?: boolean;
  subBackLabel?: string;
  onSubBack?: () => void;
  /** İkincil panel, menü listesi yerine yüksekliği dolduran tam bir panel
   *  (örn. kampanya editörü blok paleti). Geri satırı üstte sabit kalır. */
  settingsPanelFull?: boolean;
  /** İkincil menü kimliği — değişince içerik takas animasyonuyla yeniden mount
   *  olur (palet ↔ pazarlama ↔ ayarlar geçişi animasyonlu). */
  secondaryKey?: string;
  /** Sağ kenardan sürükleyerek yeniden boyutlandırma (varsayılan: açık). */
  resizable?: boolean;
  /** Başlangıç genişliği (px). */
  defaultWidth?: number;
  /** Sürükleme sınırları (px). */
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

const SIDEBAR_WIDTH_STORAGE_KEY = 'balina-sidebar-width';

function IconButton({
  label,
  onClick,
  tooltipSide = 'bottom',
  children,
}: {
  label: string;
  onClick?: () => void;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <BalinaTooltip content={label} side={tooltipSide}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--balina-icon-strong)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
      >
        {children}
      </button>
    </BalinaTooltip>
  );
}

/** Ayarlar panellerinin üstündeki geri satırı (← etiket). */
function SettingsBackRow({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-[0.625rem] px-1.5 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-muted)] focus-visible:outline-none"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
        <BalinaArrowUpIcon className="h-4 w-4 -rotate-90" />
      </span>
      <span className="text-body-small-one-liner-medium min-w-0 flex-1 truncate text-[var(--balina-text-strong)]">
        {label}
      </span>
    </button>
  );
}

export function BalinaSidebar({
  name = 'Kullanıcı',
  avatarSrc,
  avatarFallback,
  children,
  logo,
  topActions,
  footerCenter,
  accountMenu,
  themeMenu,
  footerExtra,
  aiActive = false,
  onUserClick,
  collapsed: collapsedProp,
  onToggleSidebar,
  onSearch,
  onAi,
  onSettings,
  onTheme,
  settingsMenu,
  settingsOpen: settingsOpenProp,
  onSettingsOpenChange,
  onBackToApp,
  backToAppLabel = 'Geri dön',
  settingsSubmenu,
  settingsSubOpen = false,
  subBackLabel = 'Geri',
  onSubBack,
  settingsPanelFull = false,
  secondaryKey,
  resizable = true,
  defaultWidth = 256,
  minWidth = 224,
  maxWidth = 400,
  className,
}: BalinaSidebarProps) {
  const scrollRef = useBalinaScrollbar<HTMLDivElement>();
  const [width, setWidth] = React.useState(defaultWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const [settingsOpenInternal, setSettingsOpenInternal] = React.useState(false);
  const settingsOpen = settingsOpenProp ?? settingsOpenInternal;
  const setSettingsOpen = (open: boolean) => {
    if (settingsOpenProp === undefined) setSettingsOpenInternal(open);
    onSettingsOpenChange?.(open);
  };
  // Panel daraltma: collapsed iken sidebar layout'tan çıkar (içerik genişler);
  // sol kenara gelince revealed=true ile yüzen panel olarak kayar.
  const [collapsedInternal, setCollapsedInternal] = React.useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const [revealed, setRevealed] = React.useState(false);
  const toggleCollapsed = () => {
    if (collapsedProp === undefined) {
      setCollapsedInternal((c) => {
        if (c) setRevealed(false);
        return !c;
      });
    } else if (collapsed) {
      setRevealed(false);
    }
    onToggleSidebar?.();
  };

  // Kaydedilmiş genişliği mount sonrası oku (SSR hydration uyumu için).
  React.useEffect(() => {
    if (!resizable) return;
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (saved >= minWidth && saved <= maxWidth) setWidth(saved);
  }, [resizable, minWidth, maxWidth]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;
    let latest = startWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (ev: PointerEvent) => {
      latest = Math.min(maxWidth, Math.max(minWidth, startWidth + (ev.clientX - startX)));
      setWidth(latest);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(Math.round(latest)));
      } catch {
        /* localStorage erişilemezse sessizce geç */
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <>
      {/* Daraltılmışken sol kenarda yüzen paneli açan hover şeridi. */}
      {collapsed && (
        <div
          aria-hidden
          onMouseEnter={() => setRevealed(true)}
          className="fixed left-0 top-0 z-[45] h-full w-2.5"
        />
      )}
      <aside
        style={resizable && !collapsed ? { width: `${width}px` } : undefined}
        className={cn(
          'sticky top-[var(--gap)] z-[40] flex h-[calc(100svh-calc(var(--gap)*2))] shrink-0 flex-row',
          collapsed ? 'w-0' : !resizable && 'w-64',
          className,
        )}
      >
        <div
          onMouseLeave={collapsed ? () => setRevealed(false) : undefined}
          style={
            collapsed ? { backgroundImage: 'var(--balina-panel-surface)' } : undefined
          }
          className={cn(
            'relative flex h-full min-w-0 flex-1 flex-col pb-2',
            collapsed &&
              'shadow-raised fixed left-[var(--gap)] top-[var(--gap)] z-[60] h-[calc(100svh-calc(var(--gap)*2))] w-64 rounded-[0.625rem] p-1 backdrop-blur-[24px] transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
            collapsed &&
              (revealed
                ? 'translate-x-0'
                : '-translate-x-[calc(100%+var(--gap)+0.5rem)]'),
          )}
        >
        {/* Üst: logo (sol) + aksiyonlar (sağ) — ayarlar açıkken gizli. */}
        {!settingsOpen && (
          <div className="flex h-8 shrink-0 items-center justify-between gap-1 pr-1">
            <div className="flex shrink-0 items-center pl-2">{logo}</div>
            <div className="flex shrink-0 items-center gap-1">
              {topActions ?? (
                <>
                  <IconButton
                    label={collapsed ? 'Paneli genişlet' : 'Paneli daralt'}
                    onClick={toggleCollapsed}
                  >
                    <BalinaSidebarIcon className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Ara" onClick={onSearch}>
                    <BalinaSearchIcon className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="balinaOS AI" onClick={onAi}>
                    {aiActive ? (
                      <BalinaAiFilledIcon className="h-4 w-4" />
                    ) : (
                      <BalinaAiIcon className="h-4 w-4" />
                    )}
                  </IconButton>
                </>
              )}
            </div>
          </div>
        )}

        {/* Orta: kaydırılabilir nav. settingsMenu verilirse iki panel
            (nav + ayarlar) yan yana durur; ayarlara basınca sola kayar. */}
        {settingsMenu ? (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                'flex h-full w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                settingsOpen && '-translate-x-1/2',
              )}
            >
              {/* Ana nav paneli */}
              <div
                ref={scrollRef}
                aria-hidden={settingsOpen}
                className="balina-scrollbar h-full w-1/2 overflow-y-auto pt-4 [scrollbar-gutter:stable_both-edges]"
              >
                <div className="flex flex-col gap-0.5 px-0.5 pb-6">{children}</div>
              </div>
              {/* Ayarlar paneli — kendi içinde L1↔L2 yatay slider (settingsSubmenu
                  verilirse). Başlık (logo) gizli olduğundan geri satırı en üstte. */}
              <div
                aria-hidden={!settingsOpen}
                className="h-full w-1/2 overflow-hidden"
              >
                <div
                  className={cn(
                    'flex h-full w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    settingsSubOpen && settingsSubmenu && '-translate-x-1/2',
                  )}
                >
                  {/* Seviye 1 — Genel/API/Hakkımızda (veya tam panel) */}
                  <div
                    aria-hidden={settingsSubOpen}
                    className={cn(
                      'h-full w-1/2 [scrollbar-gutter:stable_both-edges]',
                      settingsPanelFull
                        ? 'flex flex-col overflow-hidden'
                        : 'balina-scrollbar overflow-y-auto',
                    )}
                  >
                    {settingsPanelFull ? (
                      <div
                        key={secondaryKey}
                        className="balina-menu-swap flex h-full flex-col"
                      >
                        <div className="shrink-0 px-0.5">
                          <SettingsBackRow
                            label={backToAppLabel}
                            onClick={() => {
                              if (onBackToApp) onBackToApp();
                              else setSettingsOpen(false);
                            }}
                          />
                        </div>
                        <div className="min-h-0 flex-1 overflow-hidden">
                          {settingsMenu}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={secondaryKey}
                        className="balina-menu-swap flex flex-col gap-0.5 px-0.5 pb-6"
                      >
                        <SettingsBackRow
                          label={backToAppLabel}
                          onClick={() => {
                            // Geri davranışı tüketicide (onBackToApp); yoksa paneli kapat.
                            if (onBackToApp) onBackToApp();
                            else setSettingsOpen(false);
                          }}
                        />
                        {settingsMenu}
                      </div>
                    )}
                  </div>
                  {/* Seviye 2 — alt sayfa öğeleri */}
                  <div
                    aria-hidden={!settingsSubOpen}
                    className="balina-scrollbar h-full w-1/2 overflow-y-auto [scrollbar-gutter:stable_both-edges]"
                  >
                    <div className="flex flex-col gap-0.5 px-0.5 pb-6">
                      <SettingsBackRow label={subBackLabel} onClick={onSubBack} />
                      {settingsSubmenu}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="balina-scrollbar min-h-0 flex-1 overflow-y-auto pt-4 [scrollbar-gutter:stable_both-edges]"
          >
            <div className="flex flex-col gap-0.5 px-0.5 pb-6">{children}</div>
          </div>
        )}

        {/* Alt bar'ın üstünde plan/kullanım uyarısı — ayarlar açıkken gizli. */}
        {!settingsOpen && footerExtra && (
          <div className="shrink-0 px-0.5 pb-1.5">{footerExtra}</div>
        )}

        {/* Alt bar: hesap (sol) · ayarlar + tema (sağ) — ayarlar açıkken gizli. */}
        {!settingsOpen && (
        <div className="flex h-8 shrink-0 items-center justify-between gap-1 pr-1">
          {(() => {
            const userButton = (
              <button
                type="button"
                onClick={accountMenu ? undefined : onUserClick}
                className="flex h-7 min-w-0 cursor-pointer items-center gap-1 rounded-lg p-0.5 outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] focus-visible:outline-none"
              >
                <BalinaAvatar size="large" src={avatarSrc} fallback={avatarFallback} alt={name} />
                <span className="text-body-small-one-liner-medium min-w-0 truncate px-1 text-[var(--balina-text-strong)]">
                  {name}
                </span>
              </button>
            );
            return accountMenu ? (
              <BalinaDropdown trigger={userButton} side="top" align="end" size="small">
                {accountMenu}
              </BalinaDropdown>
            ) : (
              userButton
            );
          })()}
          <div className="flex shrink-0 items-center gap-1">
            {footerCenter}
            <IconButton
              label="Ayarlar"
              onClick={settingsMenu ? () => setSettingsOpen(true) : onSettings}
              tooltipSide="top"
            >
              <BalinaSettingsIcon className="h-4 w-4" />
            </IconButton>
            {themeMenu ? (
              <BalinaPopover
                side="right"
                align="end"
                noAutoFocus
                tooltip="Tema rengi düzenle"
                tooltipSide="top"
                className="w-auto max-w-none overflow-hidden rounded-[1.5rem] p-0"
                trigger={
                  <button
                    type="button"
                    aria-label="Tema rengi düzenle"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--balina-icon-strong)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
                  >
                    <BalinaStyleIcon className="h-4 w-4" />
                  </button>
                }
              >
                {themeMenu}
              </BalinaPopover>
            ) : (
              <IconButton label="Tema" onClick={onTheme} tooltipSide="top">
                <BalinaStyleIcon className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        </div>
        )}
      </div>

      {resizable && !collapsed && (
        <div
          onPointerDown={startResize}
          onDoubleClick={() => {
            setWidth(defaultWidth);
            try {
              localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(defaultWidth));
            } catch {
              /* yok say */
            }
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Kenar çubuğunu yeniden boyutlandır"
          className="group flex w-2.5 shrink-0 cursor-col-resize items-stretch justify-center"
        >
          <span
            className={cn(
              'w-1.5 rounded-[0.125rem] transition-colors',
              isResizing
                ? 'bg-[var(--balina-neutral-dark-30)]'
                : 'bg-transparent group-hover:bg-[var(--balina-neutral-dark-20)]',
            )}
          />
        </div>
      )}
      </aside>
    </>
  );
}

/* Sidebar bölüm başlığı (Emails, Inbox vb.). */
export function BalinaSidebarSectionHeader({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1.5 py-1">
      <span className="text-body-tiny-medium text-[var(--balina-text-muted)]">{children}</span>
      {count != null && (
        <span className="text-body-small-one-liner-regular text-[var(--balina-text-muted)]">
          {count}
        </span>
      )}
    </div>
  );
}

/* Sidebar nav öğesi (ikon + etiket + opsiyonel sayaç). */
export function BalinaSidebarItem({
  icon,
  count,
  active,
  onClick,
  children,
}: {
  icon?: React.ReactNode;
  count?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Seçili: raised gradient + ince navigation gölgesi (kaynak FolderItem active).
      style={active ? { backgroundImage: 'var(--color-background-raised-default)' } : undefined}
      className={cn(
        'flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-[0.625rem] px-1.5 text-left outline-none transition-colors focus-visible:outline-none',
        active
          ? 'shadow-[0_0.5px_0.5px_0_var(--balina-neutral-dark-6),0_1px_3px_0_var(--balina-neutral-dark-4)]'
          : 'hover:bg-[var(--balina-background-dark-muted)]',
      )}
    >
      {icon && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
          {icon}
        </span>
      )}
      <span className="text-body-small-one-liner-medium min-w-0 flex-1 truncate text-[var(--balina-text-strong)]">
        {children}
      </span>
      {count != null && (
        <span className="text-body-small-one-liner-regular shrink-0 px-1 text-[var(--balina-text-muted)]">
          {count}
        </span>
      )}
    </button>
  );
}
