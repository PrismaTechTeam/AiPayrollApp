/**
 * Payroll Authentication Context
 * Real auth with Firebase + backend JWT integration.
 * Manages user state, tokens, tenant switching, and role switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import authService, { LoginResponse, MobileEmployee, TenantInfo } from '../api/services/authService';
import { API_CONFIG } from '../api/config';
import { tokenManager, tenantIdFromToken } from '../api/tokenManager';
import { registerForPushNotifications, unregisterPushToken } from '../services/pushNotificationHandler';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import { SIGN_IN_UNAVAILABLE } from '../lib/firebaseErrors';
import companyService from '../api/services/companyService';

export interface PayrollUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string; // computed: firstName + lastName
  role: string | null; // Current active role in current tenant
  availableRoles: string[];
  tenantId: string | null;
  tenantName: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  company: string | null; // alias for tenantName
  availableCompanies: string[];
  availableTenants: TenantInfo[];
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'no_company' | 'pending_approval';

interface PayrollAuthContextType {
  user: PayrollUser | null;
  employee: MobileEmployee | null;
  isLoading: boolean;
  authStatus: AuthStatus;
  currentRole: string | null;
  availableRoles: string[];
  currentCompany: string | null;
  availableCompanies: string[];
  /** Set when the server ended the session on its own; the login page says so once. */
  sessionNotice: string | null;
  dismissSessionNotice: () => void;
  switchRole: (newRole: string) => Promise<void>;
  switchCompany: (tenantId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithFirebaseToken: (firebaseIdToken: string, deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Re-reads the companies this person belongs to (e.g. after HR approved a join
   * request) and, for someone who had none, moves them into one — preferring
   * `preferTenantId`. Resolves true when the person has a company afterwards.
   */
  refreshAuthState: (preferTenantId?: string) => Promise<boolean>;
  refreshTenants: () => Promise<void>;
  /**
   * Asks again whether a join request is waiting for HR. Call after cancelling
   * one: otherwise the person stayed in the "waiting for HR" screens until the
   * app was restarted.
   */
  recheckPending: () => Promise<void>;
  /** After the server accepted a name change, keep the stored user in step. */
  updateUserProfile: (patch: { firstName?: string; lastName?: string }) => Promise<void>;
}

const PayrollAuthContext = createContext<PayrollAuthContextType | undefined>(undefined);

const USER_STORE_KEY = 'payroll_user';
const EMPLOYEE_STORE_KEY = 'payroll_employee';
const PUSH_TOKEN_KEY = 'payroll_push_token';
const KEEP_SIGNED_IN_KEY = 'payroll_keep_signed_in';
const DEVICE_ID_KEY = 'payroll_device_id';

const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';

/**
 * Records the login screen's "Keep me signed in" choice.
 *
 * <p>Absent or 'true' means restore the session on next launch, which is what
 * this app has always done — so an install that predates this setting, or a
 * write that fails, keeps the old behaviour rather than silently signing
 * everyone out. Only an explicit 'false' opts out.</p>
 */
export const setKeepSignedIn = async (keep: boolean): Promise<void> => {
  try {
    await SecureStore.setItemAsync(KEEP_SIGNED_IN_KEY, keep ? 'true' : 'false');
  } catch {
    // A preference is not worth failing a sign-in over.
  }
};

let deviceIdCache: string | null = null;

/**
 * One id for this install, kept in SecureStore.
 *
 * It used to be Constants.installationId, which expo-constants no longer has,
 * so every sign-in fell through to sessionId and reported a new device on each
 * launch. Nothing here needs it to be secret, only stable.
 */
export const getDeviceId = async (): Promise<string> => {
  if (deviceIdCache) return deviceIdCache;
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      deviceIdCache = stored;
      return stored;
    }
  } catch {
    // Unreadable store: a fresh id for this run is still better than none.
  }
  const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  deviceIdCache = id;
  SecureStore.setItemAsync(DEVICE_ID_KEY, id).catch(() => {});
  return id;
};

const sameId = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const sameTenants = (a: TenantInfo[], b: TenantInfo[] | undefined): boolean =>
  JSON.stringify(a) === JSON.stringify(b ?? []);

