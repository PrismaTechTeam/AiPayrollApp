/**
 * useNotifications Hook
 * Manages push notification registration, listeners, and navigation handling.
 * Follows the LetLink notification pattern adapted for AiPayroll.
 *
 * Usage: Called inside NotificationProvider which wraps the app.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import {
  registerForPushNotifications,
  unregisterPushToken,
} from '../services/pushNotificationHandler';
import notificationService from '../api/services/notificationService';

export const useNotifications = () => {
  const { user, authStatus } = usePayrollAuth();
  const navigation = useNavigation<any>();
  const [isRegistered, setIsRegistered] = useState(false);
  const isAuthenticated = authStatus === 'authenticated';
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    const { title, body } = notification.request.content;
    console.log('📬 [Notification] Foreground:', title, '-', body);
  }, []);

  // Handle notification tap — navigate to relevant screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as any;
      console.log('👆 [Notification] Tapped:', data);

      if (!data?.type) {
        navigation.navigate('Notifications');
        return;
      }

      try {
        switch (data.type) {
          // Leave notifications
          case 'leave_approved':
          case 'leave_rejected':
            if (data.leaveApplicationId) {
              navigation.navigate('LeaveDetails', {
                leaveId: data.leaveApplicationId,
                canApprove: false,
              });
            } else {
              navigation.navigate('MyLeaves');
            }
            break;

          // Claim notifications
          case 'claim_approved':
          case 'claim_rejected':
            if (data.claimApplicationId) {
              navigation.navigate('ClaimDetails', {
                claim: { id: data.claimApplicationId },
              });
            } else {
              navigation.navigate('Claims');
            }
            break;

          // Request notifications
          case 'request_approved':
          case 'request_rejected':
            navigation.navigate('MyRequests');
            break;

          // Payslip notification
          case 'payslip_ready':
            navigation.navigate('MyPayslip');
            break;

          // Test notification
          case 'test':
            if (__DEV__) {
              Alert.alert('Test Notification', 'Notification tap handler is working!');
            }
            break;

          // Default — go to notifications list
          default:
            navigation.navigate('Notifications');
        }
      } catch (error) {
        console.error('❌ [Notification] Navigation error:', error);
        navigation.navigate('Notifications');
      }

      // Clear badge after opening
      Notifications.setBadgeCountAsync(0).catch(() => {});
    },
    [navigation]
  );

  // Setup notification listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('🔔 [Notification] Setting up listeners...');

    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      console.log('🔕 [Notification] Removing listeners...');
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
    };
  }, [isAuthenticated, handleNotificationReceived, handleNotificationResponse]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user && !isRegistered) {
      registerForPushNotifications()
        .then((token) => {
          if (token) {
            setIsRegistered(true);
            console.log('✅ [Notification] Registered with token:', token.substring(0, 25) + '...');
          }
        })
        .catch((err) => {
          console.error('❌ [Notification] Registration failed:', err);
        });
    }
  }, [isAuthenticated, user, isRegistered]);

  // Send test notification (for debugging)
  const sendTestNotification = async () => {
    try {
      // Schedule a local notification for immediate delivery
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'Push notifications are working!',
          data: { type: 'test' },
          sound: 'default',
        },
        trigger: null, // Immediately
      });
      console.log('✅ [Notification] Local test notification sent');
      return true;
    } catch (error) {
      console.error('❌ [Notification] Test notification failed:', error);
      return false;
    }
  };

  return {
    isRegistered,
    sendTestNotification,
  };
};
