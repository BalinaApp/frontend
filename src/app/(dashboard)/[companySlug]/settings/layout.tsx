'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Gear, AbbrApi } from '@gravity-ui/icons';
import { Avatar } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { userDisplayName } from '@/lib/user-display';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

interface RailItem {
  id: 'general' | 'api' | 'about';
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Tailwind background-color class for the small color tile. */
  tile: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const role = currentCompany?.role;
  const isLimitedRole = role === 'STOCKIST' || role === 'PRODUCT_UPLOADER';

  const slug = (params.companySlug as string) || '';
  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // STOCKIST + PRODUCT_UPLOADER: yalnızca "Genel" rail item'ı görünür.
  const allItems: RailItem[] = [
    { id: 'general', label: 'Genel', href: `/${slug}/settings`, icon: Gear, tile: 'bg-red-500' },
    { id: 'api', label: 'API', href: `/${slug}/settings/api`, icon: AbbrApi, tile: 'bg-indigo-500' },
    { id: 'about', label: 'Hakkımızda', href: `/${slug}/settings/about`, icon: BalinaOsMark, tile: 'bg-zinc-500' },
  ];
  const items = isLimitedRole
    ? allItems.filter((i) => i.id === 'general')
    : allItems;

  // /settings/api activates "API"; /settings/about activates "Hakkımızda";
  // everything else under /settings (including the index and sub-pages like
  // /profile, /company, /team, /notifications) belongs to "Genel".
  const activeId: RailItem['id'] =
    pathname === `/${slug}/settings/api` ||
    pathname.startsWith(`/${slug}/settings/api/`)
      ? 'api'
      : pathname === `/${slug}/settings/about` ||
          pathname.startsWith(`/${slug}/settings/about/`)
        ? 'about'
        : 'general';

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left rail — Figma 12115:30793 */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 px-4 pb-3 pt-3 md:flex">
        {/* Title */}
        <div className="flex items-center gap-1 py-1">
          <h1 className="flex-1 text-base font-medium text-foreground">Ayarlar</h1>
        </div>

        {/* User card */}
        <button
          type="button"
          onClick={() => router.push(`/${slug}/settings/profile`)}
          className="flex cursor-pointer items-center gap-2 rounded-[10px] bg-black/[0.04] p-3 text-left transition-colors hover:bg-black/[0.06]"
        >
          <Avatar className="h-9 w-9 shrink-0 rounded-full">
            <Avatar.Fallback className="rounded-full bg-zinc-500 text-xs font-medium text-white">
              {userInitial}
            </Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col px-1">
            <span className="truncate text-xs font-medium text-foreground">
              {userDisplayName(user)}
            </span>
            <span className="truncate text-xs font-normal text-muted">
              {user?.email}
            </span>
          </div>
        </button>

        {/* Tabs */}
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`menu-pill flex cursor-pointer items-center gap-1 rounded-[10px] p-2 transition-colors focus:outline-none ${
                  isActive ? 'bg-black/[0.08]' : 'hover:bg-black/[0.04]'
                }`}
              >
                {item.id === 'about' ? (
                  // BalinaOsMark zaten gri daire + beyaz balina; tile wrapper
                  // göstermiyoruz, brand mark kendi badge'i olarak duruyor.
                  <item.icon
                    className="h-6 w-6 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white ${item.tile}`}
                    aria-hidden="true"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="flex-1 px-1 text-xs font-medium text-foreground">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Right pane container — Figma 12115:30701 (Details/Frame 20) */}
      <div className="flex flex-1 flex-col p-1">
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white/40 shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      </div>
    </div>
  );
}
