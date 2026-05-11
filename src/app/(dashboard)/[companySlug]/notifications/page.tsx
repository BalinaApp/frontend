'use client';

import { useEffect, useState } from 'react';
import { Bell, Box as Package, TriangleExclamation as AlertTriangle, TrashBin as Trash2, Check, ChevronLeft } from '@gravity-ui/icons';
import { ShoppingCart, ChartLine as TrendingDown, CircleCheckFill as CheckCircle2, Clock, ArrowsRotateRight as RefreshCw, CircleXmark as XCircle, ChevronRight, Calendar, Calendar as CalendarDays } from '@gravity-ui/icons';
import { Button, ListBox, Select } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useNotificationStore, NotificationType } from '@/stores/notificationStore';
import { usePageTitle } from '@/hooks/use-page-title';

const notificationIcons: Record<NotificationType, React.ElementType> = {
  NEW_ORDER: ShoppingCart,
  CRITICAL_STOCK: Package,
  HIGH_VALUE_ORDER: ShoppingCart,
  REFUND_RECEIVED: RefreshCw,
  SYNC_ERROR: XCircle,
  SYNC_SUCCESS: CheckCircle2,
  LOW_PROFIT_MARGIN: TrendingDown,
  DAILY_REPORT: Calendar,
  WEEKLY_REPORT: CalendarDays,
};

const notificationTone: Record<NotificationType, string> = {
  NEW_ORDER: 'text-accent bg-accent/10',
  CRITICAL_STOCK: 'text-warning bg-warning/10',
  HIGH_VALUE_ORDER: 'text-success bg-success/10',
  REFUND_RECEIVED: 'text-accent bg-accent/10',
  SYNC_ERROR: 'text-danger bg-danger/10',
  SYNC_SUCCESS: 'text-success bg-success/10',
  LOW_PROFIT_MARGIN: 'text-warning bg-warning/10',
  DAILY_REPORT: 'text-muted bg-default',
  WEEKLY_REPORT: 'text-muted bg-default',
};

