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
  departmentName?: string | null;
  requestTypeId?: string | null;
  requestType: string;
  requestTypeName?: string | null;
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
  isDraft?: boolean;
}

// --- Request Type CRUD (Owner/HR) ---

export interface RequestTypeDetail {
  id: string;
  shortCode: string;
  description: string | null;
  category: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestTypePayload {
  shortCode: string;
  description?: string;
  category?: string;
  isDefault?: boolean;
  status?: string;
}

export interface UpdateRequestTypePayload {
  shortCode?: string;
  description?: string;
  category?: string;
  isDefault?: boolean;
  status?: string;
}

// --- Filter for Owner view ---

export interface RequestApplicationFilter {
  status?: string;
  requestType?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

const requestService = {
  // ==========================================
  // Employee endpoints (mobile API)
  // ==========================================

  /** Get available request types from database. Maps { id, shortCode, description } to { key, label }. */
  async getTypes(): Promise<RequestType[]> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.TYPES);
    const content = response.data?.content ?? response.data;
    const list = Array.isArray(content) ? content : [];
    return list.map((t: { id?: string; shortCode?: string; description?: string }) => {
      const label = t.description || t.shortCode || '';
      const key = t.shortCode || t.id || '';
      return { key, label };
    });
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

  // ==========================================
  // Owner/HR endpoints (web API)
  // ==========================================

  /** Get all employee requests with filters (Owner/HR view) */
  async getAllRequests(filter: RequestApplicationFilter = {}): Promise<{ items: EmployeeRequest[]; total: number }> {
    const params: Record<string, string> = {};
    if (filter.status) params.status = filter.status;
    if (filter.requestType) params.requestType = filter.requestType;
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.page) params.page = filter.page.toString();
    if (filter.pageSize) params.pageSize = filter.pageSize.toString();
    const response = await axiosInstance.get(ENDPOINTS.WEB_REQUEST.APPLICATIONS, { params });
    return response.data.content;
  },

  /** Get a single request by ID (Owner/HR view) */
  async getRequestById(id: string): Promise<EmployeeRequest> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  /** Approve a request (Owner/HR) */
  async approveRequest(id: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${id}/approve`);
  },

  /** Reject a request with reason (Owner/HR) */
  async rejectRequest(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${id}/reject`, { reason });
  },

  // --- Request Type CRUD (Owner/HR) ---

  /** Get all request types */
  async getRequestTypes(status?: string): Promise<RequestTypeDetail[]> {
    const params = status ? { status } : {};
    const response = await axiosInstance.get(ENDPOINTS.WEB_REQUEST.TYPES, { params });
    return response.data.content;
  },

  /** Get a request type by ID */
  async getRequestTypeById(id: string): Promise<RequestTypeDetail> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_REQUEST.TYPES}/${id}`);
    return response.data.content;
  },

  /** Create a request type */
  async createRequestType(data: CreateRequestTypePayload): Promise<RequestTypeDetail> {
    const response = await axiosInstance.post(ENDPOINTS.WEB_REQUEST.TYPES, data);
    return response.data.content;
  },

  /** Update a request type */
  async updateRequestType(id: string, data: UpdateRequestTypePayload): Promise<RequestTypeDetail> {
    const response = await axiosInstance.put(`${ENDPOINTS.WEB_REQUEST.TYPES}/${id}`, data);
    return response.data.content;
  },

  /** Delete a request type */
  async deleteRequestType(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.WEB_REQUEST.TYPES}/${id}`);
  },
};

export default requestService;
