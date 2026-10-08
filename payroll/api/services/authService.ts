import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';
import { tokenManager } from '../tokenManager';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    firebaseUid: string;
  };
  employee: MobileEmployee | null;
  tenants: TenantInfo[];
  /**
   * The company the token was issued for. Only the reworked server sends it;
   * the live one leaves it out, so the token's own claim stays the fallback.
   */
  activeTenantId?: string | null;
}

export interface MobileEmployee {
  id: string;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  department: string | null;
  branch: string | null;
  job: string | null;
  status: string;
  joinDate: string | null;
  classification: string | null;
  isDepartmentHead: boolean;
  tenantId: string;
  tenantName: string | null;
}

export interface TenantInfo {
  id: string;
  name: string;
  role: string;
  logoUrl: string | null;
}

// The legacy Identity register, the no-op resend-verification and a second
// refresh path used to live here. Nothing called them: sign-up goes through
// Firebase (firebaseSignUp), Firebase sends the verification mail itself, and
// axiosInstance owns token refresh. A copy that is never run only drifts.
const authService = {
  /** Login with Firebase ID token */
  async firebaseLogin(firebaseIdToken: string, deviceId: string, deviceInfo?: object): Promise<LoginResponse> {
    const response = await axiosInstance.post(ENDPOINTS.AUTH.FIREBASE_LOGIN, {
      firebaseIdToken,
      deviceId,
      deviceInfo,
    });

    const data = response.data.content as LoginResponse;
    await tokenManager.setTokens(data.token, data.refreshToken, data.expiresIn);
    return data;
  },

  /**
   * Logout and deactivate tokens.
   *
   * The refresh and push tokens go along because the reworked server ends only
   * the session they name: sent with the device id alone, "Sign out" left this
   * phone's 30-day refresh token working on the server. The live server reads
   * only the device id and ignores the rest, so the same body works on both.
   */
  async logout(deviceId: string, pushToken?: string | null): Promise<void> {
    try {
      const refreshToken = await tokenManager.getRefreshToken().catch(() => null);
      await axiosInstance.post(ENDPOINTS.AUTH.LOGOUT, {
        deviceId,
        refreshToken: refreshToken ?? undefined,
        pushToken: pushToken ?? undefined,
      });
    } finally {
      await tokenManager.clearTokens();
    }
  },

  /** Switch to a different tenant */
  async switchTenant(tenantId: string): Promise<{ token: string; employee: MobileEmployee | null }> {
    const response = await axiosInstance.post(ENDPOINTS.AUTH.SWITCH_TENANT, { tenantId });
    const data = response.data.content;
    await tokenManager.updateAccessToken(data.token, data.expiresIn);
    return data;
  },

  /** Get all tenants the current user is a member of (for Tenant Hub). */
  async getMyTenants(): Promise<TenantInfo[]> {
    const response = await axiosInstance.get(ENDPOINTS.AUTH.MY_TENANTS);
    const content = response.data?.content ?? response.data?.Content ?? response.data;
    if (!Array.isArray(content)) return [];
    return content.map((t: { id?: string; Id?: string; name?: string; Name?: string; role?: string; Role?: string; logoUrl?: string; LogoUrl?: string }) => ({
      id: t.id ?? t.Id ?? '',
      name: t.name ?? t.Name ?? '',
      role: t.role ?? t.Role ?? 'Employee',
      logoUrl: t.logoUrl ?? t.LogoUrl ?? null,
    }));
  },

  /**
   * Sign up with Firebase: create user in Firebase, then sync to backend.
   * Use this so the account exists in Firebase and login works.
   */
  async firebaseSignUp(firebaseIdToken: string, deviceId: string, invitationCode?: string): Promise<void> {
    await axiosInstance.post(
      ENDPOINTS.AUTH.FIREBASE_SIGNUP,
      { clientType: 'mobile', deviceId, invitationCode },
      { headers: { 'Firebase-Token': firebaseIdToken } }
    );
  },

  /** Request password reset email (Firebase). Backend sends reset link to email. */
  async forgotPassword(email: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: email.trim().toLowerCase() });
  },
};

export default authService;
