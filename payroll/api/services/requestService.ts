import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface RequestType {
  key: string;
  label: string;
}

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  requestType: string;
  startDate: string | null;
  notes: string | null;
  status: string; // PENDING, APPROVED, REJECTED, CANCELLED
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestPayload {
  requestType: string;
  startDate?: string;
  notes?: string;
}

const requestService = {
  /** Get available request types */
  async getTypes(): Promise<RequestType[]> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.TYPES);
    return response.data.content;
  },

  /** Get current employee's requests */
  async getApplications(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: EmployeeRequest[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.APPLICATIONS, { params });
    return response.data.content;
  },

  /** Create a new request */
  async createApplication(data: CreateRequestPayload): Promise<EmployeeRequest> {
    const response = await axiosInstance.post(ENDPOINTS.REQUEST.APPLICATIONS, data);
    return response.data.content;
  },

  /** Cancel own pending request */
  async cancelApplication(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.REQUEST.APPLICATIONS}/${id}`);
  },

  /** Get pending approvals (manager view) */
  async getPendingApprovals(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: EmployeeRequest[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.PENDING_APPROVALS, { params });
    return response.data.content;
  },

  /** Approve a request */
  async approveRequest(id: string): Promise<void> {
    await axiosInstance.post(`/api/mobile/request/${id}/approve`);
  },

  /** Reject a request with reason */
  async rejectRequest(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`/api/mobile/request/${id}/reject`, { reason });
  },
};

export default requestService;
