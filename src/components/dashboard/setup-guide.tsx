'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronUp, CircleCheck } from '@gravity-ui/icons';
import { BalinaButton, BalinaProductsIcon, BalinaReportIcon } from '@/components/balina';
import { useStoreStore } from '@/stores/storeStore';
import { useAiStore } from '@/stores/aiStore';
import { useInventoryStore } from '@/stores/inventoryStore';

/* Anasayfa kurulum rehberi — Shopify "Get ready to sell" tasarımının portu.
 * Gruplu akordiyon: bir grup açık (beyaz kart) ve alt adımları gösterir; aktif
 * alt adım açıklama + aksiyon butonlarıyla genişler. Tamamlanma mümkün olduğunca
 * gerçek veriden; rapor/ekip adımları localStorage ile işaretlenir. */

type Step = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

type Group = {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  steps: Step[];
};

export function SetupGuide({
  companyId,
  companySlug,
}: {
  companyId?: string;
  companySlug: string;
}) {
  const router = useRouter();
  const stores = useStoreStore((s) => s.stores);
  const fetchStores = useStoreStore((s) => s.fetchStores);
  const products = useInventoryStore((s) => s.products);
  const fetchProducts = useInventoryStore((s) => s.fetchProducts);
  const integrations = useAiStore((s) => s.integrations);
  const fals = useAiStore((s) => s.fals);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);

  // Veriden türetilemeyen adımlar (rapor / ekip) localStorage'da.
  const lsKey = companyId ? `balina:setup:${companyId}` : '';
  const [flags, setFlags] = React.useState<{ report: boolean; team: boolean }>({
    report: false,
    team: false,
  });
  React.useEffect(() => {
    if (!lsKey) return;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) setFlags(JSON.parse(raw));
    } catch {
      /* yok say */
    }
  }, [lsKey]);
  const markFlag = (k: 'report' | 'team') => {
    setFlags((prev) => {
      const next = { ...prev, [k]: true };
      try {
        if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
      } catch {
        /* yok say */
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (!companyId) return;
    void fetchStores(companyId);
    void fetchIntegrations(companyId);
    void fetchProducts(companyId, { limit: 1, page: 1 });
  }, [companyId, fetchStores, fetchIntegrations, fetchProducts]);

  const groups: Group[] = [
    {
      id: 'setup',
      title: 'Mağazanı kur',
      icon: BalinaProductsIcon,
      steps: [
        {
          id: 'store',
          title: 'İlk mağazanı bağla',
          description:
            'WooCommerce, Shopify, Trendyol ya da Hepsiburada mağazanı bağlayarak verilerini içe aktar.',
          done: stores.length > 0,
          actionLabel: 'Mağaza bağla',
          onAction: () => router.push(`/${companySlug}/stores`),
        },
        {
          id: 'product',
          title: 'Ürünleri eşleştir',
          description:
            'Mağazandaki ürünleri içe aktar ve eşleştir; stok ile fiyat takibi başlasın.',
          done: products.length > 0,
          actionLabel: 'Ürün ekle',
          onAction: () => router.push(`/${companySlug}/products/new`),
          secondaryLabel: 'İçe aktar',
          onSecondary: () => router.push(`/${companySlug}/inventory`),
        },
        {
          id: 'ai',
          title: 'AI entegrasyonunu bağla',
          description:
            'Fal.ai ya da OpenAI hesabını bağla; görsel/video ve metin üretimini aç.',
          done: fals.length > 0 || integrations.length > 0,
          actionLabel: 'AI bağla',
          onAction: () => router.push(`/${companySlug}/stores`),
        },
      ],
    },
    {
      id: 'grow',
      title: 'Analiz ve ekip',
      icon: BalinaReportIcon,
      steps: [
        {
          id: 'report',
          title: 'İlk raporunu gör',
          description:
            'Satış, kâr ve iade raporlarını inceleyerek işinin nabzını tut.',
          done: flags.report,
          actionLabel: 'Raporu gör',
          onAction: () => {
            markFlag('report');
            router.push(`/${companySlug}/reports`);
          },
        },
        {
          id: 'team',
          title: 'Ekibini davet et',
          description:
            'Ekip arkadaşlarını davet ederek birlikte çalışmaya başla.',
          done: flags.team,
          actionLabel: 'Ekip davet et',
          onAction: () => {
            markFlag('team');
            router.push(`/${companySlug}/settings/company`);
          },
        },
      ],
    },
  ];

  const allSteps = groups.flatMap((g) => g.steps);
  const total = allSteps.length;
  const doneCount = allSteps.filter((s) => s.done).length;

  // Açık grup: kullanıcı seçimi yoksa ilk tamamlanmamış adımı içeren grup.
  const firstIncompleteGroup =
    groups.find((g) => g.steps.some((s) => !s.done))?.id ?? groups[0]?.id;
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const activeGroup = openGroup ?? firstIncompleteGroup;

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-xl font-semibold text-foreground">
          Satışa hazırlanın
        </h2>
        <p className="text-sm text-muted">
          <span className="text-foreground/80">Başlamak için bir rehber.</span>{' '}
          İşin büyüdükçe burada yeni ipuçları ve içgörüler göreceksin.
        </p>
      </div>

      {/* Rehber kabı */}
      <div className="flex flex-col gap-1 rounded-2xl bg-black/[0.03] p-1.5">
        {/* "Kurulum rehberi · X / N tamamlandı" */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground/25 text-foreground/40">
            {doneCount === total && <Check className="h-3 w-3" />}
          </span>
          <span className="text-sm font-medium text-foreground">
            Kurulum rehberi
          </span>
          <span className="text-foreground/30">·</span>
          <span className="rounded-md bg-black/[0.06] px-2 py-0.5 text-xs font-medium text-muted">
            {doneCount} / {total} tamamlandı
          </span>
        </div>

        {groups.map((group) => {
          const open = group.id === activeGroup;
          const GroupIcon = group.icon;
          const groupDone = group.steps.every((s) => s.done);
          const activeStepId = group.steps.find((s) => !s.done)?.id;
          if (!open) {
            // Kapalı grup — sade satır.
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setOpenGroup(group.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-black/[0.03]"
              >
                <GroupIcon className="h-5 w-5 shrink-0 text-foreground/70" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {group.title}
                </span>
                {groupDone && (
                  <CircleCheck className="h-4 w-4 text-success" />
                )}
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
            );
          }
          // Açık grup — beyaz kart.
          return (
            <div
              key={group.id}
              className="flex flex-col rounded-xl bg-surface shadow-[0_0_0_0.5px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <button
                type="button"
                onClick={() => setOpenGroup(`__closed__${group.id}`)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <GroupIcon className="h-5 w-5 shrink-0 text-foreground" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {group.title}
                </span>
                <ChevronUp className="h-4 w-4 text-muted" />
              </button>
              <div className="h-px bg-foreground/[0.06]" />
              <div className="flex flex-col py-1">
                {group.steps.map((step) => {
                  const isActive = step.id === activeStepId;
                  return (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 px-3 py-3"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          step.done
                            ? 'bg-green-500 text-white'
                            : 'border border-foreground/25'
                        }`}
                      >
                        {step.done && <Check className="h-3 w-3" />}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <span
                          className={`text-sm font-medium ${
                            step.done ? 'text-muted' : 'text-foreground'
                          }`}
                        >
                          {step.title}
                        </span>
                        {isActive && (
                          <>
                            <p className="text-sm text-muted">
                              {step.description}
                            </p>
                            <div className="flex items-center gap-3 pt-0.5">
                              <BalinaButton
                                variant="primary"
                                size="small"
                                onClick={step.onAction}
                                className="h-8 cursor-pointer rounded-lg px-3 text-sm font-medium"
                              >
                                {step.actionLabel}
                              </BalinaButton>
                              {step.secondaryLabel && (
                                <button
                                  type="button"
                                  onClick={step.onSecondary}
                                  className="cursor-pointer text-sm font-medium text-foreground/80 hover:text-foreground"
                                >
                                  {step.secondaryLabel}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* "Hepsini gördünüz" ayracı */}
      <div className="flex items-center gap-3 px-1">
        <span className="h-px flex-1 bg-foreground/[0.06]" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-muted">
          <CircleCheck className="h-3.5 w-3.5" />
          Hepsini gördünüz
        </span>
        <span className="h-px flex-1 bg-foreground/[0.06]" />
      </div>
    </div>
  );
}
