'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Package,
  ShoppingCart,
  TrendingDown,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { Button, Skeleton, Switch, Tooltip } from '@heroui/react';
import {
  useNotificationStore,
  NotificationType,
  NotificationSetting,
} from '@/stores/notificationStore';
import { useCompany } from '@/components/providers/CompanyProvider';

const notificationTypeConfig: Record<
  NotificationType,
  {
    icon: React.ElementType;
    label: string;
    description?: string;
    category: 'notification' | 'report';
  }
> = {
  NEW_ORDER: { icon: ShoppingCart, label: 'Yeni Sipariş', category: 'notification' },
  CRITICAL_STOCK: { icon: Package, label: 'Kritik Stok', category: 'notification' },
  HIGH_VALUE_ORDER: {
    icon: ShoppingCart,
    label: 'Yüksek Tutarlı Sipariş',
    category: 'notification',
  },
  REFUND_RECEIVED: { icon: RefreshCw, label: 'İade Talebi', category: 'notification' },
  SYNC_ERROR: { icon: XCircle, label: 'Senkronizasyon Hatası', category: 'notification' },
  SYNC_SUCCESS: {
    icon: CheckCircle2,
    label: 'Senkronizasyon Başarılı',
    category: 'notification',
  },
  LOW_PROFIT_MARGIN: {
    icon: TrendingDown,
    label: 'Düşük Kar Marjı',
    category: 'notification',
  },
  DAILY_REPORT: {
    icon: Calendar,
    label: 'Günlük Rapor',
    description: "Her gün saat 08:00'de gönderilir",
    category: 'report',
  },
  WEEKLY_REPORT: {
    icon: CalendarDays,
    label: 'Haftalık Rapor',
    description: "Her Pazartesi saat 08:00'de gönderilir",
    category: 'report',
  },
};

function ToggleSwitch({
  isSelected,
  onChange,
  ariaLabel,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} aria-label={ariaLabel}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const { settings, isSettingsLoading, fetchSettings, updateSetting } =
    useNotificationStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggle = async (
    type: NotificationType,
    field: 'inAppEnabled' | 'emailEnabled',
    value: boolean
  ) => {
    const currentSetting = settings.find((s) => s.notificationType === type);
    if (currentSetting) {
      await updateSetting({ ...currentSetting, [field]: value });
    }
  };

  const getSetting = (type: NotificationType): NotificationSetting => {
    return (
      settings.find((s) => s.notificationType === type) || {
        notificationType: type,
        inAppEnabled: true,
        emailEnabled: false,
        thresholdValue: null,
      }
    );
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Bell className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Bildirim Ayarları</h1>
        </div>
      </div>

      <div className="grid grid-cols-12 border-b border-border bg-surface-secondary px-4 py-2">
        <div className="col-span-8 text-xs font-medium text-muted">Bildirim Türü</div>
        <div className="col-span-2 flex items-center justify-center gap-1 text-center text-xs font-medium text-muted">
          Uygulama
          <Tooltip delay={0}>
            <Info className="h-3.5 w-3.5 cursor-help text-muted" />
            <Tooltip.Content>Dashboard üzerinde bildirim alırsınız</Tooltip.Content>
          </Tooltip>
        </div>
        <div className="col-span-2 flex items-center justify-center gap-1 text-center text-xs font-medium text-muted">
          E-posta
          <Tooltip delay={0}>
            <Info className="h-3.5 w-3.5 cursor-help text-muted" />
            <Tooltip.Content>Kayıtlı e-posta adresinize bildirim gönderilir</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      <div>
        {isSettingsLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            {Object.entries(notificationTypeConfig)
              .filter(([, config]) => config.category === 'notification')
              .map(([type, config], index) => {
                const setting = getSetting(type as NotificationType);
                const Icon = config.icon;

                return (
                  <div
                    key={type}
                    className={`grid grid-cols-12 items-center border-b border-border px-4 py-3 ${
                      index % 2 === 1 ? 'bg-surface-secondary/50' : ''
                    }`}
                  >
                    <div className="col-span-8 flex items-center gap-3">
                      <div className="shrink-0 rounded-full bg-default p-2">
                        <Icon className="h-4 w-4 text-muted" />
                      </div>
                      <p className="text-sm font-medium">{config.label}</p>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <ToggleSwitch
                        isSelected={setting.inAppEnabled}
                        onChange={(v) =>
                          handleToggle(type as NotificationType, 'inAppEnabled', v)
                        }
                        ariaLabel={`${config.label} uygulama bildirimi`}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <ToggleSwitch
                        isSelected={setting.emailEnabled}
                        onChange={(v) =>
                          handleToggle(type as NotificationType, 'emailEnabled', v)
                        }
                        ariaLabel={`${config.label} e-posta bildirimi`}
                      />
                    </div>
                  </div>
                );
              })}

            <div className="border-b border-border bg-surface-secondary px-4 py-2">
              <span className="text-xs font-medium text-muted">E-posta Raporları</span>
            </div>

            {Object.entries(notificationTypeConfig)
              .filter(([, config]) => config.category === 'report')
              .map(([type, config], index) => {
                const setting = getSetting(type as NotificationType);
                const Icon = config.icon;

                return (
                  <div
                    key={type}
                    className={`grid grid-cols-12 items-center border-b border-border px-4 py-3 ${
                      index % 2 === 1 ? 'bg-surface-secondary/50' : ''
                    }`}
                  >
                    <div className="col-span-8 flex items-center gap-3">
                      <div className="shrink-0 rounded-full bg-default p-2">
                        <Icon className="h-4 w-4 text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        {config.description && (
                          <p className="text-xs text-muted">{config.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span className="text-xs text-muted">-</span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <ToggleSwitch
                        isSelected={setting.emailEnabled}
                        onChange={(v) =>
                          handleToggle(type as NotificationType, 'emailEnabled', v)
                        }
                        ariaLabel={`${config.label} e-posta bildirimi`}
                      />
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
    </>
  );
}
