'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BalinaSidebar,
  BalinaSidebarItem,
  BalinaMailIcon,
  BalinaCommentsIcon,
  BalinaHomeIcon,
  BalinaIntegrationIcon,
  BalinaProductsIcon,
  BalinaOrderIcon,
  BalinaReportIcon,
  BalinaSettingsIcon,
  BalinaApiIcon,
  BalinaPersonIcon,
  BalinaLockIcon,
  BalinaCompanyIcon,
  BalinaBellIcon,
  BalinaActivityIcon,
  BalinaDropdownItem,
  BalinaIcons,
  BalinaThemePopover,
} from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { SearchModal, type SearchSection } from '@/components/search/search-modal';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useInstagramIntegrationStore } from '@/stores/instagramIntegrationStore';
import { useSidebarPanelContent } from '@/components/providers/SidebarPanel';
import { useUIStore } from '@/stores/uiStore';
import { useThemeStore } from '@/stores/themeStore';

interface NavItemConfig {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: string[];
  matchPaths?: string[];
  showIf?: boolean;
}

export function AppSidebar({ belowNav }: { belowNav?: React.ReactNode } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { currentCompany, fetchCompanies } = useCompanyStore();
  const toggleBalinaAi = useUIStore((s) => s.toggleBalinaAi);
  const isBalinaAiOpen = useUIStore((s) => s.isBalinaAiOpen);
  const themeColor = useThemeStore((s) => s.themeColor);
  const setThemeColor = useThemeStore((s) => s.setThemeColor);
  // Tema rengi sürükleme sırasında çok sık değişir — backend kaydını debounce et.
  const themeSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleThemeChange = React.useCallback(
    (t: string) => {
      if (themeSaveTimer.current) clearTimeout(themeSaveTimer.current);
      themeSaveTimer.current = setTimeout(() => void setThemeColor(t), 500);
    },
    [setThemeColor],
  );

  const availability = useInstagramIntegrationStore((s) =>
    currentCompany?.id ? s.availability[currentCompany.id] : null,
  );
  const fetchAvailability = useInstagramIntegrationStore((s) => s.fetchAvailability);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  React.useEffect(() => {
    if (currentCompany?.id) void fetchAvailability(currentCompany.id);
  }, [currentCompany?.id, fetchAvailability]);

  const companySlug = currentCompany?.slug || '';
  const userRole = currentCompany?.role;
  const isSocialConnected = availability?.instagramConnected ?? false;

  const navItems: NavItemConfig[] = [
    { title: 'Anasayfa', url: `/${companySlug}`, icon: BalinaHomeIcon, roles: ['OWNER', 'ADMIN'] },
    { title: 'Entegrasyon', url: `/${companySlug}/stores`, icon: BalinaIntegrationIcon, roles: ['OWNER', 'ADMIN'] },
    {
      title: 'Ürünler',
      url: `/${companySlug}/products`,
      icon: BalinaProductsIcon,
      roles: ['OWNER', 'ADMIN', 'STOCKIST', 'PRODUCT_UPLOADER'],
      matchPaths: [`/${companySlug}/products`],
    },
    { title: 'Siparişler', url: `/${companySlug}/orders`, icon: BalinaOrderIcon, roles: ['OWNER', 'ADMIN'] },
    { title: 'Raporlar', url: `/${companySlug}/reports`, icon: BalinaReportIcon, roles: ['OWNER', 'ADMIN'] },
    {
      title: 'Pazarlama',
      url: `/${companySlug}/marketing`,
      icon: BalinaMailIcon,
      roles: ['OWNER', 'ADMIN'],
      matchPaths: [`/${companySlug}/marketing`],
    },
    {
      title: 'Sohbetler',
      url: `/${companySlug}/conversations`,
      icon: BalinaCommentsIcon,
      roles: ['OWNER', 'ADMIN'],
      matchPaths: [`/${companySlug}/conversations`],
      showIf: isSocialConnected,
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => (!userRole || item.roles.includes(userRole)) && item.showIf !== false,
  );

  const isItemActive = (item: NavItemConfig, index: number) => {
    const candidates = item.matchPaths ?? [item.url];
    return candidates.some((url) => {
      if (index === 0) return pathname === url;
      return pathname === url || pathname.startsWith(url + '/');
    });
  };

  // --- Ayarlar menüsü (sidebar'da kayan panel) — ayarlar sayfasının sol
  //     rail'inin aynısı. Route'a tıklanınca slug değişir, panel açık kalır. ---
  const settingsBase = `/${companySlug}/settings`;
  const inSettings = pathname.startsWith(settingsBase);
  // Seviye 1 = Genel/API/Hakkımızda; Seviye 2 = Genel'in alt sayfaları
  // (Kişisel bilgiler, Giriş ve güvenlik, …). /settings, /api*, /about* → seviye 1.
  const isSettingsLevel1 =
    pathname === settingsBase ||
    pathname.startsWith(`${settingsBase}/api`) ||
    pathname.startsWith(`${settingsBase}/about`);
  const isSettingsLevel2 = inSettings && !isSettingsLevel1;
  const isLimitedRole = userRole === 'STOCKIST' || userRole === 'PRODUCT_UPLOADER';

  type SettingsMenuItem = {
    id: string;
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
  const level1Items: SettingsMenuItem[] = [
    { id: 'general', title: 'Genel', url: settingsBase, icon: BalinaSettingsIcon },
    { id: 'api', title: 'API', url: `${settingsBase}/api`, icon: BalinaApiIcon },
    { id: 'about', title: 'Hakkımızda', url: `${settingsBase}/about`, icon: BalinaOsMark },
  ];
  const level2Items: SettingsMenuItem[] = [
    { id: 'profile', title: 'Kişisel bilgiler', url: `${settingsBase}/profile`, icon: BalinaPersonIcon },
    { id: 'security', title: 'Giriş ve güvenlik', url: `${settingsBase}/security`, icon: BalinaLockIcon },
    { id: 'company', title: 'Şirket', url: `${settingsBase}/company`, icon: BalinaCompanyIcon },
    { id: 'notifications', title: 'Bildirimler', url: `${settingsBase}/notifications`, icon: BalinaBellIcon },
    { id: 'activity-log', title: 'Aktivite günlüğü', url: `${settingsBase}/activity-log`, icon: BalinaActivityIcon },
  ];
  const level1Active = pathname.startsWith(`${settingsBase}/api`)
    ? 'api'
    : pathname.startsWith(`${settingsBase}/about`)
      ? 'about'
      : 'general';
  // Seviye 1 ve 2 menüleri ayrı render edilir; panel kendi içinde L1↔L2 kayar.
  const visibleLevel1 = isLimitedRole
    ? level1Items.filter((i) => i.id === 'general')
    : level1Items;
  const level2ActiveId =
    level2Items.find((i) => pathname.startsWith(i.url))?.id ?? '';
  const renderMenu = (items: typeof level1Items, activeId: string) => (
    <>
      {items.map((item) => (
        <BalinaSidebarItem
          key={item.id}
          icon={<item.icon className="h-4 w-4" />}
          active={item.id === activeId}
          onClick={() => router.push(item.url)}
        >
          {item.title}
        </BalinaSidebarItem>
      ))}
    </>
  );
  const settingsMenu = renderMenu(visibleLevel1, level1Active);
  const settingsSubmenu = renderMenu(level2Items, level2ActiveId);

  // --- Pazarlama menüsü — ayarlar ile aynı kayan panel (tek seviye). Pazarlama
  //     nav öğesine basınca /marketing'e gidilir, panel açılır; "Geri dön"
  //     ana nav'a döndürür. Route'lar: Genel / Kontaklar / Kampanyalar. ---
  const marketingBase = `/${companySlug}/marketing`;
  const inMarketing = pathname.startsWith(marketingBase);
  const marketingItems: SettingsMenuItem[] = [
    { id: 'contacts', title: 'Kontaklar', url: `${marketingBase}/contacts`, icon: BalinaPersonIcon },
    { id: 'campaigns', title: 'Kampanyalar', url: `${marketingBase}/campaigns`, icon: BalinaMailIcon },
  ];
  const marketingActiveId = pathname.startsWith(`${marketingBase}/campaigns`)
    ? 'campaigns'
    : 'contacts';
  const marketingMenu = renderMenu(marketingItems, marketingActiveId);

  // Sayfa tarafından push edilen serbest sidebar paneli (örn. kampanya editörü
  // blok paleti). Ayarlar/pazarlama'dan önce gelir.
  const { panel: sidebarPanel, options: sidebarPanelOpts } =
    useSidebarPanelContent();

  // İkincil kayan panel (sidebar paneli / ayarlar / pazarlama) — aynı anda biri.
  const secondaryOpen = !!sidebarPanel || inSettings || inMarketing;
  const secondaryMenu = sidebarPanel ?? (inMarketing ? marketingMenu : settingsMenu);
  const secondarySubmenu =
    sidebarPanel || inMarketing ? undefined : settingsSubmenu;
  const secondarySubOpen = sidebarPanel
    ? false
    : inMarketing
      ? false
      : isSettingsLevel2;
  const secondaryBackLabel = sidebarPanel
    ? sidebarPanelOpts.backLabel ?? 'Geri dön'
    : 'Geri dön';
  const secondaryOnBack =
    sidebarPanel && sidebarPanelOpts.onBack
      ? sidebarPanelOpts.onBack
      : () => router.push(`/${companySlug}`);

  const [searchOpen, setSearchOpen] = React.useState(false);

  // Cmd/Ctrl + K ile arama modalını aç/kapat.
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

  const accountMenu = (
    <>
      <BalinaDropdownItem
        icon={<BalinaIcons.Settings className="h-4 w-4" />}
        onSelect={() => router.push(`/${companySlug}/settings`)}
      >
        Ayarlar
      </BalinaDropdownItem>
      <BalinaDropdownItem
        icon={<BalinaIcons.Invite className="h-4 w-4" />}
        onSelect={() => router.push(`/${companySlug}/settings/company`)}
      >
        Ekibini davet et
      </BalinaDropdownItem>
      <BalinaDropdownItem
        icon={<BalinaIcons.Logout className="h-4 w-4" />}
        onSelect={() => void logout()}
      >
        Çıkış yap
      </BalinaDropdownItem>
    </>
  );

  const searchSections: SearchSection[] = [
    {
      title: 'Sayfalar',
      items: visibleNavItems.map((item) => {
        const Icon = item.icon;
        return {
          id: item.title,
          title: item.title,
          icon: <Icon className="h-4 w-4" />,
          action: 'Aç',
          onSelect: () => router.push(item.url),
        };
      }),
    },
  ];

  return (
    <>
      <BalinaSidebar
        name={user?.name || user?.email || 'Hesap'}
        avatarFallback={(user?.name || user?.email || '?').charAt(0).toUpperCase()}
        logo={<BalinaOsMark className="h-6 w-6" aria-label="balinaOS" />}
        accountMenu={accountMenu}
        themeMenu={
          <BalinaThemePopover value={themeColor ?? undefined} onChange={handleThemeChange} />
        }
        aiActive={isBalinaAiOpen}
        onAi={toggleBalinaAi}
        onSearch={() => setSearchOpen(true)}
        footerExtra={belowNav}
        settingsMenu={secondaryMenu}
        settingsOpen={secondaryOpen}
        settingsPanelFull={!!sidebarPanel}
        secondaryKey={sidebarPanel ? 'panel' : inMarketing ? 'marketing' : 'settings'}
        onSettingsOpenChange={(open) =>
          router.push(open ? `/${companySlug}/settings` : `/${companySlug}`)
        }
        backToAppLabel={secondaryBackLabel}
        onBackToApp={secondaryOnBack}
        settingsSubmenu={secondarySubmenu}
        settingsSubOpen={secondarySubOpen}
        subBackLabel="Geri"
        onSubBack={() => router.push(settingsBase)}
      >
        {visibleNavItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <BalinaSidebarItem
              key={item.title}
              icon={<Icon className="h-4 w-4" />}
              active={isItemActive(item, index)}
              onClick={() => router.push(item.url)}
            >
              {item.title}
            </BalinaSidebarItem>
          );
        })}
      </BalinaSidebar>

      <SearchModal
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        placeholder="Sayfa ara…"
        sections={searchSections}
      />
    </>
  );
}
