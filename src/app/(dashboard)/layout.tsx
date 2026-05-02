'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useCompanyStore } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { UsageWarning } from '@/components/pricing/usage-warning';

const pageTitles: Record<string, string> = {
  '': 'Dashboard',
  stores: 'Mağazalar',
  inventory: 'Stok Yönetimi',
  orders: 'Siparişler',
  payments: 'Ödemeler',
  reports: 'Raporlar',
  refunds: 'İadeler',
  pricing: 'Planlar',
  settings: 'Ayarlar',
  'product-mappings': 'Ürün Eşleştirme',
  notifications: 'Bildirimler',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentCompany } = useCompanyStore();
  const { usage, fetchUsage, fetchPricingStatus } = usePricingStore();

  useEffect(() => {
    fetchUsage();
    fetchPricingStatus();
  }, [fetchUsage, fetchPricingStatus]);

  const pathParts = pathname.split('/').filter(Boolean);
  const companySlug = pathParts[0];
  const currentModule = pathParts[1] || '';
  const currentPage = pageTitles[currentModule] || currentModule || 'Dashboard';

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <main className="flex h-screen flex-1 flex-col overflow-hidden bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2 pl-12 md:pl-2">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <span className="text-muted">
                {currentCompany?.name || 'Ana Sayfa'}
              </span>
              {currentModule && (
                <>
                  <span className="text-muted">/</span>
                  <span className="font-medium" aria-current="page">
                    {currentPage}
                  </span>
                </>
              )}
              {!currentModule && companySlug && (
                <span className="font-medium" aria-current="page">
                  Dashboard
                </span>
              )}
            </nav>
          </div>
        </header>
        {usage && (usage.isNearLimit || usage.isAtLimit) && (
          <UsageWarning
            storeCount={usage.storeCount}
            storeLimit={usage.storeLimit}
            isAtLimit={usage.isAtLimit}
            isNearLimit={usage.isNearLimit}
          />
        )}
        <div className="flex flex-1 flex-col overflow-auto">{children}</div>
      </main>
    </div>
  );
}