export const PayrollAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PayrollUser | null>(null);
  const [employee, setEmployee] = useState<MobileEmployee | null>(null);
  // Only the cold-start restore. Sign-in used to set it too, and App.tsx swaps the
  // whole navigator for a spinner while it is true: the login page unmounted
  // mid-request, so a wrong password came back to an empty form with no message.
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  // The uid whose no-company state turned out to be "waiting for HR".
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const pushTokenRef = useRef<string | null>(null);

  // The callbacks below read the session through these refs rather than closing
  // over state. A callback that depends on `user` changes identity on every
  // write, and screens that list it as an effect dependency ran again on each
  // write — the join-request screen and Home fetched, wrote, and fetched again
  // until the API answered 429.
  const userRef = useRef<PayrollUser | null>(null);
  const employeeRef = useRef<MobileEmployee | null>(null);
  // True while this provider is ending the session itself (sign-out, the
  // "keep me signed in" opt-out), so the token-cleared listener stays quiet.
  const endingRef = useRef(false);

  /** In memory only: refs and state together, so the next read is never stale. */
  const setSession = useCallback((nextUser: PayrollUser | null, nextEmployee: MobileEmployee | null) => {
    userRef.current = nextUser;
    employeeRef.current = nextEmployee;
    setUser(nextUser);
    setEmployee(nextEmployee);
  }, []);

  /** Persisted first, so a failed write leaves the screen and the store agreeing. */
  const saveSession = useCallback(
    async (nextUser: PayrollUser, nextEmployee: MobileEmployee | null) => {
      await SecureStore.setItemAsync(USER_STORE_KEY, JSON.stringify(nextUser));
      if (nextEmployee) {
        await SecureStore.setItemAsync(EMPLOYEE_STORE_KEY, JSON.stringify(nextEmployee));
      } else {
        await SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY);
      }
      setSession(nextUser, nextEmployee);
    },
    [setSession],
  );

  // Initialize — check for stored user session
  useEffect(() => {
    void checkStoredAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The server refused to refresh (refresh token expired, or revoked by a
  // sign-out elsewhere) and axiosInstance cleared the tokens. Without this the
  // app stayed "signed in" with no token and every screen failed with no way
  // back. No API calls here: there is no token left to make them with.
  useEffect(
    () =>
      tokenManager.onCleared(() => {
        if (endingRef.current || !userRef.current) return;
        setSession(null, null);
        setSessionNotice(SESSION_ENDED);
        SecureStore.deleteItemAsync(USER_STORE_KEY).catch(() => {});
        SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY).catch(() => {});
        const firebaseAuth = getFirebaseAuth();
        if (firebaseAuth?.currentUser) signOut(firebaseAuth).catch(() => {});
      }),
    [setSession],
  );

  // Worked out during render, not in an effect. As an effect it lagged one
  // render behind: on the render where loading ended it still said 'loading',
  // which App.tsx does not recognise, so the full app (Home) mounted and fired
  // its requests for a frame before the right stack replaced it.
  const hasCompany = !!user && (!!user.tenantId || (user.availableTenants?.length ?? 0) > 0);
  const baseStatus: AuthStatus = isLoading
    ? 'loading'
    : !user
      ? 'unauthenticated'
      : hasCompany
        ? 'authenticated'
        : 'no_company';
  const authStatus: AuthStatus =
    baseStatus === 'no_company' && !!user && pendingUid === user.uid ? 'pending_approval' : baseStatus;
  const uid = user?.uid ?? null;

  // No tenant yet. Two very different situations wear this shape: somebody who has
  // not asked to join anywhere, and somebody who asked and is waiting on HR.
  //
  // 'pending_approval' has existed in the type and in App.tsx's navigator since the
  // beginning but was NEVER assigned, so the waiting screen was only ever reached by
  // navigating to it straight after submitting. Close the app and reopen it and the
  // person landed back on "join a company" with no sign their request existed — so
  // they sent it again, and the backend answered "You already have a pending
  // request", which reads like the app is broken.
  //
  // Optimistic: 'no_company' now, upgraded if a pending request comes back. A failed
  // lookup leaves them on the screen that can still take an action. Asked once per
  // person, not on every write to `user`.
  useEffect(() => {
    if (baseStatus !== 'no_company' || !uid) return undefined;
    let cancelled = false;
    companyService
      .getJoinRequests()
      .then((requests) => {
        if (cancelled) return;
        setPendingUid(requests.some((r) => r.status === 'PENDING') ? uid : null);
      })
      .catch(() => {
        // Offline, or the endpoint failed. 'no_company' is the safe landing.
      });
    return () => {
      cancelled = true;
    };
  }, [baseStatus, uid]);

  const checkStoredAuth = async () => {
    try {
      // "Keep me signed in", unticked on the login screen, means the stored
      // session must not be restored. Only an explicit 'false' opts out, so a
      // missing value (every install before this setting existed) still
      // restores exactly as before.
      const keepSignedIn = await SecureStore.getItemAsync(KEEP_SIGNED_IN_KEY);
      if (keepSignedIn === 'false') {
        endingRef.current = true;
        try {
          await SecureStore.deleteItemAsync(USER_STORE_KEY);
          await SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY);
          await tokenManager.clearTokens();
          // Firebase keeps its own signed-in user in AsyncStorage. Left there, the
          // verify-email page offered "Continue" to the next person on the phone
          // and signed them in as the previous one — possibly HR — with no
          // password. authStateReady waits for that user to be read back first;
          // signing out before then finds nobody and does nothing.
          const firebaseAuth = getFirebaseAuth();
          if (firebaseAuth) {
            await firebaseAuth.authStateReady().catch(() => {});
            if (firebaseAuth.currentUser) await signOut(firebaseAuth).catch(() => {});
          }
        } finally {
          endingRef.current = false;
        }
        return;
      }

      const storedUser = await SecureStore.getItemAsync(USER_STORE_KEY);
      const storedEmployee = await SecureStore.getItemAsync(EMPLOYEE_STORE_KEY);
      const accessToken = await tokenManager.getAccessToken();

      if (storedUser && accessToken) {
        const userData = JSON.parse(storedUser) as PayrollUser;
        setSession(userData, storedEmployee ? (JSON.parse(storedEmployee) as MobileEmployee) : null);

        if (__DEV__) console.log('[Auth] Restored stored session');

        // Re-register push token on session restore
        const storedPushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
        if (storedPushToken) {
          pushTokenRef.current = storedPushToken;
        }
        registerForPushNotifications().then(token => {
          if (token) {
            pushTokenRef.current = token;
            SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
          }
        });
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildUserFromLoginResponse = (data: LoginResponse): PayrollUser => {
    // The token is issued for the server's "current" company, which is not
    // necessarily tenants[0] — that list comes back in no particular order. For
    // anyone in two companies, taking the first one showed company A's name and
    // role while every call ran against company B. The reworked server names
    // that company outright (activeTenantId); the live one only puts it in the
    // token, so the claim stays the fallback.
    const claimed = tenantIdFromToken(data.token);
    const activeTenant =
      data.tenants.find(t => sameId(t.id, data.activeTenantId)) ??
      data.tenants.find(t => sameId(t.id, claimed)) ??
      data.tenants.find(t => sameId(t.id, data.employee?.tenantId)) ??
      data.tenants[0] ??
      null;

    return {
      uid: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      name: `${data.user.firstName} ${data.user.lastName}`.trim(),
      role: activeTenant?.role ?? null,
      availableRoles: activeTenant?.role ? [activeTenant.role] : [],
      tenantId: activeTenant?.id ?? null,
      tenantName: activeTenant?.name ?? null,
      employeeId: data.employee?.id ?? null,
      employeeCode: data.employee?.employeeCode ?? null,
      company: activeTenant?.name ?? null,
      availableCompanies: data.tenants.map(t => t.name),
      availableTenants: data.tenants,
    };
  };

  /**
   * Login with Firebase ID token (primary mobile auth flow)
   */
  const loginWithFirebaseToken = useCallback(async (firebaseIdToken: string, deviceId: string) => {
    try {
      const data = await authService.firebaseLogin(firebaseIdToken, deviceId);
      let userData = buildUserFromLoginResponse(data);
      let employeeData = data.employee;

      // The live server issues the token for the company the account last
      // chose, even when the person is no longer a member there. The app then
      // shows another company from the list while the token belongs to the old
      // one, and every company call answers 403 until a manual switch. Switching
      // now gets a token, and the employee record, for the company on screen.
      const claimed = tenantIdFromToken(data.token);
      if (claimed && userData.tenantId && !sameId(claimed, userData.tenantId)) {
        try {
          const switched = await authService.switchTenant(userData.tenantId);
          employeeData = switched.employee;
          userData = {
            ...userData,
            employeeId: switched.employee?.id ?? null,
            employeeCode: switched.employee?.employeeCode ?? null,
          };
        } catch (switchError) {
          // No worse than before: the company can still be switched by hand.
          if (__DEV__) console.warn('[Login] Could not move the token to the company shown:', switchError);
        }
      }

      await saveSession(userData, employeeData);
      setSessionNotice(null);

      // Register push token after successful login
      registerForPushNotifications().then(token => {
        if (token) {
          pushTokenRef.current = token;
          SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
        }
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[Login] Backend request failed. API base URL was:', API_CONFIG.baseUrl, error);
      }
      throw error;
    }
  }, [saveSession]);

  /**
   * Login with email/password: Firebase Auth → ID token → backend firebase-login
   */
  const login = useCallback(async (email: string, password: string) => {
    const configured = isFirebaseConfigured();
    if (!configured) {
      if (__DEV__) {
        getFirebaseAuth(); // logs which EXPO_PUBLIC_FIREBASE_* values are missing
        throw new Error(
          'Firebase is not configured. Copy VITE_FIREBASE_* from AiPayrollWeb/.env.development into AiPayrollApp/.env as EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID. See FIREBASE_SETUP.md.'
        );
      }
      throw new Error(SIGN_IN_UNAVAILABLE);
    }
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) throw new Error(SIGN_IN_UNAVAILABLE);

    let loginStep = 'firebase_signin';
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      loginStep = 'get_id_token';
      const firebaseIdToken = await credential.user.getIdToken();
      const deviceId = await getDeviceId();
      loginStep = 'backend_login';
      await loginWithFirebaseToken(firebaseIdToken, deviceId);
    } catch (error) {
      if (__DEV__) {
        console.error('[Login] Failed at step:', loginStep, '| Error:', error);
      }
      throw error;
    }
  }, [loginWithFirebaseToken]);

  const logout = useCallback(async () => {
    endingRef.current = true;
    try {
      // Read once: the push token is cleared below but the logout call still
      // needs it, so the server stops pushing to this phone only.
      const storedPushToken =
        pushTokenRef.current || (await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null));

      // Each step on its own: a failed push unregister (offline) used to skip
      // everything after it, so the person tapped Sign out and stayed signed in.
      try {
        await unregisterPushToken(storedPushToken);
      } catch {
        // The server drops a dead push token on its own.
      }
      pushTokenRef.current = null;
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});

      // Call backend to deactivate auth tokens
      try {
        await authService.logout(await getDeviceId(), storedPushToken);
      } catch {
        // Ignore logout API errors — we still clear local state
      }

      await tokenManager.clearTokens().catch(() => {});
      await SecureStore.deleteItemAsync(USER_STORE_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY).catch(() => {});
      setSession(null, null);
      setSessionNotice(null);
      // The Firebase session is persisted across restarts now, so it has to be
      // ended here as well or the next person on this phone inherits it.
      const firebaseAuth = getFirebaseAuth();
      if (firebaseAuth?.currentUser) await signOut(firebaseAuth).catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      endingRef.current = false;
    }
  }, [setSession]);

  const switchRole = useCallback(async (newRole: string) => {
    const current = userRef.current;
    if (!current) throw new Error('Not authenticated');
    await saveSession({ ...current, role: newRole }, employeeRef.current);
  }, [saveSession]);

  const switchCompany = useCallback(async (tenantId: string) => {
    const current = userRef.current;
    if (!current) throw new Error('Not authenticated');

    try {
      const result = await authService.switchTenant(tenantId);

      let tenants = current.availableTenants;
      if (!tenants.some(t => sameId(t.id, tenantId))) {
        // Joined after the list was loaded (HR approved while signed in), so the
        // name and role are not known yet. Without this the switch went through
        // with a blank company name.
        tenants = await authService.getMyTenants().catch(() => tenants);
      }
      const tenant = tenants.find(t => sameId(t.id, tenantId));

      const updatedUser: PayrollUser = {
        ...(userRef.current ?? current),
        tenantId,
        tenantName: tenant?.name ?? null,
        company: tenant?.name ?? null,
        role: tenant?.role ?? null,
        availableRoles: tenant?.role ? [tenant.role] : [],
        employeeId: result.employee?.id ?? null,
        employeeCode: result.employee?.employeeCode ?? null,
        availableTenants: tenants,
        availableCompanies: tenants.map(t => t.name),
      };

      await saveSession(updatedUser, result.employee);
    } catch (error) {
      if (__DEV__) console.error('Error switching company:', error);
      throw error;
    }
  }, [saveSession]);

  const refreshAuthState = useCallback(async (preferTenantId?: string): Promise<boolean> => {
    const current = userRef.current;
    if (!current) return false;

    let tenants: TenantInfo[];
    try {
      tenants = await authService.getMyTenants();
    } catch {
      // Offline, a timeout or a 429 teaches nothing. This used to carry on and
      // write employee=null, so one bad moment unlinked the employee (no Punch,
      // no payslips) until the next sign-in.
      return !!current.tenantId;
    }

    const latest = userRef.current;
    if (!latest || latest.uid !== current.uid) return false; // signed out meanwhile

    if (latest.tenantId) {
      // Already inside a company: only the list can have changed. Written back
      // only on a real change, so callers that react to `user` do not loop.
      if (!sameTenants(tenants, latest.availableTenants)) {
        await saveSession(
          { ...latest, availableTenants: tenants, availableCompanies: tenants.map(t => t.name) },
          employeeRef.current,
        );
      }
      return true;
    }

    if (tenants.length === 0) return false;

    // First company (HR just approved). The stored token was issued with no
    // company in it; switching gets one that carries this company, along with
    // the employee record and the real role, instead of hoping a later 401 and
    // refresh happen to mint the right one.
    const target = tenants.find(t => sameId(t.id, preferTenantId)) ?? tenants[0];
    try {
      const result = await authService.switchTenant(target.id);
      const now = userRef.current;
      if (!now || now.uid !== current.uid) return false;
      await saveSession(
        {
          ...now,
          tenantId: target.id,
          tenantName: target.name,
          company: target.name,
          role: target.role ?? null,
          availableRoles: target.role ? [target.role] : [],
          employeeId: result.employee?.id ?? null,
          employeeCode: result.employee?.employeeCode ?? null,
          availableTenants: tenants,
          availableCompanies: tenants.map(t => t.name),
        },
        result.employee,
      );
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[Auth] Could not open the newly joined company:', error);
      return false;
    }
  }, [saveSession]);

  /**
   * Refresh the list of tenants for the current user (e.g. when opening Tenant Hub).
   * Calls GET /api/mobile/auth/my-tenants and updates user.availableTenants.
   */
  const refreshTenants = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;

    try {
      const tenants = await authService.getMyTenants();
      const latest = userRef.current;
      if (!latest || latest.uid !== current.uid) return;
      // Write back only a real change. An equal-but-new user object re-rendered every consumer;
      // UserHomeScreen's focus effect then called this again — about once a second, until the
      // API's limit of 200 requests a minute answered 429 and the app showed errors on every visit.
      if (sameTenants(tenants, latest.availableTenants)) return;

      await saveSession(
        { ...latest, availableTenants: tenants, availableCompanies: tenants.map(t => t.name) },
        employeeRef.current,
      );
    } catch (error) {
      if (__DEV__) console.warn('Error refreshing tenants:', error);
    }
  }, [saveSession]);

  const updateUserProfile = useCallback(
    async (patch: { firstName?: string; lastName?: string }) => {
      const current = userRef.current;
      if (!current) return;
      const firstName = (patch.firstName ?? current.firstName).trim();
      const lastName = (patch.lastName ?? current.lastName).trim();
      await saveSession(
        { ...current, firstName, lastName, name: `${firstName} ${lastName}`.trim() },
        employeeRef.current,
      );
    },
    [saveSession],
  );

  // Same question as the effect above, asked on demand. Reads the user through
  // the ref so its identity never changes and no screen loops on it.
  const recheckPending = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    try {
      const requests = await companyService.getJoinRequests();
      if (userRef.current?.uid !== current.uid) return;
      setPendingUid(requests.some((r) => r.status === 'PENDING') ? current.uid : null);
    } catch {
      // Offline: the next app start asks again.
    }
  }, []);

  const dismissSessionNotice = useCallback(() => setSessionNotice(null), []);

  const value = useMemo<PayrollAuthContextType>(
    () => ({
      user,
      employee,
      isLoading,
      authStatus,
      currentRole: user?.role ?? null,
      availableRoles: user?.availableRoles ?? [],
      currentCompany: user?.company ?? null,
      availableCompanies: user?.availableCompanies ?? [],
      sessionNotice,
      dismissSessionNotice,
      switchRole,
      switchCompany,
      login,
      loginWithFirebaseToken,
      logout,
      refreshAuthState,
      refreshTenants,
      recheckPending,
      updateUserProfile,
    }),
    [
      user,
      employee,
      isLoading,
      authStatus,
      sessionNotice,
      dismissSessionNotice,
      switchRole,
      switchCompany,
      login,
      loginWithFirebaseToken,
      logout,
      refreshAuthState,
      refreshTenants,
      recheckPending,
      updateUserProfile,
    ],
  );

  return <PayrollAuthContext.Provider value={value}>{children}</PayrollAuthContext.Provider>;
};

export const usePayrollAuth = () => {
  const context = useContext(PayrollAuthContext);
  if (!context) {
    throw new Error('usePayrollAuth must be used within PayrollAuthProvider');
  }
  return context;
};
