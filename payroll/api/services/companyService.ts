import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface CompanySearchResult {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface JoinRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  status: string;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

const companyService = {
  async search(query: string): Promise<CompanySearchResult[]> {
    const response = await axiosInstance.get(ENDPOINTS.COMPANY.SEARCH, { params: { q: query } });
    return response.data.content;
  },

  async submitJoinRequest(tenantId: string, message?: string): Promise<JoinRequest> {
    const response = await axiosInstance.post(ENDPOINTS.COMPANY.JOIN_REQUEST, { tenantId, message });
    return response.data.content;
  },

  async getJoinRequests(): Promise<JoinRequest[]> {
    const response = await axiosInstance.get(ENDPOINTS.COMPANY.JOIN_REQUESTS);
    const data = response.data?.content ?? response.data?.Content ?? response.data;
    return Array.isArray(data) ? data : [];
  },

  async cancelJoinRequest(id: string): Promise<void> {
    const url = `${ENDPOINTS.COMPANY.JOIN_REQUEST}/${encodeURIComponent(id)}`;
    await axiosInstance.delete(url);
  },

  async joinViaCode(code: string): Promise<JoinRequest> {
    const response = await axiosInstance.post(ENDPOINTS.COMPANY.JOIN_VIA_CODE, { code });
    return response.data.content;
  },
};

export default companyService;
