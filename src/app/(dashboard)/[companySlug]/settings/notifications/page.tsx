'use client';

import { useEffect } from 'react';
import { toast, BalinaSwitch, BalinaBellIcon } from '@/components/balina';
import {
  useNotificationStore,
  NotificationType,
  NotificationSetting,
} from '@/stores/notificationStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface NotificationRow {
  type: NotificationType;
  label: string;
}

// Periodic email reports — the only user-configurable notifications on this
// screen.
const NOTIFICATION_ROWS: NotificationRow[] = [
  { type: 'DAILY_REPORT', label: 'Günlük Rapor' },
  { type: 'WEEKLY_REPORT', label: 'Haftalık Rapor' },
];

export default function NotificationSettingsPage() {
  usePageTitle('Bildirimler');

  const { currentCompany } = useCompanyStore();
  const userRole = currentCompany?.role;
  const isAdminOrOwner = userRole === 'OWNER' || userRole === 'ADMIN';

  const { settings, fetchSettings, updateSetting } = useNotificationStore();
  const push = usePushNotifications(currentCompany?.id);

  const handleTogglePush = async (next: boolean) => {
    if (next) {
      const ok = await push.subscribe();
      if (!ok) {
        toast.danger(
          push.permission === 'denied'
            ? 'Tarayıcı bildirim izni engellenmiş — ayarlardan açın'
            : 'Bildirim aboneliği başarısız',
        );
      } else {
        toast.success('Bildirimler etkinleştirildi');
      }
    } else {
      const ok = await push.unsubscribe();
      if (ok) toast.success('Bildirimler kapatıldı');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getSetting = (type: NotificationType): NotificationSetting =>
    settings.find((s) => s.notificationType === type) || {
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: false,
      thresholdValue: null,
    };

  const handleToggleEmail = async (
    type: NotificationType,
    value: boolean
  ) => {
    const current = getSetting(type);
    await updateSetting({ ...current, emailEnabled: value });
  };

  return (
    <>
      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {/* Title row with green bell tile */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70">
                <BalinaBellIcon className="h-5 w-5" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  Bildirimler
                </span>
                <span className="text-xs text-muted">
                  E-posta ve cihaz bildirimlerini yönetin.
                </span>
              </div>
            </div>

            {/* Push notifications — yalnızca OWNER/ADMIN için ve tarayıcı
                destekliyorsa görünür. Mevcut policy: yeni sipariş bildirimi
                yönetim rollerine push olarak gider. */}
            {isAdminOrOwner && push.isSupported && (
              <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-body-small-one-liner-medium text-foreground/85">
                    Bu cihaza yeni sipariş bildirimi
                  </span>
                  <span className="text-xs text-muted">
                    {push.permission === 'denied'
                      ? 'Tarayıcı bildirim izni engellenmiş — site ayarlarından açabilirsiniz.'
                      : 'Açıkken, yeni sipariş geldiğinde bu cihaza anında bildirim gönderilir.'}
                  </span>
                </div>
                <BalinaSwitch
                  checked={push.isSubscribed}
                  disabled={push.isLoading || push.permission === 'denied'}
                  onCheckedChange={handleTogglePush}
                />
              </div>
            )}

            {/* Rows */}
            {NOTIFICATION_ROWS.map((row, index) => {
              const isLast = index === NOTIFICATION_ROWS.length - 1;
              const setting = getSetting(row.type);
              return (
                <div
                  key={row.type}
                  className={`flex items-center gap-3 p-3 ${
                    !isLast ? 'border-b border-black/[0.04]' : ''
                  }`}
                >
                  <span className="flex-1 text-body-small-one-liner-medium text-foreground/85">
                    {row.label}
                  </span>
                  <BalinaSwitch
                    checked={setting.emailEnabled}
                    onCheckedChange={(v) => handleToggleEmail(row.type, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
