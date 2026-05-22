'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Comments,
  Sparkles,
} from '@gravity-ui/icons';
import { useCompanyStore } from '@/stores/companyStore';
import { useInstagramIntegrationStore } from '@/stores/instagramIntegrationStore';

interface RailItem {
  id: 'threads' | 'kb' | 'learning';
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tile: string;
}

/** Sohbetler alt nav — Pazarlama layout patterniyle aynı: solda dikey menü,
 *  sağda içerik kartı. Sohbetler / Bilgi tabanı / Öğrenme kuyruğu arası
 *  geçiş. Editor / thread-detail gibi tam ekran ihtiyacı olan alt route'lar
 *  rail'i gizlemek için kendi koşullarını eklesin. */
export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const pathname = usePathname();
  const router = useRouter();

  // Erişim gate'i — Instagram bağlı değilse Stores sayfasına çevir.
  // Bağlama akışı artık Stores entegrasyonlar modal'ından yapılıyor.
  const { currentCompany } = useCompanyStore();
  const availability = useInstagramIntegrationStore((s) =>
    currentCompany?.id ? s.availability[currentCompany.id] : null,
  );
  const fetchAvailability = useInstagramIntegrationStore(
    (s) => s.fetchAvailability,
  );

  useEffect(() => {
    if (currentCompany?.id && availability === undefined) {
      void fetchAvailability(currentCompany.id);
    }
  }, [currentCompany?.id, availability, fetchAvailability]);

  useEffect(() => {
    if (!availability) return;
    if (availability.instagramConnected) return;
    router.replace(`/${slug}/stores`);
  }, [availability, pathname, router, slug]);

  const items: RailItem[] = [
    {
      id: 'threads',
      label: 'Sohbetler',
      href: `/${slug}/conversations`,
      icon: Comments,
      tile: 'bg-sky-500',
    },
    {
      id: 'kb',
      label: 'Bilgi tabanı',
      href: `/${slug}/conversations/knowledge-base`,
      icon: BookOpen,
      tile: 'bg-amber-500',
    },
    {
      id: 'learning',
      label: 'Öğrenme kuyruğu',
      href: `/${slug}/conversations/learning`,
      icon: Sparkles,
      tile: 'bg-violet-500',
    },
  ];
  const activeId: RailItem['id'] = pathname.includes('/knowledge-base')
    ? 'kb'
    : pathname.includes('/learning')
      ? 'learning'
      : 'threads';

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left rail */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 px-4 pb-3 pt-3 md:flex">
        <div className="flex items-center gap-1 py-1">
          <h1 className="flex-1 text-base font-medium text-foreground">
            Sohbetler
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

      <div className="flex flex-1 flex-col p-1">
        <div className="scrollbar-none flex flex-1 flex-col overflow-y-auto rounded-lg bg-white/40 shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      </div>
    </div>
  );
}
