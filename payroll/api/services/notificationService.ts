import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface NotificationPreferences {
  leaveApproval: boolean;
  claimApproval: boolean;
  attendanceReminder: boolean;
  payslipReady: boolean;
  companyAnnouncement: boolean;
}

export interface NotificationItem {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

const notificationService = {
  async registerDeviceToken(token: string, platform: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN, {
      token,
      deviceType: 'mobile',
      platform: platform.toLowerCase(),
    });
  },

  async unregisterDeviceToken(token: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.NOTIFICATIONS.UNREGISTER_TOKEN, {
      token,
    });
  },

  async getList(params?: { page?: number; pageSize?: number }): Promise<NotificationListResponse> {
    const response = await axiosInstance.get(ENDPOINTS.NOTIFICATIONS.LIST, { params });
    return response.data.content;
  },

  async markAsRead(id: number): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.NOTIFICATIONS.LIST_BASE}/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await axiosInstance.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  },

  async clearAll(): Promise<void> {
    await axiosInstance.delete(ENDPOINTS.NOTIFICATIONS.CLEAR);
  },

  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data.content;
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await axiosInstance.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
    return response.data.content;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    await axiosInstance.put(ENDPOINTS.NOTIFICATIONS.PREFERENCES, prefs);
  },
};

export default notificationService;