const notificationTypeLabels: Record<NotificationType, string> = {
  NEW_ORDER: 'Yeni Sipariş',
  CRITICAL_STOCK: 'Kritik Stok',
  HIGH_VALUE_ORDER: 'Yüksek Tutarlı Sipariş',
  REFUND_RECEIVED: 'İade',
  SYNC_ERROR: 'Senkronizasyon Hatası',
  SYNC_SUCCESS: 'Senkronizasyon Başarılı',
  LOW_PROFIT_MARGIN: 'Düşük Kar Marjı',
  DAILY_REPORT: 'Günlük Rapor',
  WEEKLY_REPORT: 'Haftalık Rapor',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

export default function NotificationsPage() {
  usePageTitle('Bildirimler');

  const { currentCompany } = useCompanyStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    total,
    page,
    totalPages,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all');

  useEffect(() => {
    if (currentCompany?.id) {
      fetchNotifications(currentCompany.id, { unreadOnly: filter === 'unread' });
      fetchUnreadCount(currentCompany.id);
    }
  }, [currentCompany?.id, filter, fetchNotifications, fetchUnreadCount]);

  const handleMarkAllAsRead = async () => {
    if (currentCompany?.id) await markAllAsRead(currentCompany.id);
  };

  const handleDeleteAll = async () => {
    if (
      currentCompany?.id &&
      window.confirm('Tüm bildirimleri silmek istediğinize emin misiniz?')
    ) {
      await deleteAllNotifications(currentCompany.id);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (currentCompany?.id) {
      fetchNotifications(currentCompany.id, {
        page: newPage,
        unreadOnly: filter === 'unread',
      });
    }
  };

  const filteredNotifications =
    typeFilter === 'all' ? notifications : notifications.filter((n) => n.type === typeFilter);

  const todayCount = notifications.filter((n) => {
    const today = new Date();
    const notifDate = new Date(n.createdAt);
    return notifDate.toDateString() === today.toDateString();
  }).length;

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Bildirimler</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            selectedKey={filter}
            onSelectionChange={(key) => setFilter(key as 'all' | 'unread')}
            aria-label="Durum"
            className="w-[140px]"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Tümü">
                  Tümü
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="unread" textValue="Okunmamış">
                  Okunmamış
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
          <Select
            selectedKey={typeFilter}
            onSelectionChange={(key) => setTypeFilter(key as 'all' | NotificationType)}
            aria-label="Bildirim Türü"
            className="w-[180px]"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Tüm Türler">
                  Tüm Türler
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {Object.entries(notificationTypeLabels).map(([type, label]) => (
                  <ListBox.Item key={type} id={type} textValue={label}>
                    {label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        <KpiCell label="Toplam" icon={Bell} tone="text-accent" loading={isLoading}>
          <span className="text-2xl font-bold">{total}</span>
        </KpiCell>
        <KpiCell
          label="Okunmamış"
          icon={AlertTriangle}
          tone="text-warning"
          loading={isLoading}
        >
          <span
            className={`text-2xl font-bold ${unreadCount > 0 ? 'text-warning-foreground' : ''}`}
          >
            {unreadCount}
          </span>
        </KpiCell>
        <KpiCell label="Okunmuş" icon={CheckCircle2} tone="text-success" loading={isLoading}>
          <span className="text-2xl font-bold text-success">{total - unreadCount}</span>
        </KpiCell>
        <KpiCell label="Bugün" icon={Clock} tone="text-muted" loading={isLoading} last>
          <span className="text-2xl font-bold">{todayCount}</span>
        </KpiCell>
      </div>

      {(unreadCount > 0 || notifications.length > 0) && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-secondary/30 px-4 py-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onPress={handleMarkAllAsRead}>
              <Check className="h-4 w-4" />
              Tümünü Okundu İşaretle
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onPress={handleDeleteAll}>
              <Trash2 className="h-4 w-4" />
              Tümünü Temizle
            </Button>
          )}
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => null)}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted" />
            <h3 className="text-lg font-medium text-foreground">Bildirim yok</h3>
            <p className="mt-1 text-center text-muted">
              {filter === 'unread'
                ? 'Tüm bildirimlerinizi okudunuz!'
                : 'Henüz bildiriminiz bulunmuyor.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="w-10 px-4 py-2 text-left text-xs font-medium text-muted"></th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Başlık</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Tür</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Tarih</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Durum</th>
                    <th className="w-10 px-4 py-2 text-right text-xs font-medium text-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notification, index) => {
                    const Icon = notificationIcons[notification.type];
                    const tone = notificationTone[notification.type];

                    return (
                      <tr
                        key={notification.id}
                        className={`cursor-pointer border-b border-border transition-colors hover:bg-surface-secondary/50 ${
                          index % 2 === 1 ? 'bg-surface-secondary/30' : ''
                        } ${!notification.isRead ? 'bg-accent/5' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={`rounded-full p-2 ${tone}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p
                              className={`text-sm ${
                                !notification.isRead ? 'font-semibold' : 'font-medium'
                              }`}
                            >
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="mt-0.5 max-w-md truncate text-xs text-muted">
                                {notification.message}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted">
                            {notificationTypeLabels[notification.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {notification.isRead ? (
                            <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                              Okundu
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                              Yeni
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            aria-label="Bildirimi sil"
                            onPress={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-muted">
                  Sayfa {page} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isIconOnly
                    aria-label="Önceki sayfa"
                    onPress={() => handlePageChange(page - 1)}
                    isDisabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    isIconOnly
                    aria-label="Sonraki sayfa"
                    onPress={() => handlePageChange(page + 1)}
                    isDisabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function KpiCell({
  label,
  icon: Icon,
  tone,
  loading,
  last,
  children,
}: {
  label: string;
  icon: React.ElementType;
  tone: string;
  loading: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-4 ${!last ? 'border-r border-border' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      {loading ? null: children}
    </div>
  );
}
