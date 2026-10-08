/**
 * NotificationProvider
 * Opens the right screen when somebody taps a push notification.
 * Must be placed INSIDE NavigationContainer and PayrollAuthProvider.
 *
 * Registering the device's push token is done by the auth context at sign-in
 * (services/pushNotificationHandler); this only listens. A tapped "Leave
 * Approved" used to open the app wherever it last was, and the person then had
 * to find Notifications and the item by hand. Now it opens that leave, using
 * the same mapping the Notifications list uses, so the two always agree.
 *
 * Safe for Expo Go and emulators: anything the runtime does not support fails
 * quietly and the app works as before, minus the jump.
 *
 * A push about another of the person's companies offers to switch and open it,
 * the same as tapping that row on the Notifications list. It used to drop them
 * on the list to find the row again by hand.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useDialog } from './ui/AppDialog';
import { serverMessage } from '../lib/serverMessage';
import notificationService, { notificationTarget, pushRelatedId } from '../api/services/notificationService';

interface NotificationProviderProps {
  children: React.ReactNode;
}

/** The container's own navigation object: outside any navigator, useNavigation returns it. */
type RootNavigation = {
  isReady?: () => boolean;
  navigate: (screen: string, params?: object) => void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, authStatus, switchCompany } = usePayrollAuth();
  const dialog = useDialog();
  const navigation = useNavigation() as unknown as RootNavigation;
  const isAuthenticated = authStatus === 'authenticated';

  // The listeners outlive renders; they read the current values through refs.
  const navRef = useRef(navigation);
  const userRef = useRef(user);
  const switchRef = useRef(switchCompany);
  const dialogRef = useRef(dialog);
  useEffect(() => {
    navRef.current = navigation;
    userRef.current = user;
    switchRef.current = switchCompany;
    dialogRef.current = dialog;
  });
  // A launch from a push can be reported both as the last response and to the listener.
  const handled = useRef(new Set<string>());

  const openFromPush = useCallback(async (response: Notifications.NotificationResponse) => {
    const request = response.notification.request;
    if (handled.current.has(request.identifier)) return;
    handled.current.add(request.identifier);

    const data = (request.content.data ?? {}) as Record<string, unknown>;
    const type = typeof data.type === 'string' ? data.type : null;
    const relatedId = pushRelatedId(data);
    const target = notificationTarget(type, relatedId);

    // On a cold start the push arrives before the screens exist.
    for (let i = 0; i < 20 && navRef.current.isReady && !navRef.current.isReady(); i += 1) {
      await wait(150);
    }
    const nav = navRef.current;

    if (!target || !relatedId) {
      nav.navigate('Notifications');
      return;
    }

    // The stored row is marked read, and on the live server it is also the only place that says
    // which company the item is in: its pushes carry no tenantId. The reworked server's do, and
    // then the lookup runs in the background just to mark it read, so the jump waits for nothing
    // and an item older than the newest twenty still opens in the right company.
    const lookup = (async (): Promise<string | null> => {
      try {
        const page = await notificationService.getList({ page: 1, pageSize: 20 });
        const row = (page.items ?? []).find(
          (n) => (n.relatedId ?? '').toLowerCase() === relatedId.toLowerCase() && (n.type ?? null) === type,
        );
        if (row && !row.isRead) notificationService.markAsRead(row.id).catch(() => {});
        return row?.tenantId ?? null;
      } catch {
        // Could not check: open it anyway. The details screen says so if it cannot load it.
        return null;
      }
    })();
    const pushTenant = typeof data.tenantId === 'string' && data.tenantId ? data.tenantId : null;
    const tenantId = pushTenant ?? (await lookup);

    const signedIn = userRef.current;
    const current = signedIn?.tenantId ?? null;
    if (tenantId && current && tenantId.toLowerCase() !== current.toLowerCase()) {
      // Another of the person's companies. Opening it here would only fail to load, so offer to
      // switch first, exactly as tapping the row on the Notifications list does.
      const company = (signedIn?.availableTenants ?? []).find((t) => t.id.toLowerCase() === tenantId.toLowerCase());
      if (!company) {
        // No longer a member there: the list explains that when the row is tapped.
        nav.navigate('Notifications');
        return;
      }
      const ok = await dialogRef.current.confirm({
        title: `Open in ${company.name}?`,
        message: `This is from ${company.name}. The app will switch to that company.`,
        confirmText: 'Switch and open',
        cancelText: 'Stay here',
      });
      if (!ok) return;
      try {
        await switchRef.current(company.id);
      } catch (err) {
        await dialogRef.current.notify({
          title: 'Could not switch company',
          message: serverMessage(err, 'Please try again.'),
          tone: 'danger',
        });
        return;
      }
      navRef.current.navigate(target.screen, target.params);
      return;
    }
    nav.navigate(target.screen, target.params);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let subscription: { remove: () => void } | null = null;

    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void openFromPush(response);
      });

      // The app was started by tapping a push: the listener above was not there to hear it.
      const launch = Notifications.getLastNotificationResponse();
      if (launch) {
        Notifications.clearLastNotificationResponse();
        void openFromPush(launch);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[NotificationProvider] Push taps not available here:', error instanceof Error ? error.message : error);
      }
    }

    // Removed on sign-out as well as on unmount, so a signed-out phone never navigates into a
    // stack that no longer has those screens.
    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, openFromPush]);

  return <>{children}</>;
};
