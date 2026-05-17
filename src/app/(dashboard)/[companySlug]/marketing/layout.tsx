'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Envelope, Person } from '@gravity-ui/icons';

interface RailItem {
  id: 'contacts' | 'campaigns';
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Tailwind background-color class for the small color tile. */
  tile: string;
}

/** Marketing alt nav — settings rail patternıyla aynı: solda dikey menü,
 *  sağda içerik kartı. Kontaklar / Kampanyalar arası geçiş. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const pathname = usePathname();

  const items: RailItem[] = [
    {
      id: 'contacts',
      label: 'Kontaklar',
      href: `/${slug}/marketing/contacts`,
      icon: Person,
      tile: 'bg-emerald-500',
    },
    {
      id: 'campaigns',
      label: 'Kampanyalar',
      href: `/${slug}/marketing/campaigns`,
      icon: Envelope,
      tile: 'bg-indigo-500',
    },
  ];
  const activeId: RailItem['id'] = pathname.includes('/marketing/campaigns')
    ? 'campaigns'
    : 'contacts';

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left rail */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 px-4 pb-3 pt-3 md:flex">
        <div className="flex items-center gap-1 py-1">
          <h1 className="flex-1 text-base font-medium text-foreground">
            Pazarlama
          </h1>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`menu-pill flex cursor-pointer items-center gap-1 rounded-[10px] p-2 transition-colors focus:outline-none ${
                  isActive ? 'bg-black/[0.08]' : 'hover:bg-black/[0.04]'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white ${item.tile}`}
                  aria-hidden="true"
                >
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 px-1 text-xs font-medium text-foreground">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Right pane container — settings ile birebir aynı */}
      <div className="flex flex-1 flex-col p-1">
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white/40 shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      </div>
    </div>
  );
}
