'use client';

/* UI Bileşen Galerisi — `/components`
 * Tasarım sistemini (tipografi, renk token'ları ve `@/components/ui` drop-in'leri)
 * tek sayfada gösterir. Yalnızca geliştirme/QA amaçlıdır; auth gerektirmez
 * (AuthGuard publicPaths'e eklenmiştir). */

import * as React from 'react';
import {
  Alert,
  AlertDialog,
  Avatar,
  Button,
  Calendar,
  Card,
  Checkbox,
  Chip,
  Description,
  Dropdown,
  FieldError,
  Input,
  InputGroup,
  InputOTP,
  Label,
  ListBox,
  Modal,
  REGEXP_ONLY_DIGITS,
  SearchField,
  Select,
  Switch,
  Tabs,
  TextArea,
  TextField,
  Tooltip,
  toast,
} from '@/components/ui';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import { type DateRange as RdpDateRange } from 'react-day-picker';
import { toast as sonnerToast } from 'sonner';
import { SearchModal, type SearchSection } from '@/components/search/search-modal';
import {
  BalinaButton,
  BalinaInput,
  BalinaTextarea,
  BalinaCheckbox,
  BalinaSwitch,
  BalinaRadioGroup,
  BalinaInputOTP,
  BalinaAvatar,
  BalinaMenuItem,
  BalinaMenuTitle,
  BalinaMenuDivider,
  BalinaTooltip,
  BalinaToast,
  BalinaDropdown,
  BalinaDropdownItem,
  BalinaDropdownSeparator,
  BalinaDropdownSub,
  BalinaDropdownLabel,
  BalinaTabs,
  BalinaSearchResultItem,
  BalinaModal,
  BalinaModalClose,
  BalinaSelect,
  BalinaCalendar,
  BalinaTabBar,
  BalinaSplitButton,
  BalinaAvatarPair,
  BalinaIcons,
  BalinaChatInput,
  BalinaChat,
  BalinaChatUserMessage,
  BalinaChatStatus,
  BalinaChatAiResponse,
  BalinaPopover,
  BalinaPopoverPreview,
} from '@/components/balina';
import {
  CircleCheck,
  CircleInfo,
  TriangleExclamation,
  Bell,
  Heart,
  TrashBin,
  Gear,
  Plus,
  Box,
  ShoppingCart,
  ShoppingBag,
  Person,
  Magnifier,
} from '@gravity-ui/icons';

