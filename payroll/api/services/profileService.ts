import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface UserProfile {
  id: string;
  employeeCode: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  department: string | null;
  branch: string | null;
  job: string | null;
  joinDate: string | null;
  maritalStatus: string | null;
}

export interface UpdateProfileRequest {
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface CompanyInfoResponse {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
}

/**
 * One phone registered for push notifications, newest activity first. It is a
 * row of the server's DeviceTokens table, not a sign-in session: removing one
 * stops notifications to that phone and leaves its sign-in untouched.
 */
export interface SignedInDevice {
  id: number;
  deviceType: string | null;
  platform: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await axiosInstance.get(ENDPOINTS.PROFILE.GET);
    return response.data.content;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await axiosInstance.put(ENDPOINTS.PROFILE.UPDATE, data);
    return response.data.content;
  },

  // changePassword lived here and posted to /api/mobile/profile/change-password, which sets a
  // new password without checking the current one. The app changes the password through
  // Firebase (AccountPasswordScreen), which does check it, so the call was removed rather
  // than left for someone to wire up.

  async getCompanyInfo(): Promise<CompanyInfoResponse> {
    const response = await axiosInstance.get(ENDPOINTS.PROFILE.COMPANY_INFO);
    return response.data.content;
  },

  async getDevices(): Promise<SignedInDevice[]> {
    const response = await axiosInstance.get(ENDPOINTS.PROFILE.DEVICES);
    return Array.isArray(response.data?.content) ? response.data.content : [];
  },

  /** Stops push notifications to that phone until the app is opened on it again. */
  async removeDevice(deviceId: number): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.PROFILE.DEVICES}/${deviceId}`);
  },

  /**
   * Ends every session and push token of the account, this phone's included. It is the
   * mobile logout with allDevices: the reworked server honours the flag, and the server live
   * today ignores it but already ends everything on any logout, so both do what the button
   * says. The local sign-out is the caller's job, and only once this has succeeded.
   */
  async signOutEverywhere(deviceId: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.AUTH.LOGOUT, { deviceId, allDevices: true });
  },
};

export default profileService;
