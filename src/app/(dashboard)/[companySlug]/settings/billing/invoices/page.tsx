'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, ChevronLeft, Receipt } from '@gravity-ui/icons';
import { BalinaButton } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useSubscriptionStore, type InvoiceRow } from '@/stores/subscriptionStore';
import { usePageTitle } from '@/hooks/use-page-title';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Ödendi',
  pending: 'Beklemede',
  refunded: 'İade edildi',
  void: 'İptal',
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function InvoicesSettingsPage() {
  usePageTitle('Faturalar');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const { invoices, isLoading, fetchInvoices } = useSubscriptionStore();

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownload = (invoice: InvoiceRow) => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <BalinaButton
          variant="soft"
          size="small"
          aria-label="Geri"
          onClick={() => router.push(`/${slug}/settings/billing`)}
          className="h-8 w-8 cursor-pointer bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </BalinaButton>
        <h2 className="text-sm font-medium text-foreground">Faturalar</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          {isLoading ? (
            // Loading state — kullanıcıya text gösterme; boş alan tut.
            <div className="h-32" aria-hidden="true" />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-surface p-6 text-center">
              <Receipt className="h-8 w-8 text-muted" />
              <span className="text-sm font-medium text-foreground">
                Henüz fatura yok
              </span>
              <span className="text-xs text-muted">
                Bir abonelik başlatınca faturalar burada listelenir.
              </span>
            </div>
          ) : (
            <div className="flex flex-col rounded-xl bg-surface">
              {invoices.map((invoice, index) => {
                const isLast = index === invoices.length - 1;
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
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground/85">
                          {invoice.totalFormatted}
                        </span>
                        <span className="text-xs text-muted">
                          {STATUS_LABELS[invoice.status] ?? invoice.status} ·{' '}
                          {formatDate(invoice.createdAt)}
                        </span>
                      </div>
                    </div>
                    <BalinaButton
                      variant="soft"
                      size="small"
                      disabled={!invoice.invoiceUrl}
                      onClick={() => handleDownload(invoice)}
                      leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
                      className="h-8 cursor-pointer gap-1 bg-black/[0.06] px-3 text-xs font-medium text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
                    >
                      İndir
                    </BalinaButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
