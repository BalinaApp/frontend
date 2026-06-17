'use client';

import { useRouter } from 'next/navigation';
import { Star, ChevronRight } from '@gravity-ui/icons';
import {
  BalinaAvatar,
  BalinaButton,
  BalinaPersonIcon,
  BalinaLockIcon,
  BalinaCompanyIcon,
  BalinaBellIcon,
  BalinaActivityIcon,
} from '@/components/balina';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { userDisplayName } from '@/lib/user-display';
import { MobileSidebarToggle } from '@/components/layout/mobile-sidebar-toggle';

interface SettingsItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Hide entry when the pricing/subscription system is disabled in DB. */
  requiresPricing?: boolean;
  /** Hide unless user has OWNER/ADMIN role on the current company. */
  requiresOwnerAdmin?: boolean;
  /** Sınırlı roller (STOCKIST + PRODUCT_UPLOADER) için görünür mü? Default
   *  false — sınırlı roller yalnızca kendi profillerini görür. */
  limitedRoleVisible?: boolean;
}

export default function SettingsGeneralPage() {
  usePageTitle('Genel');

  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const { isPricingEnabled, fetchPricingStatus } = usePricingStore();

  useEffect(() => {
    fetchPricingStatus();
  }, [fetchPricingStatus]);

  const slug = currentCompany?.slug ?? '';
  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const allItems: SettingsItem[] = [
    {
      id: 'profile',
      label: 'Kişisel bilgiler',
      href: `/${slug}/settings/profile`,
      icon: BalinaPersonIcon,
      limitedRoleVisible: true,
    },
    {
      id: 'security',
      label: 'Giriş ve güvenlik',
      href: `/${slug}/settings/security`,
      icon: BalinaLockIcon,
    },
    {
      id: 'company',
      label: 'Şirket',
      href: `/${slug}/settings/company`,
      icon: BalinaCompanyIcon,
    },
    {
      id: 'notifications',
      label: 'Bildirimler',
      href: `/${slug}/settings/notifications`,
      icon: BalinaBellIcon,
    },
    {
      id: 'activity-log',
      label: 'Aktivite günlüğü',
      href: `/${slug}/settings/activity-log`,
      icon: BalinaActivityIcon,
      // Doc §1.1: yalnızca OWNER/ADMIN üyeler audit log endpoint'ine erişebilir.
      requiresOwnerAdmin: true,
    },
    {
      id: 'subscription',
      label: 'Abonelik',
      href: `/${slug}/settings/billing`,
      icon: Star,
      requiresPricing: true,
    },
  ];

  const userRole = currentCompany?.role;
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
  const isLimitedRole =
    userRole === 'STOCKIST' || userRole === 'PRODUCT_UPLOADER';
  const items = allItems.filter(
    (item) =>
      (!item.requiresPricing || isPricingEnabled) &&
      (!item.requiresOwnerAdmin || isOwnerOrAdmin) &&
      // Sınırlı roller için sadece limitedRoleVisible=true satırlar görünür.
      (!isLimitedRole || item.limitedRoleVisible === true),
  );

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobil sidebar toggle — başlık kaldırıldı, çizgi yok; yalnızca mobilde. */}
      <div className="flex h-[61px] items-center gap-2 px-3.5 md:hidden">
        <MobileSidebarToggle />
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Avatar */}
          <BalinaAvatar
            fallback={userInitial}
            alt={userDisplayName(user)}
            className="h-[116px] w-[116px] text-3xl font-semibold"
          />

          {/* Name + email */}
          <div className="flex w-full flex-col items-center gap-1">
            <h3 className="text-xl font-semibold text-foreground">
              {userDisplayName(user)}
            </h3>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>

          {/* List card */}
          <div className="flex w-full flex-col rounded-xl bg-surface">
            {items.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === items.length - 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors ${
                    !isLast ? 'border-b border-black/[0.02]' : ''
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''}`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-body-small-one-liner-medium flex-1 text-foreground/85">
                    {item.label}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted" />
                </button>
              );
            })}
          </div>

          {/* Logout button */}
          <BalinaButton variant="soft" size="large" onClick={handleLogout}>
            Çıkış yap
          </BalinaButton>
        </div>
      </div>
    </>
  );
}
