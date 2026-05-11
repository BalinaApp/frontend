'use client';

import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  Star,
} from '@gravity-ui/icons';
import { Avatar, Button } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { userDisplayName } from '@/lib/user-display';

interface Row {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Tailwind background-color class for the icon tile. */
  tile: string;
  /** Optional pill text rendered on the right (e.g. "Planı Yükselt"). */
  cta?: string;
  onPress?: () => void;
}

export default function BillingSettingsPage() {
  usePageTitle('Abonelik');

  const router = useRouter();
  const { user } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const planName = user?.plan?.displayName || 'Ücretsiz';

  const rows: Row[] = [
    {
      id: 'plan',
      title: planName,
      description:
        'Gelişmiş özelliklerin ve özel araçların keyfini çıkarmaya ne dersin?',
      icon: Star,
      tile: 'bg-violet-500',
      cta: 'Planı Yükselt',
      onPress: () => router.push(`/${slug}/pricing`),
    },
    {
      id: 'payment',
      title: 'Ödeme Detayları',
      description: 'Ödeme yöntemlerinizi güncelleyin.',
      icon: CreditCard,
      tile: 'bg-green-500',
      onPress: () => router.push(`/${slug}/settings/billing/payment`),
    },
    {
      id: 'invoices',
      title: 'Faturalar',
      description: 'Fatura geçmişinize ve faturalarınıza erişin.',
      icon: Receipt,
      tile: 'bg-red-500',
      onPress: () => router.push(`/${slug}/settings/billing/invoices`),
    },
  ];

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Abonelik</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Avatar */}
          <Avatar className="h-[116px] w-[116px] rounded-full">
            <Avatar.Fallback className="rounded-full bg-zinc-500 text-3xl font-semibold text-white">
              {userInitial}
            </Avatar.Fallback>
          </Avatar>

          {/* Name + email */}
          <div className="flex w-full flex-col items-center gap-1">
            <h3 className="text-xl font-semibold text-foreground">
              {userDisplayName(user)}
            </h3>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>

          {/* Rows */}
          <div className="flex w-full flex-col rounded-xl bg-surface">
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={row.onPress}
                  className={`flex cursor-pointer items-center gap-3 p-3 text-left ${
                    !isLast ? 'border-b border-black/[0.04]' : ''
                  }`}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white ${row.tile}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {row.title}
                      </span>
                      <span className="text-xs text-muted">
                        {row.description}
                      </span>
                    </div>
                  </div>
                  {row.cta ? (
                    <span className="flex h-8 items-center gap-1 px-1 text-xs font-medium text-muted">
                      {row.cta}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
