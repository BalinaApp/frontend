'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useCompanyStore } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { UsageWarning } from '@/components/pricing/usage-warning';

// Page title mappings
const pageTitles: Record<string, string> = {
  '': 'Dashboard',
  'stores': 'Mağazalar',
  'inventory': 'Stok Yönetimi',
  'orders': 'Siparişler',
  'payments': 'Ödemeler',
  'reports': 'Raporlar',
  'refunds': 'İadeler',
  'pricing': 'Planlar',
  'settings': 'Ayarlar',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentCompany } = useCompanyStore();
  const { usage, fetchUsage, fetchPricingStatus } = usePricingStore();

  // Fetch usage and pricing status on mount
  useEffect(() => {
    fetchUsage();
    fetchPricingStatus();
  }, [fetchUsage, fetchPricingStatus]);

  // Parse current path to build breadcrumbs
  // Path format: /[companySlug]/[module]/[subpage]
  const pathParts = pathname.split('/').filter(Boolean);
  const companySlug = pathParts[0];
  const currentModule = pathParts[1] || '';
  const currentPage = pageTitles[currentModule] || currentModule || 'Dashboard';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/${companySlug}`}>
                    {currentCompany?.name || 'Ana Sayfa'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {/* Usage Warning Banner */}
        {usage && (usage.isNearLimit || usage.isAtLimit) && (
          <UsageWarning
            storeCount={usage.storeCount}
            storeLimit={usage.storeLimit}
            isAtLimit={usage.isAtLimit}
            isNearLimit={usage.isNearLimit}
          />
        )}
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
