import { create } from 'zustand';
import { api } from '@/services/api';

export type NotificationType =
  | 'NEW_ORDER'
  | 'CRITICAL_STOCK'
  | 'HIGH_VALUE_ORDER'
  | 'REFUND_RECEIVED'
  | 'SYNC_ERROR'
  | 'SYNC_SUCCESS'
  | 'LOW_PROFIT_MARGIN'
  | 'DAILY_REPORT'
  | 'WEEKLY_REPORT';

export interface Notification {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSetting {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  thresholdValue: number | null;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSetting[];
  isLoading: boolean;
  isSettingsLoading: boolean;
  total: number;
  page: number;
  totalPages: number;

  // Actions
  fetchNotifications: (companyId: string, options?: { page?: number; unreadOnly?: boolean }) => Promise<void>;
  fetchUnreadCount: (companyId: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (companyId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: (companyId: string) => Promise<void>;
  updateSetting: (setting: NotificationSetting) => Promise<void>;
  updateSettings: (settings: NotificationSetting[]) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  settings: [],
  isLoading: false,
  isSettingsLoading: false,
  total: 0,
  page: 1,
  totalPages: 0,

  fetchNotifications: async (companyId, options = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      params.append('companyId', companyId);
      if (options.page) params.append('page', options.page.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');

      const response = await api.get(`/notifications?${params.toString()}`);
      set({
        notifications: response.data.notifications,
        total: response.data.total,
        page: response.data.page,
        totalPages: response.data.totalPages,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (companyId) => {
    try {
      const response = await api.get(`/notifications/unread-count?companyId=${companyId}`);
      set({ unreadCount: response.data.count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  fetchSettings: async () => {
    set({ isSettingsLoading: true });
    try {
      const response = await api.get('/notifications/settings');
      set({ settings: response.data, isSettingsLoading: false });
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      set({ isSettingsLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async (companyId) => {
    try {
      await api.put(`/notifications/read-all?companyId=${companyId}`);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        total: state.total - 1,
      }));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  deleteAllNotifications: async (companyId) => {
    try {
      await api.delete(`/notifications?companyId=${companyId}`);
      set({ notifications: [], total: 0, unreadCount: 0 });
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  },

  updateSetting: async (setting) => {
    try {
      await api.put(`/notifications/settings/${setting.notificationType}`, {
        inAppEnabled: setting.inAppEnabled,
        emailEnabled: setting.emailEnabled,
        thresholdValue: setting.thresholdValue,
      });
      set((state) => ({
        settings: state.settings.map((s) =>
          s.notificationType === setting.notificationType ? setting : s
        ),
      }));
    } catch (error) {
      console.error('Failed to update notification setting:', error);
    }
  },

  updateSettings: async (settings) => {
    try {
      await api.put('/notifications/settings', { settings });
      set({ settings });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  },
}));
