'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Person, Envelope } from '@gravity-ui/icons';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';

/** /[companySlug]/marketing — landing kartları. Faz 1 yalnızca Kontaklar
 *  aktif; Kampanyalar kartı görünüyor ama "Yakında" durumu ile pasif. */
export default function MarketingLandingPage() {
  usePageTitle('Pazarlama');
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';

  return (
    <>
      <PageHeader title="Pazarlama" />
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted">
          E-posta marketing kontaklarınız ve kampanyalarınız tek yerde.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link
            href={`/${slug}/marketing/contacts`}
            className="flex flex-col gap-2 rounded-2xl border border-foreground/[0.06] bg-surface p-5 transition-colors hover:bg-foreground/[0.03]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Person className="h-5 w-5" />
            </div>
            <span className="text-base font-medium text-foreground">
              Kontaklar
            </span>
            <span className="text-sm text-muted">
              Mağazalarınızdan toplanan e-posta + ad soyad listesi. Filtrele,
              etiketle, mailing aboneliklerini yönet.
            </span>
          </Link>

          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-foreground/[0.08] bg-surface-secondary p-5 opacity-70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.06] text-muted">
              <Envelope className="h-5 w-5" />
            </div>
            <span className="text-base font-medium text-foreground">
              Kampanyalar
            </span>
            <span className="text-sm text-muted">
              AI destekli içerik, planlama, ürün ekleme. Bir sonraki güncellemede.
            </span>
            <span className="mt-1 self-start rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[11px] font-medium text-muted">
              Yakında
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
