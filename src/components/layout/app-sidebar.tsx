'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  Settings,
  BarChart3,
  Crown,
  Link2,
} from 'lucide-react';

import { TeamSwitcher } from '@/components/layout/team-switcher';
import { NavMain } from '@/components/layout/nav-main';
import { NavSecondary } from '@/components/layout/nav-secondary';
import { NavUser } from '@/components/layout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';

const navSecondary: never[] = [];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const { isPricingEnabled } = usePricingStore();

  const companySlug = currentCompany?.slug || '';
  const userRole = currentCompany?.role;

  // Build navigation with company-scoped URLs
  const allNavItems = [
    {
      title: 'Dashboard',
      url: `/${companySlug}`,
      icon: LayoutDashboard,
      isActive: true,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Mağazalar',
      url: `/${companySlug}/stores`,
      icon: Store,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Stoklar',
      url: `/${companySlug}/inventory`,
      icon: Package,
      roles: ['OWNER', 'ADMIN', 'MEMBER', 'STOCKIST'],
    },
    {
      title: 'Ürün Eşleştirme',
      url: `/${companySlug}/product-mappings`,
      icon: Link2,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Siparişler',
      url: `/${companySlug}/orders`,
      icon: ShoppingCart,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Ödemeler',
      url: `/${companySlug}/payments`,
      icon: CreditCard,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'Raporlar',
      url: `/${companySlug}/reports`,
      icon: BarChart3,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    {
      title: 'İadeler',
      url: `/${companySlug}/refunds`,
      icon: RotateCcw,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
    ...(isPricingEnabled ? [{
      title: 'Planlar',
      url: `/${companySlug}/pricing`,
      icon: Crown,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    }] : []),
    {
      title: 'Ayarlar',
      url: `/${companySlug}/settings`,
      icon: Settings,
      roles: ['OWNER', 'ADMIN', 'MEMBER'],
    },
  ];

  // Filter nav items based on user role
  const navMain = allNavItems.filter((item) =>
    !userRole || item.roles.includes(userRole)
  );

  const userData = {
    name: user?.name || 'Kullanıcı',
    email: user?.email || '',
    avatar: '',
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
