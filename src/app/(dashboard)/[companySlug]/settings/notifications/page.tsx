'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft } from '@gravity-ui/icons';
import { Button, Switch } from '@heroui/react';
import {
  useNotificationStore,
  NotificationType,
  NotificationSetting,
} from '@/stores/notificationStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

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

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const { settings, fetchSettings, updateSetting } = useNotificationStore();

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
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Bildirimler</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {/* Title row with green bell tile */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  Bildirimler
                </span>
                <span className="text-xs text-muted">
                  E-posta bildirimlerini yönetin.
                </span>
              </div>
            </div>

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
                  <span className="flex-1 text-sm font-medium text-foreground/85">
                    {row.label}
                  </span>
                  <Switch
                    isSelected={setting.emailEnabled}
                    onChange={(v) => handleToggleEmail(row.type, v)}
                    aria-label={`${row.label} e-posta bildirimi`}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
