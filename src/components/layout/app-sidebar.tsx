'use client';

import * as React from 'react';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Link as LinkChain,
  Box,
  ShoppingBag,
  ChartColumn,
  Comments,
  Envelope,
  Gear,
} from '@gravity-ui/icons';
import { Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useInstagramIntegrationStore } from '@/stores/instagramIntegrationStore';
import { useUIStore } from '@/stores/uiStore';

interface NavItemConfig {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: string[];
  matchPaths?: string[];
  /** Görünmesi için ek bir ön-koşul (örn. sosyal medya bağlı olması). */
  showIf?: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { currentCompany, fetchCompanies } = useCompanyStore();

  const isMobileOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const setIsMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);

  // Sosyal medya (Instagram) bağlantı durumu — "Sohbetler" menü item'ı gate'i.
  // Şirket değişince yeniden çek; boş cache değeri "henüz bilinmiyor" demek
  // ve item'ı gizli tutar (false-positive flash yerine güvenli default).
  const availability = useInstagramIntegrationStore((s) =>
    currentCompany?.id ? s.availability[currentCompany.id] : null,
  );
  const fetchAvailability = useInstagramIntegrationStore(
    (s) => s.fetchAvailability,
  );

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  React.useEffect(() => {
    if (currentCompany?.id) {
      void fetchAvailability(currentCompany.id);
    }
  }, [currentCompany?.id, fetchAvailability]);

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const companySlug = currentCompany?.slug || '';
  const userRole = currentCompany?.role;
  const isSocialConnected = availability?.instagramConnected ?? false;

  const navItems: NavItemConfig[] = [
    { title: 'Anasayfa', url: `/${companySlug}`, icon: House, roles: ['OWNER', 'ADMIN'] },
    {
      title: 'Entegrasyon',
      url: `/${companySlug}/stores`,
      icon: LinkChain,
      roles: ['OWNER', 'ADMIN'],
    },
    {
      title: 'Ürünler',
      url: `/${companySlug}/products`,
      icon: Box,
      roles: ['OWNER', 'ADMIN', 'STOCKIST', 'PRODUCT_UPLOADER'],
      matchPaths: [`/${companySlug}/products`],
    },
    {
      title: 'Siparişler',
      url: `/${companySlug}/orders`,
      icon: ShoppingBag,
      roles: ['OWNER', 'ADMIN'],
    },
    {
      title: 'Raporlar',
      url: `/${companySlug}/reports`,
      icon: ChartColumn,
      roles: ['OWNER', 'ADMIN'],
    },
    {
      title: 'Pazarlama',
      url: `/${companySlug}/marketing`,
      icon: Envelope,
      roles: ['OWNER', 'ADMIN'],
      matchPaths: [`/${companySlug}/marketing`],
    },
    {
      title: 'Sohbetler',
      url: `/${companySlug}/conversations`,
      icon: Comments,
      roles: ['OWNER', 'ADMIN'],
      matchPaths: [`/${companySlug}/conversations`],
      // Sosyal medya bağlı değilken menüde gösterme.
      showIf: isSocialConnected,
    },
    {
      title: 'Ayarlar',
      url: `/${companySlug}/settings`,
      icon: Gear,
      roles: ['OWNER', 'ADMIN', 'STOCKIST', 'PRODUCT_UPLOADER'],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) =>
      (!userRole || item.roles.includes(userRole)) && item.showIf !== false,
  );

  const isItemActive = (item: NavItemConfig, index: number) => {
    const candidates = item.matchPaths ?? [item.url];
    return candidates.some((url) => {
      // Anasayfa (index 0) only matches exact slug.
      if (index === 0) return pathname === url;
      return pathname === url || pathname.startsWith(url + '/');
    });
  };

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const sidebarBody = (
    <div className="flex h-full w-full flex-col items-center gap-3 px-5 py-4">
      {/* Logo (32x32) — multiply blend so the silhouette darkens against
          the theme-tinted sidebar instead of looking like a stark cutout.
          Sınırlı rollerde (STOCKIST/PRODUCT_UPLOADER) anasayfa yok → /products. */}
      <Link
        href={
          userRole === 'STOCKIST' || userRole === 'PRODUCT_UPLOADER'
            ? `/${companySlug}/products`
            : `/${companySlug}`
        }
        aria-label={
          userRole === 'STOCKIST' || userRole === 'PRODUCT_UPLOADER'
            ? 'Ürünler'
            : 'Anasayfa'
        }
        className="flex h-8 w-8 items-center justify-center"
      >
        <BalinaOsMark
          tone="muted"
          width={32}
          height={32}
          className="h-8 w-8"
          aria-label="balinaOS"
        />
      </Link>

      {/* 1x8 pill separator */}
      <div
        className="h-2 w-px rounded-full bg-black/[0.12]"
        aria-hidden="true"
      />

      {/* Nav — column, gap 12px, fills remaining height */}
      <nav
        aria-label="Ana menü"
        className="flex flex-1 flex-col items-center gap-3"
      >
        {visibleNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isItemActive(item, index);
          return (
            <Link
              key={item.title}
              href={item.url}
              aria-label={item.title}
              aria-current={isActive ? 'page' : undefined}
              className={`menu-pill flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus:outline-none ${
                isActive
                  ? 'bg-black/[0.08] text-foreground'
                  : 'text-black/50 hover:bg-black/[0.04] hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>

      {/* Avatar — direct link to Genel ayarlar */}
      <Link
        href={`/${companySlug}/settings`}
        aria-label="Hesap ayarları"
        className="flex h-9 w-9 items-center justify-center rounded-full"
      >
        <Avatar className="h-9 w-9 rounded-full">
          <Avatar.Fallback className="rounded-full bg-zinc-500 text-xs font-medium text-white">
            {userInitial}
          </Avatar.Fallback>
        </Avatar>
      </Link>
    </div>
  );

  return (
    <>
      {/* Sidebar — fixed left, w-20 = 80px. Desktop'ta her zaman görünür;
          mobilde isMobileOpen=true iken slide-in (translate-x). Overlay
          değil — push: spacer width animasyonuyla main content sağa kayar. */}
      <aside
        className={`fixed left-0 top-0 z-30 h-screen w-20 transition-transform duration-300 ease-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarBody}
      </aside>
      {/* Spacer — flex layout'ta yer kapatır. Desktop'ta sabit 80px;
          mobilde open=80px, closed=0 (smooth width transition). */}
      <div
        className={`shrink-0 transition-[width] duration-300 ease-out md:w-20 ${
          isMobileOpen ? 'w-20' : 'w-0'
        }`}
        aria-hidden="true"
      />
    </>
  );
}

