'use client';

import { useRouter } from 'next/navigation';
import { ArrowDownToLine, ChevronLeft, Receipt } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

interface Invoice {
  id: string;
  /** Display number, e.g. "#007". */
  number: string;
  /** Short month-year label, e.g. "Dec 24". */
  shortDate: string;
  /** Issued date in dd.MM.yyyy. */
  issuedAt: string;
  /** Static URL for the PDF, when wired up. */
  url?: string;
}

const INVOICES: Invoice[] = [
  { id: 'inv-007', number: '#007', shortDate: 'Dec 24', issuedAt: '10.12.2024' },
  { id: 'inv-006', number: '#006', shortDate: 'Nov 24', issuedAt: '10.11.2024' },
  { id: 'inv-005', number: '#005', shortDate: 'Oct 24', issuedAt: '10.10.2024' },
  { id: 'inv-004', number: '#004', shortDate: 'Sep 24', issuedAt: '10.09.2024' },
];

export default function InvoicesSettingsPage() {
  usePageTitle('Faturalar');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const handleDownload = (invoice: Invoice) => {
    if (invoice.url) window.open(invoice.url, '_blank');
  };

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings/billing`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Faturalar</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {INVOICES.map((invoice, index) => {
              const isLast = index === INVOICES.length - 1;
              return (
                <div
                  key={invoice.id}
                  className={`flex items-center gap-3 p-3 ${
                    !isLast ? 'border-b border-black/[0.04]' : ''
                  }`}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-foreground/85">
                      {invoice.number} - {invoice.shortDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{invoice.issuedAt}</span>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => handleDownload(invoice)}
                      className="h-8 cursor-pointer gap-1 rounded-full bg-black/[0.06] px-3 text-xs font-medium text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      İndir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
