/**
 * Push Notification Handler
 * Manages Expo push token registration, foreground/background notification handling.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import notificationService from '../api/services/notificationService';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Also registers the token with the backend.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenData.data;
    console.log('[Push] Expo push token:', pushToken);

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4285F4',
      });
    }

    // Register token with backend
    try {
      await notificationService.registerDeviceToken(pushToken, Platform.OS);
      console.log('[Push] Token registered with backend');
    } catch (err) {
      console.error('[Push] Failed to register token with backend:', err);
    }

    return pushToken;
  } catch (error) {
    console.error('[Push] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Unregister push token from backend (called on logout)
 */
export async function unregisterPushToken(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await notificationService.unregisterDeviceToken(token);
    console.log('[Push] Token unregistered from backend');
  } catch (err) {
    console.error('[Push] Failed to unregister token:', err);
  }
}

/**
 * Add listener for notifications received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (when app was opened via notification tap)
 */
export async function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Parse notification data to determine navigation target
 */
export function parseNotificationData(data: Record<string, any> | undefined): {
  screen: string | null;
  params: Record<string, any>;
} {
  if (!data) return { screen: null, params: {} };

  const type = data.type as string;

  switch (type) {
    case 'leave_approved':
    case 'leave_rejected':
    case 'leave_request':
      return { screen: 'LeaveDetails', params: { leaveId: data.leaveId } };
    case 'claim_approved':
    case 'claim_rejected':
    case 'claim_request':
      return { screen: 'ClaimDetails', params: { claim: { id: data.claimId } } };
    case 'payslip_ready':
      return { screen: 'PayslipDetails', params: { payrollRunId: data.payrollRunId } };
    case 'attendance_reminder':
      return { screen: 'AttendanceCheckIn', params: {} };
    default:
      return { screen: 'Notifications', params: {} };
  }
}
