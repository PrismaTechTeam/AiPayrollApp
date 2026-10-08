import { Platform } from 'react-native';
import * as Device from 'expo-device';
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
  /** Push title, e.g. "Leave Approved". Null on notifications from before titles were stored. */
  title?: string | null;
  message: string;
  /** leave_approved, claim_rejected, request_reply, ... Null on older notifications. */
  type?: string | null;
  /** The request, claim or leave application it is about. */
  relatedId?: string | null;
  /** The company that item belongs to. */
  tenantId?: string | null;
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

/** A screen in the app and what to hand it. */
export interface NotificationTarget {
  screen: 'RequestDetails' | 'ClaimDetails' | 'LeaveDetails';
  params: { requestId: string; canApprove?: boolean } | { claimId: string; canApprove?: boolean } | { leaveId: string; canApprove?: boolean };
}

/**
 * The screen a notification opens, or null for ones that are only news (and all older ones).
 *
 * One mapping for both the Notifications list and a tapped push, so the two can never send the
 * same message to different places. A push carries the id under its own key (requestId,
 * claimApplicationId, leaveApplicationId); the stored row carries the same value as relatedId.
 *
 * The *_submitted types are what the server will send an approver once it announces new items
 * (it does not yet); they open as the approver so Approve and Reject are on screen.
 */
export function notificationTarget(type: string | null | undefined, relatedId: string | null | undefined): NotificationTarget | null {
  const id = relatedId ?? '';
  const t = (type ?? '').toLowerCase();
  if (!id) return null;
  const asApprover = t === 'request_employee_reply' || t.endsWith('_submitted');
  if (t.startsWith('request_')) return { screen: 'RequestDetails', params: { requestId: id, ...(asApprover ? { canApprove: true } : {}) } };
  if (t.startsWith('claim_')) return { screen: 'ClaimDetails', params: { claimId: id, ...(asApprover ? { canApprove: true } : {}) } };
  if (t.startsWith('leave_')) return { screen: 'LeaveDetails', params: { leaveId: id, ...(asApprover ? { canApprove: true } : {}) } };
  return null;
}

/** The id a push's data carries, under whichever key the server used for that kind of item. */
export function pushRelatedId(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  for (const key of ['requestId', 'claimApplicationId', 'leaveApplicationId', 'relatedId']) {
    const value = data[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

const notificationService = {
  async registerDeviceToken(token: string, platform: string): Promise<void> {
    const ios = platform.toLowerCase() === 'ios';
    await axiosInstance.post(ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN, {
      token,
      deviceType: 'mobile',
      platform: platform.toLowerCase(),
      // The model and OS version name the phone on Notification Devices, which could
      // otherwise only say "iPhone" or "Android phone". Never sent empty: the server's
      // DTO declares both as non-nullable strings, which ASP.NET treats as required.
      deviceModel: Device.modelName || (ios ? 'iPhone' : 'Android phone'),
      osVersion: Device.osVersion || String(Platform.Version),
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

  /** The bell's dot. Counts the person's notifications in every company, like the list does. */
  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    const count = response.data?.content;
    return typeof count === 'number' ? count : 0;
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
