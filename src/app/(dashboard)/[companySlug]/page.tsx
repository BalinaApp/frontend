'use client';

import { useRouter } from 'next/navigation';
import { BalinaHomeIcon, BalinaButton } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { SetupGuide } from '@/components/dashboard/setup-guide';

export default function DashboardPage() {
  usePageTitle('Anasayfa');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const companySlug = currentCompany?.slug ?? '';

  return (
    <>
      <PageHeader
        title="Anasayfa"
        icon={<BalinaHomeIcon className="h-4 w-4" />}
        action={
          <BalinaButton
            variant="soft"
            size="large"
            onClick={() => router.push(`/${companySlug}/stores`)}
          >
            Mağaza Bağla
          </BalinaButton>
        }
      />

      {/* Anasayfa içeriği — raporlar (KPI + grafikler) kaldırıldı; kurulum rehberi kaldı. */}
      <div className="flex flex-col gap-4 p-4">
        <SetupGuide companyId={currentCompany?.id} companySlug={companySlug} />
      </div>
    </>
  );
}
