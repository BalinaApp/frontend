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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNotificationStore, NotificationType, NotificationSetting } from '@/stores/notificationStore';
import { useCompany } from '@/components/providers/CompanyProvider';
import { cn } from '@/lib/utils';

const notificationTypeConfig: Record<NotificationType, {
  icon: React.ElementType;
  label: string;
  description?: string;
  category: 'notification' | 'report';
}> = {
  NEW_ORDER: {
    icon: ShoppingCart,
    label: 'Yeni Sipariş',
    category: 'notification',
  },
  CRITICAL_STOCK: {
    icon: Package,
    label: 'Kritik Stok',
    category: 'notification',
  },
  HIGH_VALUE_ORDER: {
    icon: ShoppingCart,
    label: 'Yüksek Tutarlı Sipariş',
    category: 'notification',
  },
  REFUND_RECEIVED: {
    icon: RefreshCw,
    label: 'İade Talebi',
    category: 'notification',
  },
  SYNC_ERROR: {
    icon: XCircle,
    label: 'Senkronizasyon Hatası',
    category: 'notification',
  },
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
    description: 'Her gün saat 08:00\'de gönderilir',
    category: 'report',
  },
  WEEKLY_REPORT: {
    icon: CalendarDays,
    label: 'Haftalık Rapor',
    description: 'Her Pazartesi saat 08:00\'de gönderilir',
    category: 'report',
  },
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const {
    settings,
    isSettingsLoading,
    fetchSettings,
    updateSetting,
  } = useNotificationStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggle = async (type: NotificationType, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => {
    const currentSetting = settings.find(s => s.notificationType === type);
    if (currentSetting) {
      await updateSetting({
        ...currentSetting,
        [field]: value,
      });
    }
  };

  const getSetting = (type: NotificationType): NotificationSetting => {
    return settings.find(s => s.notificationType === type) || {
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: false,
      thresholdValue: null,
    };
  };

  return (
    <TooltipProvider>
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/${company?.slug}/settings`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Bildirim Ayarları</h1>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2 border-b bg-muted/50">
          <div className="col-span-8 text-xs font-medium text-muted-foreground">Bildirim Türü</div>
          <div className="col-span-2 text-xs font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
            Uygulama
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Dashboard üzerinde bildirim alırsınız</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="col-span-2 text-xs font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
            E-posta
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Kayıtlı e-posta adresinize bildirim gönderilir</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Settings List */}
        <div>
          {isSettingsLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Notifications Section */}
              {Object.entries(notificationTypeConfig)
                .filter(([_, config]) => config.category === 'notification')
                .map(([type, config], index) => {
                  const setting = getSetting(type as NotificationType);
                  const Icon = config.icon;

                  return (
                    <div
                      key={type}
                      className={cn(
                        'grid grid-cols-12 items-center px-4 py-3 border-b',
                        index % 2 === 1 && 'bg-muted/30'
                      )}
                    >
                      {/* Icon and Label */}
                      <div className="col-span-8 flex items-center gap-3">
                        <div className="p-2 rounded-full shrink-0 bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">{config.label}</p>
                      </div>

                      {/* In-App Toggle */}
                      <div className="col-span-2 flex justify-center">
                        <Switch
                          checked={setting.inAppEnabled}
                          onCheckedChange={(checked) =>
                            handleToggle(type as NotificationType, 'inAppEnabled', checked)
                          }
                        />
                      </div>

                      {/* Email Toggle */}
                      <div className="col-span-2 flex justify-center">
                        <Switch
                          checked={setting.emailEnabled}
                          onCheckedChange={(checked) =>
                            handleToggle(type as NotificationType, 'emailEnabled', checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}

              {/* Reports Section Header */}
              <div className="px-4 py-2 bg-muted/50 border-b">
                <span className="text-xs font-medium text-muted-foreground">
                  E-posta Raporları
                </span>
              </div>

              {/* Reports Section */}
              {Object.entries(notificationTypeConfig)
                .filter(([_, config]) => config.category === 'report')
                .map(([type, config], index) => {
                  const setting = getSetting(type as NotificationType);
                  const Icon = config.icon;

                  return (
                    <div
                      key={type}
                      className={cn(
                        'grid grid-cols-12 items-center px-4 py-3 border-b',
                        index % 2 === 1 && 'bg-muted/30'
                      )}
                    >
                      {/* Icon and Label */}
                      <div className="col-span-8 flex items-center gap-3">
                        <div className="p-2 rounded-full shrink-0 bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{config.label}</p>
                          {config.description && (
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          )}
                        </div>
                      </div>

                      {/* In-App Toggle - disabled for reports */}
                      <div className="col-span-2 flex justify-center">
                        <span className="text-xs text-muted-foreground">-</span>
                      </div>

                      {/* Email Toggle */}
                      <div className="col-span-2 flex justify-center">
                        <Switch
                          checked={setting.emailEnabled}
                          onCheckedChange={(checked) =>
                            handleToggle(type as NotificationType, 'emailEnabled', checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </>
    </TooltipProvider>
  );
}