/* ---------- Sayfa iskeleti ---------- */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-separator pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/* ---------- Renk token swatch'ı ---------- */

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border border-border ${className}`} />
      <span className="text-xs text-muted">{name}</span>
    </div>
  );
}

export default function ComponentsGalleryPage() {
  // Form / interaktif state
  const [text, setText] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [area, setArea] = React.useState('');
  const [select, setSelect] = React.useState<string | null>('shopify');
  const [sw1, setSw1] = React.useState(true);
  const [sw2, setSw2] = React.useState(false);
  const [chk1, setChk1] = React.useState(true);
  const [chk2, setChk2] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [tab, setTab] = React.useState('overview');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [day, setDay] = React.useState<Date | undefined>(undefined);
  const [range, setRange] = React.useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [dsTab, setDsTab] = React.useState('genel');
  // Balina (yeni) — Modal / Select / Calendar / TabBar
  const [dsModalOpen, setDsModalOpen] = React.useState(false);
  const [dsSelect, setDsSelect] = React.useState('trendyol');
  const [dsDay, setDsDay] = React.useState<Date | undefined>(undefined);
  const [dsRange, setDsRange] = React.useState<RdpDateRange | undefined>(undefined);
  const [dsMulti, setDsMulti] = React.useState<Date[] | undefined>(undefined);
  const [dsTabBarItems, setDsTabBarItems] = React.useState([
    { id: 't1', label: 'Genel Bakış', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 't2', label: 'Siparişler', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 't3', label: 'Ürünler', icon: <Box className="h-4 w-4" /> },
  ]);
  const [dsActiveTab, setDsActiveTab] = React.useState('t1');
  const [dsCheck1, setDsCheck1] = React.useState(true);
  const [dsCheck2, setDsCheck2] = React.useState(false);
  const [dsSwitch1, setDsSwitch1] = React.useState(true);
  const [dsSwitch2, setDsSwitch2] = React.useState(false);
  const [dsRadio, setDsRadio] = React.useState('trendyol');
  const [dsOtp, setDsOtp] = React.useState('');

  // Cmd/Ctrl+K ile arama modalını aç.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searchSections: SearchSection[] = [
    {
      title: 'Kayıtlı aramalar',
      onViewAll: () => {},
      items: [
        {
          id: 's1',
          title: 'Bekleyen siparişler',
          icon: <ShoppingCart className="h-4 w-4" />,
          action: 'Ara',
          pill: { prefix: 'durum:', value: 'beklemede' },
        },
        {
          id: 's2',
          title: 'Stok kritik ürünler',
          icon: <Box className="h-4 w-4" />,
          action: 'Ara',
        },
        {
          id: 's3',
          title: 'Shopify Mağazam',
          icon: <ShoppingBag className="h-4 w-4" />,
          action: 'Ara',
        },
      ],
    },
    {
      title: 'Son kullanılanlar',
      items: [
        {
          id: 'r1',
          title: 'SZ2010 — Kot Elbise',
          icon: <Box className="h-4 w-4" />,
          action: 'Aç',
        },
        {
          id: 'r2',
          title: 'Sipariş #10428',
          icon: <ShoppingCart className="h-4 w-4" />,
          action: 'Aç',
        },
        {
          id: 'r3',
          title: 'Ezgi Yılmaz',
          icon: <Person className="h-4 w-4" />,
          action: 'Aç',
        },
      ],
    },
  ];

  return (
    <main className="h-screen overflow-y-auto bg-white text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        {/* Başlık */}
        <header className="flex flex-col gap-2">
          <Chip variant="soft" size="sm" className="w-fit">
            Tasarım Sistemi
          </Chip>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bileşen Galerisi
          </h1>
          <p className="text-sm text-muted">
            balinaOS UI kütüphanesi — <code className="rounded bg-default px-1 py-0.5 text-[12px]">@/components/ui</code> (Radix tabanlı HeroUI v3 drop-in&apos;leri).
          </p>
        </header>

        {/* ---------------- ARAMA MODALI ---------------- */}
        <Section
          title="Arama Modalı (Search)"
          description="Komut-paleti tarzı arama. ↑/↓ ile gez, Enter ile seç, Esc kapatır. Cmd/Ctrl+K ile de açılır."
        >
          <Row>
            <Button onPress={() => setSearchOpen(true)}>
              <Magnifier />
              Aramayı aç
            </Button>
            <span className="text-sm text-muted">
              veya{' '}
              <kbd className="rounded bg-default px-1.5 py-0.5 text-xs">⌘K</kbd>
            </span>
          </Row>
        </Section>

        {/* ---------------- TASARIM SİSTEMİ (DS) ---------------- */}
        <Section
          title="Tasarım Sistemi (Balina) — yeni"
          description="Yeni tasarım sistemi token'ları (renk + tipografi) ve Balina bileşenleri. 'define' yok; balina- prefix'i + text-body-* tipografi."
        >
          <div className="flex flex-col gap-6">
            {/* Metin skalası */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Metin skalası (text-shout → faint)</span>
              <div className="flex flex-col gap-0.5">
                {(['shout', 'loud', 'strong', 'default', 'muted', 'faint'] as const).map(
                  (lvl) => (
                    <span
                      key={lvl}
                      className="text-body-default-regular"
                      style={{ color: `var(--balina-text-${lvl})` }}
                    >
                      balina-text-{lvl} — Çok mağazalı analitik (örnek metin)
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Tipografi ölçeği */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Tipografi (text-body-*)</span>
              <div className="flex flex-col gap-1" style={{ color: 'var(--balina-text-shout)' }}>
                <span className="text-body-large-medium">text-body-large-medium</span>
                <span className="text-body-default-medium">text-body-default-medium</span>
                <span className="text-body-default-regular">text-body-default-regular</span>
                <span className="text-body-small-medium">text-body-small-medium</span>
                <span className="text-body-small-regular">text-body-small-regular</span>
                <span className="text-body-tiny-medium">text-body-tiny-medium</span>
                <span className="text-body-micro-medium">text-body-micro-medium</span>
              </div>
            </div>

            {/* Zemin / kenarlık swatch'ları */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Zemin + kenarlık</span>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  ['bg-light-shout', 'var(--balina-background-light-shout)'],
                  ['bg-light-loud', 'var(--balina-background-light-loud)'],
                  ['bg-dark-muted', 'var(--balina-background-dark-muted)'],
                  ['bg-dark-default', 'var(--balina-background-dark-default)'],
                  ['border-muted', 'var(--balina-border-muted)'],
                  ['border-strong', 'var(--balina-border-strong)'],
                ].map(([name, val]) => (
                  <div key={name} className="flex flex-col gap-1">
                    <div
                      className="h-12 w-full rounded-lg"
                      style={{ border: '1px solid var(--balina-border-strong)', background: val }}
                    />
                    <span className="text-body-tiny-regular text-muted">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Balina Button */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Button (variant · size)</span>
              <div className="flex flex-wrap items-center gap-3">
                <BalinaButton variant="primary">Primary</BalinaButton>
                <BalinaButton variant="ghost">Ghost</BalinaButton>
                <BalinaButton variant="plain">Plain</BalinaButton>
                <BalinaButton variant="danger">Danger</BalinaButton>
                <BalinaButton variant="primary" disabled>
                  Disabled
                </BalinaButton>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <BalinaButton variant="primary" size="small">
                  Small
                </BalinaButton>
                <BalinaButton variant="primary" size="default">
                  Default
                </BalinaButton>
                <BalinaButton variant="primary" size="large">
                  Large
                </BalinaButton>
              </div>
            </div>

            {/* Balina SplitButton */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">
                Balina SplitButton (ana aksiyon + chevron menü)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <BalinaSplitButton
                  onMainClick={() => toast.success('Gönderildi')}
                  menuLabel="Gönderme seçenekleri"
                  menuContent={
                    <>
                      <BalinaDropdownItem icon={<Bell className="h-4 w-4" />}>
                        Şimdi gönder
                      </BalinaDropdownItem>
                      <BalinaDropdownItem icon={<Gear className="h-4 w-4" />}>
                        Sonra gönder
                      </BalinaDropdownItem>
                    </>
                  }
                >
                  Gönder
                </BalinaSplitButton>
                <BalinaSplitButton
                  variant="soft"
                  onMainClick={() => toast('Kaydedildi')}
                  onMenuClick={() => toast('Menü')}
                >
                  Kaydet
                </BalinaSplitButton>
                <BalinaSplitButton disabled onMainClick={() => {}}>
                  Devre dışı
                </BalinaSplitButton>
              </div>
            </div>

            {/* Balina Input */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Input</span>
              <div className="flex flex-wrap items-center gap-3">
                <BalinaInput
                  placeholder="Varsayılan"
                  wrapperClassName="w-56"
                  leftIcon={<Magnifier className="h-4 w-4" />}
                />
                <BalinaInput placeholder="Ghost" variant="ghost" wrapperClassName="w-56" />
                <BalinaInput placeholder="Devre dışı" disabled wrapperClassName="w-56" />
              </div>
            </div>

            {/* Balina Textarea */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">
                Balina Textarea (input hissiyatı · dolu/focus&apos;ta dolgu)
              </span>
              <div className="flex flex-wrap items-start gap-3">
                <BalinaTextarea placeholder="Varsayılan" wrapperClassName="w-64" />
                <BalinaTextarea placeholder="Ghost" variant="ghost" wrapperClassName="w-64" />
                <BalinaTextarea placeholder="Devre dışı" disabled wrapperClassName="w-64" />
              </div>
            </div>

            {/* Balina Checkbox */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">
                Balina Checkbox (check animasyonlu)
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <BalinaCheckbox checked={dsCheck1} onCheckedChange={setDsCheck1}>
                  Bildirimleri aç
                </BalinaCheckbox>
                <BalinaCheckbox checked={dsCheck2} onCheckedChange={setDsCheck2}>
                  Pazarlama e-postaları
                </BalinaCheckbox>
                <BalinaCheckbox defaultChecked disabled>
                  Devre dışı (seçili)
                </BalinaCheckbox>
                <BalinaCheckbox disabled>Devre dışı</BalinaCheckbox>
              </div>
            </div>

            {/* Balina Switch */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Switch (animasyonlu)</span>
              <div className="flex flex-wrap items-center gap-4">
                <BalinaSwitch checked={dsSwitch1} onCheckedChange={setDsSwitch1}>
                  Otomatik senkron
                </BalinaSwitch>
                <BalinaSwitch checked={dsSwitch2} onCheckedChange={setDsSwitch2}>
                  Karanlık mod
                </BalinaSwitch>
                <BalinaSwitch defaultChecked disabled>
                  Devre dışı
                </BalinaSwitch>
              </div>
            </div>

            {/* Balina Radio */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Radio (animasyonlu dot)</span>
              <BalinaRadioGroup
                value={dsRadio}
                onValueChange={setDsRadio}
                options={[
                  { value: 'trendyol', label: 'Trendyol' },
                  { value: 'hepsiburada', label: 'Hepsiburada' },
                  { value: 'shopify', label: 'Shopify' },
                  { value: 'woo', label: 'WooCommerce (devre dışı)', disabled: true },
                ]}
              />
            </div>

            {/* Balina Input OTP */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Input OTP (6 hane)</span>
              <BalinaInputOTP value={dsOtp} onChange={setDsOtp} />
            </div>

            {/* Balina Avatar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Avatar (size · fallback + görsel)</span>
              <div className="flex items-center gap-3">
                <BalinaAvatar size="small" fallback="S" />
                <BalinaAvatar size="medium" fallback="M" />
                <BalinaAvatar size="large" fallback="L" />
                <BalinaAvatar size="default" fallback="MÖ" />
              </div>
              <div className="flex items-center gap-3">
                <BalinaAvatar size="small" src="https://github.com/torvalds.png" alt="L" />
                <BalinaAvatar size="medium" src="https://github.com/shadcn.png" alt="s" />
                <BalinaAvatar size="large" src="https://github.com/sindresorhus.png" alt="S" />
                <BalinaAvatar size="default" src="https://github.com/raunofreiberg.png" alt="R" />
              </div>
            </div>

            {/* Balina MenuItem */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina MenuItem</span>
              <div
                className="flex w-64 flex-col gap-0.5 rounded-xl p-1 shadow-elevation-medium"
                style={{ backgroundColor: 'var(--balina-background-light-shout)' }}
              >
                <BalinaMenuTitle>Menü</BalinaMenuTitle>
                <BalinaMenuItem icon={<Box className="h-4 w-4" />}>Ürünler</BalinaMenuItem>
                <BalinaMenuItem icon={<ShoppingCart className="h-4 w-4" />} selected>
                  Siparişler
                </BalinaMenuItem>
                <BalinaMenuItem icon={<Gear className="h-4 w-4" />} shortcut="K">
                  Ayarlar
                </BalinaMenuItem>
                <BalinaMenuDivider />
                <BalinaMenuItem icon={<TrashBin className="h-4 w-4" />} disabled>
                  Sil (devre dışı)
                </BalinaMenuItem>
              </div>
            </div>

            {/* Balina Tooltip */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Tooltip</span>
              <Row>
                <BalinaTooltip content="Küçük tooltip">
                  <BalinaButton variant="ghost">Üzerine gel (small)</BalinaButton>
                </BalinaTooltip>
                <BalinaTooltip size="large" content="Daha büyük, biraz daha geniş bir tooltip içeriği">
                  <BalinaButton variant="ghost">Üzerine gel (large)</BalinaButton>
                </BalinaTooltip>
              </Row>
            </div>

            {/* Balina Tabs (segmented) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Tabs (segmented)</span>
              <BalinaTabs
                value={dsTab}
                onChange={setDsTab}
                items={[
                  { id: 'genel', label: 'Genel' },
                  { id: 'siparisler', label: 'Siparişler' },
                  { id: 'ayarlar', label: 'Ayarlar' },
                ]}
              />
            </div>

            {/* Balina Dropdown */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Dropdown (menü + alt menü)</span>
              <BalinaDropdown
                align="start"
                trigger={
                  <BalinaButton variant="ghost">
                    <Gear className="h-4 w-4" />
                    Aksiyonlar
                  </BalinaButton>
                }
              >
                <BalinaDropdownItem icon={<Bell className="h-4 w-4" />} shortcut="B">
                  Bildirim gönder
                </BalinaDropdownItem>
                <BalinaDropdownSub icon={<Gear className="h-4 w-4" />} label="Tercihler">
                  <BalinaDropdownItem>Profil</BalinaDropdownItem>
                  <BalinaDropdownItem>Görünüm</BalinaDropdownItem>
                </BalinaDropdownSub>
                <BalinaDropdownSeparator />
                <BalinaDropdownItem icon={<TrashBin className="h-4 w-4" />} shortcut="X" danger>
                  Sil
                </BalinaDropdownItem>
              </BalinaDropdown>
            </div>

            {/* Balina Dropdown — hesap değiştirici (avatar + alt başlık + ✓) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Dropdown (hesap değiştirici)</span>
              <BalinaDropdown
                align="start"
                size="large"
                trigger={
                  <BalinaButton variant="ghost">
                    <BalinaAvatar size="medium" fallback="JM" />
                    João da Maia
                  </BalinaButton>
                }
              >
                <BalinaDropdownLabel>Hesap değiştir</BalinaDropdownLabel>
                <BalinaDropdownItem
                  icon={<BalinaAvatar size="medium" fallback="JM" />}
                  subtitle="joao@example.com"
                  selected
                >
                  João da Maia
                </BalinaDropdownItem>
                <BalinaDropdownItem
                  icon={<BalinaAvatar size="medium" fallback="JP" />}
                  subtitle="joao@damaia.com"
                >
                  João da Maia (Personal)
                </BalinaDropdownItem>
                <BalinaDropdownSeparator />
                <BalinaDropdownItem icon={<BalinaIcons.CirclePlus className="h-4 w-4" />}>
                  Başka hesap ekle
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Settings className="h-4 w-4" />}>
                  Ayarlar
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Invite className="h-4 w-4" />}>
                  Ekibini davet et
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Logout className="h-4 w-4" />}>
                  Çıkış yap
                </BalinaDropdownItem>
              </BalinaDropdown>
            </div>

            {/* Balina Dropdown — model seçici (ikon + ✓) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Dropdown (model seçici)</span>
              <BalinaDropdown
                align="start"
                trigger={<BalinaButton variant="soft">Auto</BalinaButton>}
              >
                <BalinaDropdownItem icon={<BalinaIcons.Ai className="h-4 w-4" />} selected>
                  Auto
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Style className="h-4 w-4" />}>
                  Claude Sonnet 4.5
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Style className="h-4 w-4" />}>
                  Gemini 3 Pro
                </BalinaDropdownItem>
                <BalinaDropdownItem icon={<BalinaIcons.Style className="h-4 w-4" />}>
                  GPT-5.1
                </BalinaDropdownItem>
              </BalinaDropdown>
            </div>

            {/* Balina Popover — önizleme kartı */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Popover (önizleme)</span>
              <BalinaPopover
                trigger={<BalinaButton variant="ghost">Önizleme göster</BalinaButton>}
              >
                <BalinaPopoverPreview
                  title="New email draft"
                  meta="2sa önce"
                  body="Preview super hyper mega long content that will be clamped to two lines in the popover card."
                />
              </BalinaPopover>
            </div>

            {/* Balina Toast */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Toast — variant (butona tıkla)</span>
              <div className="flex flex-wrap items-center gap-3">
                {(['default', 'success', 'error', 'warning', 'info'] as const).map((v) => (
                  <BalinaButton
                    key={v}
                    variant="soft"
                    onClick={() =>
                      sonnerToast.custom(
                        () => (
                          <BalinaToast variant={v} className="w-fit">
                            {v === 'error'
                              ? 'Bir hata oluştu'
                              : v === 'warning'
                                ? 'Dikkat gerekiyor'
                                : v === 'success'
                                  ? 'Sipariş kaydedildi'
                                  : v === 'info'
                                    ? 'Yeni bildirim var'
                                    : 'Bilgilendirme'}
                          </BalinaToast>
                        ),
                        { unstyled: true },
                      )
                    }
                  >
                    {v}
                  </BalinaButton>
                ))}
              </div>
              <span className="text-xs text-muted">Konum</span>
              <div className="flex flex-wrap items-center gap-3">
                {(
                  [
                    ['top-left', 'Sol üst'],
                    ['top-center', 'Orta üst'],
                    ['top-right', 'Sağ üst'],
                    ['bottom-left', 'Sol alt'],
                    ['bottom-center', 'Orta alt'],
                    ['bottom-right', 'Sağ alt'],
                  ] as const
                ).map(([pos, label]) => (
                  <BalinaButton
                    key={pos}
                    variant="soft"
                    onClick={() =>
                      sonnerToast.custom(
                        (id) => (
                          <BalinaToast
                            variant="info"
                            className="w-fit"
                            action={
                              <BalinaButton
                                variant="plain"
                                size="small"
                                onClick={() => sonnerToast.dismiss(id)}
                              >
                                Geri al
                              </BalinaButton>
                            }
                          >
                            {label}
                          </BalinaToast>
                        ),
                        { position: pos, unstyled: true },
                      )
                    }
                  >
                    {label}
                  </BalinaButton>
                ))}
              </div>
            </div>

            {/* Balina ChatInput */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina ChatInput (AI composer)</span>
              <div className="w-full max-w-md">
                <BalinaChatInput onSend={(v) => toast.success(`Gönderildi: ${v}`)} />
              </div>
            </div>

            {/* Balina Chat (asistan paneli) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Chat (asistan paneli)</span>
              <div className="h-[34rem] w-full max-w-[26rem]">
                <BalinaChat title="New agent" onSend={(v) => toast.success(`Gönderildi: ${v}`)}>
                  <BalinaChatUserMessage>
                    Bu haftaki siparişleri özetler misin?
                  </BalinaChatUserMessage>
                  <BalinaChatStatus variant="thinking">9 saniye düşündü</BalinaChatStatus>
                  <BalinaChatStatus
                    variant="results"
                    avatars={[
                      'https://github.com/torvalds.png',
                      'https://github.com/shadcn.png',
                      'https://github.com/sindresorhus.png',
                    ]}
                  >
                    8 sonuç
                  </BalinaChatStatus>
                  <BalinaChatAiResponse onInsert={() => toast('Eklendi')}>
                    <p>İşte bu haftaki siparişlerin kısa bir özeti:</p>
                    <ul className="flex flex-col gap-2 pl-4">
                      <li className="list-disc">Toplam 128 sipariş, geçen haftaya göre %12 artış.</li>
                      <li className="list-disc">En çok satan: SZ2010 — Kot Elbise (24 adet).</li>
                    </ul>
                  </BalinaChatAiResponse>
                </BalinaChat>
              </div>
            </div>

            {/* Balina SearchResultItem */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina SearchResultItem</span>
              <div
                className="flex w-full max-w-md flex-col gap-0.5 rounded-xl p-1 shadow-elevation-medium"
                style={{ backgroundColor: 'var(--balina-background-light-shout)' }}
              >
                <BalinaSearchResultItem
                  icon={<ShoppingCart className="h-4 w-4" />}
                  title="Sipariş #10428"
                  pill={<span className="text-body-mail-medium text-[var(--balina-text-shout)]">@Trendyol</span>}
                  action="Aç"
                  active
                />
                <BalinaSearchResultItem
                  icon={<Box className="h-4 w-4" />}
                  title="SZ2010 — Kot Elbise"
                  action="Aç"
                />
              </div>
            </div>

            {/* Balina Select */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Select (tekli seçim)</span>
              <BalinaSelect
                value={dsSelect}
                onValueChange={setDsSelect}
                options={[
                  { value: 'trendyol', label: 'Trendyol', icon: <ShoppingBag className="h-4 w-4" /> },
                  { value: 'hepsiburada', label: 'Hepsiburada', icon: <ShoppingBag className="h-4 w-4" /> },
                  { value: 'shopify', label: 'Shopify', icon: <ShoppingCart className="h-4 w-4" /> },
                  { value: 'woo', label: 'WooCommerce', icon: <Box className="h-4 w-4" />, disabled: true },
                ]}
              />
            </div>

            {/* Balina Modal */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Modal (dialog + aksiyonlar)</span>
              <BalinaModal
                open={dsModalOpen}
                onOpenChange={setDsModalOpen}
                trigger={<BalinaButton variant="primary">Modal aç</BalinaButton>}
                title="Mağazayı sil"
                titleIcon={<TrashBin className="h-4 w-4" />}
                description="Bu mağaza ve ilişkili tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz."
                footer={
                  <>
                    <BalinaModalClose asChild>
                      <BalinaButton variant="ghost">Vazgeç</BalinaButton>
                    </BalinaModalClose>
                    <BalinaButton variant="danger" onClick={() => setDsModalOpen(false)}>
                      Sil
                    </BalinaButton>
                  </>
                }
              />
            </div>

            {/* Balina Calendar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">
                Balina Calendar — mode: single · range · multiple
              </span>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-body-tiny-regular text-muted">single (tek tarih)</span>
                  <div
                    className="w-fit rounded-2xl p-2 shadow-elevation-medium"
                    style={{ backgroundColor: 'var(--balina-background-light-shout)' }}
                  >
                    <BalinaCalendar mode="single" selected={dsDay} onSelect={setDsDay} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-body-tiny-regular text-muted">range (tarih aralığı)</span>
                  <div
                    className="w-fit rounded-2xl p-2 shadow-elevation-medium"
                    style={{ backgroundColor: 'var(--balina-background-light-shout)' }}
                  >
                    <BalinaCalendar mode="range" selected={dsRange} onSelect={setDsRange} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-body-tiny-regular text-muted">multiple (birden fazla gün)</span>
                  <div
                    className="w-fit rounded-2xl p-2 shadow-elevation-medium"
                    style={{ backgroundColor: 'var(--balina-background-light-shout)' }}
                  >
                    <BalinaCalendar mode="multiple" selected={dsMulti} onSelect={setDsMulti} />
                  </div>
                </div>
              </div>
            </div>

            {/* Balina TabBar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">
                Balina TabBar (kapatılabilir, connector&apos;lı sekmeler)
              </span>
              <div
                className="shadow-panel-surface isolate overflow-hidden rounded-2xl"
                style={{ backgroundImage: 'var(--balina-panel-surface)' }}
              >
                <div className="px-2 pt-2">
                  <BalinaTabBar
                    items={dsTabBarItems}
                    activeId={dsActiveTab}
                    onSelect={setDsActiveTab}
                    onClose={(id) =>
                      setDsTabBarItems((prev) => {
                        const next = prev.filter((t) => t.id !== id);
                        if (id === dsActiveTab && next.length) setDsActiveTab(next[0].id);
                        return next;
                      })
                    }
                    onAdd={() =>
                      setDsTabBarItems((prev) => {
                        const id = `t${prev.length + 1}-${prev.length}`;
                        setDsActiveTab(id);
                        return [...prev, { id, label: 'Yeni sekme', icon: <Plus className="h-4 w-4" /> }];
                      })
                    }
                  />
                </div>
                <div className="p-4 text-body-default-regular text-[var(--balina-text-default)]">
                  Aktif sekme: {dsTabBarItems.find((t) => t.id === dsActiveTab)?.label ?? '—'}
                </div>
              </div>
            </div>

            {/* Balina AvatarPair */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina AvatarPair (2&apos;li, mask&apos;lı grup)</span>
              <div className="flex items-center gap-6">
                <BalinaAvatarPair first={{ fallback: 'A' }} second={{ fallback: 'B' }} />
                <BalinaAvatarPair first={{ fallback: 'M' }} second={{ fallback: 'E' }} />
                <BalinaAvatarPair first={{ fallback: 'T' }} second={{ fallback: 'S' }} />
              </div>
            </div>

            {/* Balina Icons */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Balina Icons (BalinaIcons)</span>
              <div
                className="grid grid-cols-6 gap-1 sm:grid-cols-10"
                style={{ color: 'var(--balina-icon-strong)' }}
              >
                {Object.entries(BalinaIcons).map(([name, Icon]) => (
                  <div
                    key={name}
                    title={name}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-[var(--balina-background-dark-muted)]"
                  >
                    <Icon />
                    <span className="text-body-micro-medium w-full truncate text-center text-[var(--balina-text-muted)]">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- TİPOGRAFİ ---------------- */}
        <Section
          title="Tipografi"
          description="Inter (--font-inter). Başlık ölçeği + gövde + yardımcı metin tonları."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-3xl / bold</span>
              <p className="text-3xl font-bold tracking-tight">Çok mağazalı analitik</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-2xl / semibold</span>
              <p className="text-2xl font-semibold tracking-tight">Sipariş ve stok yönetimi</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-lg / semibold</span>
              <p className="text-lg font-semibold">Bölüm başlığı</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-base / normal</span>
              <p className="text-base">
                Gövde metni — varsayılan paragraf boyutu. Hızlı kahverengi tilki tembel
                köpeğin üstünden atladı.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-sm / text-muted</span>
              <p className="text-sm text-muted">
                İkincil / yardımcı metin — açıklama ve ipuçları için.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-xs / muted</span>
              <p className="text-xs text-muted">En küçük yardımcı metin · etiket · zaman damgası</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="font-normal">font-normal</span>
              <span className="font-medium">font-medium</span>
              <span className="font-semibold">font-semibold</span>
              <span className="font-bold">font-bold</span>
              <span className="text-muted line-through">line-through</span>
              <code className="rounded bg-default px-1.5 py-0.5 text-sm">inline code</code>
            </div>
          </div>
        </Section>

        {/* ---------------- RENK TOKEN'LARI ---------------- */}
        <Section
          title="Renk Token'ları"
          description="Tema değişkenleri (light/dark [data-theme] ile otomatik değişir)."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            <Swatch name="background" className="bg-background" />
            <Swatch name="surface" className="bg-surface" />
            <Swatch name="default" className="bg-default" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="accent-soft" className="bg-accent-soft" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="success" className="bg-success" />
            <Swatch name="warning" className="bg-warning" />
            <Swatch name="danger" className="bg-danger" />
            <Swatch name="border" className="bg-border" />
            <Swatch name="separator" className="bg-separator" />
            <Swatch name="foreground" className="bg-foreground" />
          </div>
        </Section>

        {/* ---------------- BUTONLAR ---------------- */}
        <Section
          title="Butonlar"
          description="variant · size · isIconOnly · isPending · isDisabled · fullWidth"
        >
          <div className="flex flex-col gap-5">
            <Row>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="danger-soft">Danger soft</Button>
            </Row>
            <Row>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row>
              <Button>
                <Plus />
                İkonlu
              </Button>
              <Button variant="secondary">
                <Bell />
                Bildirimler
              </Button>
              <Button isIconOnly aria-label="Ayarlar" variant="tertiary">
                <Gear />
              </Button>
              <Button isIconOnly aria-label="Sil" variant="danger-soft">
                <TrashBin />
              </Button>
            </Row>
            <Row>
              <Button isPending>Yükleniyor</Button>
              <Button isDisabled>Devre dışı</Button>
              <Button variant="outline" isDisabled>
                Devre dışı
              </Button>
            </Row>
            <div className="max-w-sm">
              <Button fullWidth className="w-full">
                Tam genişlik
              </Button>
            </div>
          </div>
        </Section>

        {/* ---------------- CHIP / ROZET ---------------- */}
        <Section title="Chip (Rozet)" description="variant · size">
          <Row>
            <Chip variant="primary">Primary</Chip>
            <Chip variant="secondary">Secondary</Chip>
            <Chip variant="tertiary">Tertiary</Chip>
            <Chip variant="soft">Soft</Chip>
            <Chip variant="soft" size="sm">
              sm
            </Chip>
            <Chip variant="secondary">
              <CircleCheck className="h-3 w-3" />
              Aktif
            </Chip>
          </Row>
        </Section>

        {/* ---------------- ALERT ---------------- */}
        <Section title="Alert" description="status: accent · success · warning · danger">
          <div className="flex flex-col gap-3">
            <Alert status="accent">
              <Alert.Indicator>
                <CircleInfo className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Bilgilendirme</Alert.Title>
                <Alert.Description>
                  Yeni mağaza entegrasyonu eklendi.
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="success">
              <Alert.Indicator>
                <CircleCheck className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Başarılı</Alert.Title>
                <Alert.Description>Senkronizasyon tamamlandı.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="warning">
              <Alert.Indicator>
                <TriangleExclamation className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Uyarı</Alert.Title>
                <Alert.Description>Stok seviyesi kritik eşiğin altında.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="danger">
              <Alert.Indicator>
                <TriangleExclamation className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Hata</Alert.Title>
                <Alert.Description>Bağlantı kurulamadı, tekrar deneyin.</Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        </Section>

        {/* ---------------- FORM ALANLARI ---------------- */}
        <Section
          title="Form Alanları"
          description="TextField + Label + Input + Description/FieldError · TextArea · SearchField · Select"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField value={text} onChange={setText} isRequired>
              <Label>Mağaza adı</Label>
              <Input placeholder="Örn. Balina Store" />
              <Description>Panelde görünecek isim.</Description>
            </TextField>

            <TextField value="" onChange={() => {}} isInvalid>
              <Label>E-posta</Label>
              <Input placeholder="ornek@firma.com" />
              <FieldError>Geçerli bir e-posta girin.</FieldError>
            </TextField>

            <TextField value="" onChange={() => {}} isDisabled>
              <Label>Devre dışı alan</Label>
              <Input placeholder="Düzenlenemez" />
            </TextField>

            <div className="flex flex-col gap-1.5">
              <Label>Arama</Label>
              <SearchField value={search} onChange={setSearch}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Ürün ara…" />
                </SearchField.Group>
              </SearchField>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Not</Label>
              <TextField value={area} onChange={setArea}>
                <TextArea placeholder="Sipariş notu…" rows={3} />
              </TextField>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Platform</Label>
              <Select selectedKey={select} onSelectionChange={setSelect}>
                <Select.Trigger>
                  <Select.Value placeholder="Platform seçin" />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {[
                      ['shopify', 'Shopify'],
                      ['woocommerce', 'WooCommerce'],
                      ['trendyol', 'Trendyol'],
                      ['hepsiburada', 'Hepsiburada'],
                    ].map(([id, label]) => (
                      <ListBox.Item key={id} id={id} textValue={label}>
                        <span className="flex-1">{label}</span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
        </Section>

        {/* ---------------- INPUT GROUP ---------------- */}
        <Section
          title="InputGroup"
          description="Prefix / Suffix ekli alanlar (alan adı, para birimi, oran)."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Mağaza alan adı</Label>
              <InputGroup>
                <InputGroup.Prefix>https://</InputGroup.Prefix>
                <InputGroup.Input placeholder="magaza" />
                <InputGroup.Suffix>.myshopify.com</InputGroup.Suffix>
              </InputGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fiyat</Label>
              <InputGroup>
                <InputGroup.Prefix>₺</InputGroup.Prefix>
                <InputGroup.Input placeholder="0,00" inputMode="decimal" />
                <InputGroup.Suffix>KDV dahil</InputGroup.Suffix>
              </InputGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kâr marjı</Label>
              <InputGroup>
                <InputGroup.Input placeholder="20" inputMode="numeric" />
                <InputGroup.Suffix>%</InputGroup.Suffix>
              </InputGroup>
            </div>
          </div>
        </Section>

        {/* ---------------- TARİH: CALENDAR & DATE RANGE ---------------- */}
        <Section
          title="Tarih Seçiciler"
          description="Calendar (react-day-picker, Türkçe) · DateRangeInput (popover + JS Date)."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">DateRangeInput</span>
              <div className="max-w-xs">
                <DateRangeInput
                  value={dateRange}
                  onChange={(r) => setDateRange(r ?? undefined)}
                  visibleMonths={2}
                />
              </div>
              <span className="text-xs text-muted">
                Seçili: {dateRange ? 'aralık seçildi' : 'yok'}
              </span>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Calendar · tekli</span>
                <div className="w-fit rounded-xl border border-border bg-surface">
                  <Calendar mode="single" selected={day} onSelect={setDay} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Calendar · aralık</span>
                <div className="w-fit rounded-xl border border-border bg-surface">
                  <Calendar
                    mode="range"
                    selected={range as never}
                    onSelect={(r) => setRange(r ?? undefined)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- SWITCH & CHECKBOX ---------------- */}
        <Section title="Switch & Checkbox" description="isSelected / onChange / isDisabled">
          <div className="flex flex-col gap-4">
            <Row>
              <Switch isSelected={sw1} onChange={setSw1}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm">Otomatik senkron {sw1 ? 'açık' : 'kapalı'}</span>
            </Row>
            <Row>
              <Switch isSelected={sw2} onChange={setSw2}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm">E-posta raporları</span>
              <Switch isDisabled>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm text-muted">Devre dışı</span>
            </Row>
            <Row>
              <Checkbox isSelected={chk1} onChange={setChk1}>
                KDV dahil göster
              </Checkbox>
              <Checkbox isSelected={chk2} onChange={setChk2}>
                İade edilenleri gizle
              </Checkbox>
              <Checkbox isDisabled>Devre dışı</Checkbox>
            </Row>
          </div>
        </Section>

        {/* ---------------- INPUT OTP ---------------- */}
        <Section title="Input OTP" description="6 haneli doğrulama kodu">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} pattern={REGEXP_ONLY_DIGITS}>
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
        </Section>

        {/* ---------------- CARD ---------------- */}
        <Section title="Card" description="Header / Title / Description / Content / Footer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <Card.Header>
                <Card.Title>Toplam Ciro</Card.Title>
                <Card.Description>Son 30 gün</Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="text-2xl font-bold tracking-tight">₺248.350</p>
                <p className="text-sm text-success">+%12,4 geçen aya göre</p>
              </Card.Content>
              <Card.Footer>
                <Button size="sm" variant="secondary">
                  Detay
                </Button>
              </Card.Footer>
            </Card>
            <Card>
              <Card.Header>
                <Card.Title>Aktif Mağazalar</Card.Title>
                <Card.Description>Bağlı platformlar</Card.Description>
              </Card.Header>
              <Card.Content className="flex items-center gap-3">
                <Avatar>
                  <Avatar.Fallback>BS</Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Balina Store</span>
                  <span className="text-xs text-muted">4 platform · senkron aktif</span>
                </div>
                <Chip variant="soft" size="sm" className="ml-auto">
                  Çevrimiçi
                </Chip>
              </Card.Content>
            </Card>
          </div>
        </Section>

        {/* ---------------- AVATAR & TOOLTIP ---------------- */}
        <Section title="Avatar & Tooltip">
          <Row>
            <Avatar>
              <Avatar.Fallback>MÖ</Avatar.Fallback>
            </Avatar>
            <Avatar className="h-11 w-11">
              <Avatar.Fallback>AB</Avatar.Fallback>
            </Avatar>
            <Avatar className="h-8 w-8 bg-accent text-accent-foreground">
              <Avatar.Fallback>CK</Avatar.Fallback>
            </Avatar>
            <Tooltip delay={0}>
              <Button variant="secondary">
                <Heart />
                Üzerine gel
              </Button>
              <Tooltip.Content>Favorilere ekle</Tooltip.Content>
            </Tooltip>
          </Row>
        </Section>

        {/* ---------------- TABS ---------------- */}
        <Section title="Tabs">
          <Tabs selectedKey={tab} onSelectionChange={setTab}>
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="overview">Genel</Tabs.Tab>
                <Tabs.Tab id="orders">Siparişler</Tabs.Tab>
                <Tabs.Tab id="settings">Ayarlar</Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="overview" className="pt-4 text-sm text-muted">
              Genel bakış sekmesi içeriği.
            </Tabs.Panel>
            <Tabs.Panel id="orders" className="pt-4 text-sm text-muted">
              Sipariş listesi sekmesi içeriği.
            </Tabs.Panel>
            <Tabs.Panel id="settings" className="pt-4 text-sm text-muted">
              Ayarlar sekmesi içeriği.
            </Tabs.Panel>
          </Tabs>
        </Section>

        {/* ---------------- DROPDOWN ---------------- */}
        <Section title="Dropdown" description="onAction tabanlı aksiyon menüsü">
          <Dropdown>
            <Dropdown.Trigger aria-label="Aksiyonlar">
              <Button variant="outline">
                <Gear />
                Aksiyonlar
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover
              className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
              style={{
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <Dropdown.Menu
                aria-label="Aksiyonlar"
                onAction={(key) => toast.message(`Seçildi: ${key}`)}
                className="flex flex-col gap-0 py-1 outline-none"
              >
                <Dropdown.Item
                  id="edit"
                  textValue="Düzenle"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                >
                  <Gear className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="flex-1">Düzenle</span>
                </Dropdown.Item>
                <Dropdown.Item
                  id="notify"
                  textValue="Bildirim gönder"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                >
                  <Bell className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="flex-1">Bildirim gönder</span>
                </Dropdown.Item>
                <Dropdown.Item
                  id="delete"
                  textValue="Sil"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-danger outline-none transition-colors data-[hovered=true]:bg-danger/10 data-[focused=true]:bg-danger/10"
                >
                  <TrashBin className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">Sil</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Section>

        {/* ---------------- MODAL & ALERT DIALOG & TOAST ---------------- */}
        <Section title="Modal · AlertDialog · Toast">
          <Row>
            <Button onPress={() => setModalOpen(true)}>Modal aç</Button>
            <Button variant="danger-soft" onPress={() => setAlertOpen(true)}>
              Onay diyaloğu
            </Button>
            <Button variant="secondary" onPress={() => toast.success('Kaydedildi!')}>
              Başarı toast
            </Button>
            <Button variant="secondary" onPress={() => toast.danger('Bir hata oluştu')}>
              Hata toast
            </Button>
          </Row>

          <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-[440px]">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Mağaza ekle</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <div className="flex flex-col gap-4 px-5 py-2">
                      <TextField value="" onChange={() => {}}>
                        <Label>Mağaza adı</Label>
                        <Input placeholder="Örn. Balina Store" />
                      </TextField>
                      <p className="text-sm text-muted">
                        Bağlantı kurulduktan sonra ürünler otomatik senkronize edilir.
                      </p>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="ghost" slot="close">
                      İptal
                    </Button>
                    <Button
                      onPress={() => {
                        setModalOpen(false);
                        toast.success('Mağaza eklendi');
                      }}
                    >
                      Ekle
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          <AlertDialog isOpen={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger">
                      <TriangleExclamation className="h-4 w-4 text-danger" />
                    </AlertDialog.Icon>
                    <AlertDialog.Heading>Mağazayı sil</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="px-5 text-sm text-muted">
                      Bu işlem geri alınamaz. Mağaza ve bağlı veriler kalıcı olarak silinecek.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="ghost" slot="close">
                      Vazgeç
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => {
                        setAlertOpen(false);
                        toast.danger('Mağaza silindi');
                      }}
                    >
                      Sil
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </Section>

        <footer className="border-t border-separator pt-6 text-xs text-muted">
          balinaOS · UI bileşen galerisi — yalnızca geliştirme amaçlı.
        </footer>
      </div>

      <SearchModal
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        sections={searchSections}
        onSaveSearch={() => {}}
      />
    </main>
  );
}
