'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Clock,
  Trash2,
  Check,
  RefreshCw,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanyStore } from '@/stores/companyStore';
import { useNotificationStore, NotificationType } from '@/stores/notificationStore';
import { cn } from '@/lib/utils';

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

const notificationColors: Record<NotificationType, string> = {
  NEW_ORDER: 'text-blue-500 bg-blue-50',
  CRITICAL_STOCK: 'text-orange-500 bg-orange-50',
  HIGH_VALUE_ORDER: 'text-green-500 bg-green-50',
  REFUND_RECEIVED: 'text-purple-500 bg-purple-50',
  SYNC_ERROR: 'text-red-500 bg-red-50',
  SYNC_SUCCESS: 'text-green-500 bg-green-50',
  LOW_PROFIT_MARGIN: 'text-yellow-500 bg-yellow-50',
  DAILY_REPORT: 'text-indigo-500 bg-indigo-50',
  WEEKLY_REPORT: 'text-indigo-500 bg-indigo-50',
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
    if (currentCompany?.id) {
      await markAllAsRead(currentCompany.id);
    }
  };

  const handleDeleteAll = async () => {
    if (currentCompany?.id && window.confirm('Tüm bildirimleri silmek istediğinize emin misiniz?')) {
      await deleteAllNotifications(currentCompany.id);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (currentCompany?.id) {
      fetchNotifications(currentCompany.id, { page: newPage, unreadOnly: filter === 'unread' });
    }
  };

  const filteredNotifications = typeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === typeFilter);

  const todayCount = notifications.filter(n => {
    const today = new Date();
    const notifDate = new Date(n.createdAt);
    return notifDate.toDateString() === today.toDateString();
  }).length;

  return (
    <>
      {/* Header with Filters */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Bildirimler</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="unread">Okunmamış</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | NotificationType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bildirim Türü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              {Object.entries(notificationTypeLabels).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b">
        {/* Total */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Toplam</span>
            <Bell className="h-5 w-5 text-blue-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="text-2xl font-bold">{total}</span>
          )}
        </div>

        {/* Unread */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Okunmamış</span>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className={cn(
              'text-2xl font-bold',
              unreadCount > 0 ? 'text-orange-600' : ''
            )}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* Read */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Okunmuş</span>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="text-2xl font-bold text-green-600">{total - unreadCount}</span>
          )}
        </div>

        {/* Today */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Bugün</span>
            <Clock className="h-5 w-5 text-purple-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="text-2xl font-bold">{todayCount}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {(unreadCount > 0 || notifications.length > 0) && (
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Tümünü Okundu İşaretle
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDeleteAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Tümünü Temizle
            </Button>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">Bildirim yok</h3>
            <p className="text-muted-foreground text-center mt-1">
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
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-10"></th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Başlık</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tür</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tarih</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Durum</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notification, index) => {
                    const Icon = notificationIcons[notification.type];
                    const colorClass = notificationColors[notification.type];

                    return (
                      <tr
                        key={notification.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/50',
                          index % 2 === 0 ? '' : 'bg-muted/30',
                          !notification.isRead && 'bg-primary/5'
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={cn('p-2 rounded-full', colorClass)}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className={cn(
                              'text-sm',
                              !notification.isRead ? 'font-semibold' : 'font-medium'
                            )}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">
                                {notification.message}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {notificationTypeLabels[notification.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {notification.isRead ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Okundu
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                              Yeni
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Sayfa {page} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
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
