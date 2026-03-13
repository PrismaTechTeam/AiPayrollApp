/**
 * Payroll Authentication Context
 * Real auth with Firebase + backend JWT integration.
 * Manages user state, tokens, tenant switching, and role switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Constants from 'expo-constants';
import authService, { LoginResponse, MobileEmployee, TenantInfo } from '../api/services/authService';
import { API_CONFIG } from '../api/config';
import { tokenManager } from '../api/tokenManager';
import { registerForPushNotifications, unregisterPushToken } from '../services/pushNotificationHandler';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

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
  switchRole: (newRole: string) => Promise<void>;
  switchCompany: (tenantId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithFirebaseToken: (firebaseIdToken: string, deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const PayrollAuthContext = createContext<PayrollAuthContextType | undefined>(undefined);

const USER_STORE_KEY = 'payroll_user';
const EMPLOYEE_STORE_KEY = 'payroll_employee';
const PUSH_TOKEN_KEY = 'payroll_push_token';

export const PayrollAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PayrollUser | null>(null);
  const [employee, setEmployee] = useState<MobileEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const pushTokenRef = useRef<string | null>(null);

  // Initialize — check for stored user session
  useEffect(() => {
    checkStoredAuth();
  }, []);

  // Update auth status when user/employee changes
  useEffect(() => {
    if (isLoading) {
      setAuthStatus('loading');
    } else if (!user) {
      setAuthStatus('unauthenticated');
    } else if (!user.tenantId) {
      setAuthStatus('no_company');
    } else if (!user.employeeId) {
      // User has a tenant but no linked employee — could be pending approval
      setAuthStatus('pending_approval');
    } else {
      setAuthStatus('authenticated');
    }
  }, [user, isLoading]);

  const checkStoredAuth = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(USER_STORE_KEY);
      const storedEmployee = await SecureStore.getItemAsync(EMPLOYEE_STORE_KEY);
      const accessToken = await tokenManager.getAccessToken();

      if (storedUser && accessToken) {
        const userData = JSON.parse(storedUser) as PayrollUser;
        setUser(userData);

        if (storedEmployee) {
          setEmployee(JSON.parse(storedEmployee) as MobileEmployee);
        }

        console.log('Loaded stored user:', userData.name, 'Role:', userData.role);

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
    const activeTenant = data.tenants.length > 0 ? data.tenants[0] : null;

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

  const persistUserState = async (userData: PayrollUser, employeeData: MobileEmployee | null) => {
    await SecureStore.setItemAsync(USER_STORE_KEY, JSON.stringify(userData));
    if (employeeData) {
      await SecureStore.setItemAsync(EMPLOYEE_STORE_KEY, JSON.stringify(employeeData));
    } else {
      await SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY);
    }
  };

  /**
   * Login with Firebase ID token (primary mobile auth flow)
   */
  const loginWithFirebaseToken = useCallback(async (firebaseIdToken: string, deviceId: string) => {
    setIsLoading(true);
    try {
      const data = await authService.firebaseLogin(firebaseIdToken, deviceId);
      const userData = buildUserFromLoginResponse(data);

      await persistUserState(userData, data.employee);
      setUser(userData);
      setEmployee(data.employee);

      // Register push token after successful login
      registerForPushNotifications().then(token => {
        if (token) {
          pushTokenRef.current = token;
          SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
        }
      });

      console.log('User logged in:', userData.name);
    } catch (error) {
      if (__DEV__) {
        console.error('[Login] Backend request failed. API base URL was:', API_CONFIG.baseUrl);
      }
      console.error('Firebase login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login with email/password: Firebase Auth → ID token → backend firebase-login
   */
  const login = useCallback(async (email: string, password: string) => {
    if (__DEV__) {
      console.log('[Login] API base URL:', API_CONFIG.baseUrl, '| Use this to verify Cloudflare tunnel.');
    }
    const configured = isFirebaseConfigured();
    if (__DEV__) {
      console.log('[Login] Firebase configured:', configured);
      if (!configured) {
        getFirebaseAuth(); // triggers [Firebase] Debug in payroll/lib/firebase.ts (env vars)
      }
    }
    if (!configured) {
      throw new Error(
        'Firebase is not configured. Copy VITE_FIREBASE_* from AiPayrollWeb/.env.development into AiPayrollApp/.env as EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID. See FIREBASE_SETUP.md.'
      );
    }
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) throw new Error('Firebase Auth could not be initialized.');

    setIsLoading(true);
    let loginStep = 'firebase_signin';
    try {
      if (__DEV__) console.log('[Login] Step: Firebase sign-in...');
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (__DEV__) {
        console.log('[Login] Credential received:', { uid: credential.user?.uid, email: credential.user?.email });
      }
      loginStep = 'get_id_token';
      const firebaseIdToken = await credential.user.getIdToken();
      const deviceId = Constants.installationId ?? Constants.sessionId ?? 'mobile';
      if (__DEV__) {
        console.log('[Login] Firebase ID token length:', firebaseIdToken?.length ?? 0);
        console.log('[Login] deviceId:', deviceId);
      }
      loginStep = 'backend_login';
      if (__DEV__) console.log('[Login] Step: Calling loginWithFirebaseToken...');
      await loginWithFirebaseToken(firebaseIdToken, deviceId);
      if (__DEV__) console.log('[Login] Step: loginWithFirebaseToken succeeded.');
    } catch (error) {
      if (__DEV__) {
        console.error('[Login] Failed at step:', loginStep, '| Error:', error);
      }
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loginWithFirebaseToken]);

  const logout = useCallback(async () => {
    try {
      // Unregister push token from backend
      const storedPushToken = pushTokenRef.current || await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
      await unregisterPushToken(storedPushToken);
      pushTokenRef.current = null;
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);

      // Call backend to deactivate auth tokens
      try {
        await authService.logout('mobile');
      } catch {
        // Ignore logout API errors — we still clear local state
      }

      await tokenManager.clearTokens();
      await SecureStore.deleteItemAsync(USER_STORE_KEY);
      await SecureStore.deleteItemAsync(EMPLOYEE_STORE_KEY);
      setUser(null);
      setEmployee(null);
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const switchRole = useCallback(async (newRole: string) => {
    if (!user) throw new Error('Not authenticated');

    const updatedUser = { ...user, role: newRole };
    await persistUserState(updatedUser, employee);
    setUser(updatedUser);
    console.log(`Role switched to: ${newRole}`);
  }, [user, employee]);

  const switchCompany = useCallback(async (tenantId: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const result = await authService.switchTenant(tenantId);
      const tenant = user.availableTenants.find(t => t.id === tenantId);

      const updatedUser: PayrollUser = {
        ...user,
        tenantId,
        tenantName: tenant?.name ?? null,
        company: tenant?.name ?? null,
        role: tenant?.role ?? null,
        employeeId: result.employee?.id ?? null,
        employeeCode: result.employee?.employeeCode ?? null,
      };

      await persistUserState(updatedUser, result.employee);
      setUser(updatedUser);
      setEmployee(result.employee);
      console.log(`Company switched to: ${tenant?.name}`);
    } catch (error) {
      console.error('Error switching company:', error);
      throw error;
    }
  }, [user]);

  /**
   * Refresh auth state from API (e.g., after join request approved).
   * Re-fetches employee data AND tenant memberships so the user
   * doesn't need to re-login after HR approval.
   */
  const refreshAuthState = useCallback(async () => {
    if (!user) return;

    try {
      const { default: axiosInstance } = await import('../api/axiosInstance');
      const { ENDPOINTS } = await import('../api/endpoints');

      // Re-fetch employee data
      let employeeData: MobileEmployee | null = null;
      try {
        const empResponse = await axiosInstance.get(ENDPOINTS.ME.EMPLOYEE);
        employeeData = empResponse.data.content as MobileEmployee | null;
      } catch {
        // May fail if user has no tenant yet — that's ok
      }

      // Update tenantId from employee data if user didn't have one yet
      // (happens after HR approves a join request)
      let updatedTenantId = user.tenantId;
      let updatedTenantName = user.tenantName;
      let updatedTenants = user.availableTenants;

      if (employeeData?.tenantId && !updatedTenantId) {
        updatedTenantId = employeeData.tenantId;
        updatedTenantName = employeeData.tenantName ?? null;
        // Add the new tenant to the list if not already present
        if (!updatedTenants.some(t => t.id === employeeData.tenantId)) {
          updatedTenants = [
            ...updatedTenants,
            { id: employeeData.tenantId, name: employeeData.tenantName ?? '', role: 'Employee', logoUrl: null },
          ];
        }
      }

      const updatedUser: PayrollUser = {
        ...user,
        employeeId: employeeData?.id ?? null,
        employeeCode: employeeData?.employeeCode ?? null,
        tenantId: updatedTenantId,
        tenantName: updatedTenantName,
        company: updatedTenantName,
        availableTenants: updatedTenants,
      };

      await persistUserState(updatedUser, employeeData);
      setUser(updatedUser);
      setEmployee(employeeData);
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  }, [user]);

  /**
   * Refresh the list of tenants for the current user (e.g. when opening Tenant Hub).
   * Calls GET /api/mobile/auth/my-tenants and updates user.availableTenants.
   */
  const refreshTenants = useCallback(async () => {
    if (!user) return;

    try {
      const tenants = await authService.getMyTenants();
      const updatedUser: PayrollUser = {
        ...user,
        availableTenants: tenants,
        availableCompanies: tenants.map(t => t.name),
      };
      await persistUserState(updatedUser, employee);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing tenants:', error);
    }
  }, [user, employee]);

  const value = {
    user,
    employee,
    isLoading,
    authStatus,
    currentRole: user?.role ?? null,
    availableRoles: user?.availableRoles ?? [],
    currentCompany: user?.company ?? null,
    availableCompanies: user?.availableCompanies ?? [],
    switchRole,
    switchCompany,
    login,
    loginWithFirebaseToken,
    logout,
    refreshAuthState,
    refreshTenants,
  };

  return <PayrollAuthContext.Provider value={value}>{children}</PayrollAuthContext.Provider>;
};

export const usePayrollAuth = () => {
  const context = useContext(PayrollAuthContext);
  if (!context) {
    throw new Error('usePayrollAuth must be used within PayrollAuthProvider');
  }
  return context;
};
