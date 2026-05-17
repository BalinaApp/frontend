'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

const APP_VERSION = '0.2';

export default function AboutSettingsPage() {
  usePageTitle('Hakkımızda');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const handleChangelog = () => {
    // No changelog page yet — link to a future route once it exists.
    router.push(`/${slug}/settings/about`);
  };

  const handleFeedback = () => {
    window.location.href =
      'mailto:hello@balinaos.com?subject=BalinaOS%20geri%20bildirim';
  };

  const openLegal = (path: 'terms' | 'privacy') => {
    const url =
      path === 'terms'
        ? 'https://balinaos.com/terms'
        : 'https://balinaos.com/privacy';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Section header — no back button (rail tab provides navigation) */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <h2 className="text-sm font-medium text-foreground">Hakkımızda</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col gap-6 px-3">
          {/* App info card */}
          <div className="flex flex-col rounded-xl bg-surface">
            {/* BalinaOS row — black silhouette logo + name + version */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Image
                  src="/figma/balina-logo.svg"
                  alt="BalinaOS"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground/85">
                  BalinaOS
                </span>
                <span className="text-xs text-foreground/60">
                  Web Versiyon {APP_VERSION}
                </span>
              </div>
            </div>

            {/* Changelog row */}
            <button
              type="button"
              onClick={handleChangelog}
              className="flex cursor-pointer items-center gap-3 p-3 text-left"
            >
              <span className="flex-1 text-sm font-medium text-foreground/85">
                En yeni özellikleri keşfedin
              </span>
              <span className="flex h-8 items-center gap-1 px-1 text-xs font-medium text-muted">
                Değişiklik Günlüğü
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </div>

          {/* Feedback card */}
          <div className="flex flex-col rounded-xl bg-surface">
            <button
              type="button"
              onClick={handleFeedback}
              className="flex cursor-pointer items-center gap-3 p-3 text-left"
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground/85">
                  Geri bildirim gönder
                </span>
                <span className="text-xs text-foreground/85">
                  BalinaOS&apos;in geleceğini şekillendirmeye yardımcı olun.
                </span>
              </div>
              <span className="flex h-8 items-center px-1 text-muted">
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </div>

          {/* Legal buttons */}
          <div className="flex justify-end gap-1">
            <Button
              variant="tertiary"
              onPress={() => openLegal('terms')}
              className="h-8 cursor-pointer rounded-2xl bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
            >
              Hizmet Şartları
            </Button>
            <Button
              variant="tertiary"
              onPress={() => openLegal('privacy')}
              className="h-8 cursor-pointer rounded-2xl bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
            >
              Gizlilik Politikası
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
