'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Link as LinkChain,
  Box,
  ShoppingBag,
  ChartColumn,
  Gear,
  Xmark,
} from '@gravity-ui/icons';
import { Avatar, Button } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useUIStore } from '@/stores/uiStore';

interface NavItemConfig {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: string[];
  matchPaths?: string[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { currentCompany, fetchCompanies } = useCompanyStore();

  const isMobileOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const setIsMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const companySlug = currentCompany?.slug || '';
  const userRole = currentCompany?.role;

  const navItems: NavItemConfig[] = [
    { title: 'Anasayfa', url: `/${companySlug}`, icon: House, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    {
      title: 'Entegrasyon',
      url: `/${companySlug}/stores`,
      icon: LinkChain,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Ürünler',
      url: `/${companySlug}/products`,
      icon: Box,
      roles: ['OWNER', 'ADMIN', 'MEMBER', 'STOCKIST', 'PRODUCT_UPLOADER'],
      matchPaths: [`/${companySlug}/products`, `/${companySlug}/product-mappings`],
    },
    {
      title: 'Siparişler',
      url: `/${companySlug}/orders`,
      icon: ShoppingBag,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Raporlar',
      url: `/${companySlug}/reports`,
      icon: ChartColumn,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Ayarlar',
      url: `/${companySlug}/settings`,
      icon: Gear,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !userRole || item.roles.includes(userRole)
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
          the theme-tinted sidebar instead of looking like a stark cutout. */}
      <Link
        href={`/${companySlug}`}
        aria-label="Anasayfa"
        className="flex h-8 w-8 items-center justify-center"
      >
        <Image
          src="/figma/balina-logo.svg"
          alt="BalinaOS"
          width={32}
          height={32}
          priority
          className="h-8 w-8 mix-blend-multiply"
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
      {/* Desktop sidebar — fixed left, w-20 = 80px */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-20 md:block">
        {sidebarBody}
      </aside>
      {/* Spacer — main flex layout için boş bir 80px sütun bırakır */}
      <div className="hidden w-20 shrink-0 md:block" aria-hidden="true" />

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex h-screen w-20 flex-col bg-background">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Kapat"
                onPress={() => setIsMobileOpen(false)}
              >
                <Xmark className="h-4 w-4" />
              </Button>
            </div>
            {sidebarBody}
          </aside>
        </div>
      )}

    </>
  );
}

