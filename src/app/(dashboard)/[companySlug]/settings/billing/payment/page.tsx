'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from '@gravity-ui/icons';
import { Button, Switch } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

interface PaymentMethod {
  id: string;
  last4: string;
  /** Tailwind gradient classes used for the credit-card thumbnail. */
  brand: string;
  isDefault: boolean;
  isEnabled: boolean;
  /** Truthy when the card has expired or is otherwise unusable. */
  isExpired?: boolean;
}

const INITIAL_CARDS: PaymentMethod[] = [
  {
    id: 'card-1',
    last4: '1190',
    brand: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    isDefault: true,
    isEnabled: true,
  },
  {
    id: 'card-2',
    last4: '4440',
    brand: 'bg-gradient-to-br from-rose-500 to-orange-500',
    isDefault: false,
    isEnabled: false,
  },
  {
    id: 'card-3',
    last4: '8421',
    brand: 'bg-gradient-to-br from-zinc-500 to-zinc-700',
    isDefault: false,
    isEnabled: false,
    isExpired: true,
  },
];

function CardThumbnail({ brand }: { brand: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-4 w-[25px] shrink-0 overflow-hidden rounded-[2px] ${brand}`}
    >
      <span className="absolute left-0 right-0 top-1.5 h-1 bg-white/30" />
    </span>
  );
}

export default function PaymentSettingsPage() {
  usePageTitle('Ödeme Detayları');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const [cards, setCards] = useState<PaymentMethod[]>(INITIAL_CARDS);

  const handleToggle = (id: string, value: boolean) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id ? { ...card, isEnabled: value } : card
      )
    );
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
        <h2 className="text-sm font-medium text-foreground">Ödeme Detayları</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 border-b border-black/[0.04] p-3"
              >
                <div className="flex flex-1 items-center gap-3">
                  <CardThumbnail brand={card.brand} />
                  <span
                    className={`text-sm font-medium ${
                      card.isExpired ? 'text-red-500' : 'text-foreground/85'
                    }`}
                  >
                    •••• {card.last4}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {card.isDefault && (
                    <span className="flex h-8 items-center px-1 text-xs font-medium text-default-foreground">
                      Varsayılan
                    </span>
                  )}
                  <Switch
                    isSelected={card.isEnabled}
                    isDisabled={card.isExpired}
                    onChange={(v) => handleToggle(card.id, v)}
                    aria-label={`•••• ${card.last4} ${
                      card.isEnabled ? 'aktif' : 'pasif'
                    }`}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              </div>
            ))}

            {/* Yeni ekle */}
            <button
              type="button"
              onClick={() =>
                router.push(`/${slug}/settings/billing/payment`)
              }
              className="flex cursor-pointer items-center gap-3 p-3 text-left"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-default-foreground">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium text-foreground/85">
                Yeni ekle
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
