/**
 * NotificationProvider
 * Wraps the app to handle push notification setup and management.
 * Must be placed INSIDE NavigationContainer and PayrollAuthProvider.
 *
 * Safe for Expo Go — gracefully skips push notification APIs
 * that are not supported in Expo Go (SDK 53+).
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { usePayrollAuth } from '../context/PayrollAuthContext';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, authStatus } = usePayrollAuth();
  const isAuthenticated = authStatus === 'authenticated';
  const [isRegistered, setIsRegistered] = useState(false);
  const listenersSetUp = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user || isRegistered || listenersSetUp.current) return;

    // Lazy import to avoid crash on Expo Go
    const setupNotifications = async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Check if notifications are available (not on Expo Go SDK 53+)
        if (!Device.isDevice) {
          console.log('📱 [NotificationProvider] Not a physical device, skipping push setup');
          return;
        }

        // Request permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            console.log('📱 [NotificationProvider] Permission not granted');
            return;
          }
        }

        // Setup foreground notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Listen for foreground notifications
        const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          console.log('📬 [Notification] Foreground:', notification.request.content.title);
        });

        // Listen for notification taps
        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          console.log('👆 [Notification] Tapped:', data);
          // Navigation is handled by individual screens checking notification data
        });

        listenersSetUp.current = true;
        setIsRegistered(true);
        console.log('✅ [NotificationProvider] Listeners set up');

        return () => {
          receivedSub.remove();
          responseSub.remove();
        };
      } catch (error) {
        // Silently fail on Expo Go where notifications aren't supported
        console.log('📱 [NotificationProvider] Notifications not available (likely Expo Go):',
          error instanceof Error ? error.message : 'unknown error');
      }
    };

    setupNotifications();
  }, [isAuthenticated, user, isRegistered]);

  return <>{children}</>;
};
