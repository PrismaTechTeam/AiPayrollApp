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
  tenantId: string;
  tenantName: string | null;
}

export interface TenantInfo {
  id: string;
  name: string;
  role: string;
  logoUrl: string | null;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

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

  /** Refresh the access token */
  async refresh(deviceId: string): Promise<{ token: string; expiresIn: number }> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await axiosInstance.post(ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
      deviceId,
    });

    const data = response.data.content;
    await tokenManager.updateAccessToken(data.token, data.expiresIn);
    return data;
  },

  /** Logout and deactivate tokens */
  async logout(deviceId: string): Promise<void> {
    try {
      await axiosInstance.post(ENDPOINTS.AUTH.LOGOUT, { deviceId });
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

  /** Register via Identity (legacy). Prefer firebaseSignUp so user can log in with Firebase. */
  async register(request: RegisterRequest): Promise<void> {
    await axiosInstance.post(ENDPOINTS.AUTH.REGISTER, request);
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

  /** Resend verification email */
  async resendVerificationEmail(): Promise<void> {
    await axiosInstance.post(ENDPOINTS.AUTH.RESEND_VERIFICATION);
  },

  /** Request password reset email (Firebase). Backend sends reset link to email. */
  async forgotPassword(email: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: email.trim().toLowerCase() });
  },
};

export default authService;
