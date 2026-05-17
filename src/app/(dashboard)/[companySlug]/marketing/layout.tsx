'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { CircleInfo, Xmark } from '@gravity-ui/icons';

const IYS_DISMISS_KEY = 'balina-marketing-iys-dismissed';

/** Marketing alt sub-nav — Kontaklar / Kampanyalar. PageHeader üstüne
 *  oturmuyor; her sayfa kendi PageHeader'ını render eder, layout sadece
 *  yatay tab şeridini + İYS uyarı banner'ını sağlar. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const pathname = usePathname();
  const tabs = [
    { id: 'contacts', label: 'Kontaklar', href: `/${slug}/marketing/contacts` },
    {
      id: 'campaigns',
      label: 'Kampanyalar',
      href: `/${slug}/marketing/campaigns`,
    },
  ];
  const activeId = pathname.includes('/marketing/campaigns')
    ? 'campaigns'
    : 'contacts';

  // İYS banner — localStorage'da kalıcı dismissed işareti.
  const [iysDismissed, setIysDismissed] = useState(true);
  useEffect(() => {
    const v = window.localStorage.getItem(IYS_DISMISS_KEY);
    setIysDismissed(v === '1');
  }, []);
  const dismissIys = () => {
    window.localStorage.setItem(IYS_DISMISS_KEY, '1');
    setIysDismissed(true);
  };

  return (
    <>
      {!iysDismissed && (
        <div className="flex items-start gap-3 border-b border-warning/30 bg-warning/[0.06] px-4 py-2.5">
          <CircleInfo className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <div className="flex-1 text-xs text-foreground">
            <span className="font-medium">İYS uyarısı:</span> Türkiye&apos;de
            ticari elektronik ileti göndermek için alıcının önceden iznine ve
            kaydının{' '}
            <a
              href="https://iys.org.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              İYS sistemi
            </a>
            nde olmasına ihtiyaç var. BalinaOS otomatik İYS senkronizasyonu
            yapmaz — kampanya göndermeden önce alıcılarınızın İYS izinlerini
            doğrulamak sizin sorumluluğunuzdadır.
          </div>
          <button
            type="button"
            onClick={dismissIys}
            aria-label="Uyarıyı gizle"
            className="rounded p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Xmark className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-1 border-b border-black/[0.06] px-4 pt-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={[
              'inline-flex h-9 items-center justify-center rounded-t-lg px-3 text-sm font-medium transition-colors',
              activeId === t.id
                ? 'border-x border-t border-black/[0.06] bg-surface text-foreground'
                : 'text-muted hover:text-foreground',
            ].join(' ')}
            style={
              activeId === t.id
                ? { marginBottom: -1, borderBottomColor: 'transparent' }
                : undefined
            }
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
