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

/** One live session, as the server lists it (newest activity first). */
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

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await axiosInstance.post(ENDPOINTS.PROFILE.CHANGE_PASSWORD, data);
  },

  async getCompanyInfo(): Promise<CompanyInfoResponse> {
    const response = await axiosInstance.get(ENDPOINTS.PROFILE.COMPANY_INFO);
    return response.data.content;
  },

  async getDevices(): Promise<SignedInDevice[]> {
    const response = await axiosInstance.get(ENDPOINTS.PROFILE.DEVICES);
    return Array.isArray(response.data?.content) ? response.data.content : [];
  },

  async removeDevice(deviceId: number): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.PROFILE.DEVICES}/${deviceId}`);
  },
};

export default profileService;
