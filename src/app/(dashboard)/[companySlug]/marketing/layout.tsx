'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

/** Marketing alt sub-nav — Kontaklar / Kampanyalar. PageHeader üstüne
 *  oturmuyor; her sayfa kendi PageHeader'ını render eder, layout sadece
 *  yatay tab şeridini sağlar. */
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

  return (
    <>
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
