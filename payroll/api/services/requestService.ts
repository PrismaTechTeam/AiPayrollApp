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
  /** Historic only — no longer collected or shown. Kept so old rows still parse. */
  startDate?: string | null;
  notes: string | null;
  status: string; // PENDING, APPROVED, REJECTED, CANCELLED
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  /** HR's written answer. Separate from the approve/reject decision. */
  hrReply?: string | null;
  hrReplyAt?: string | null;
  hrReplyByName?: string | null;
  attachmentCount?: number;
  /** Present on the detail endpoints only. */
  attachments?: RequestAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string | null;
  uploadedByRole: 'EMPLOYEE' | 'HR';
  uploadedByName: string | null;
  createdAt: string;
}

/** What the picker produced, in the shape React Native's FormData needs. */
export interface UploadableFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface CreateRequestPayload {
  requestType: string;
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
  // ==========================================
  // Attachments — employee side
  // ==========================================

  /** One of the employee's own requests, with HR's reply and every file on it. */
  async getApplication(id: string): Promise<EmployeeRequest> {
    const response = await axiosInstance.get(`${ENDPOINTS.REQUEST.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  async getAttachments(requestId: string): Promise<RequestAttachment[]> {
    const response = await axiosInstance.get(`${ENDPOINTS.REQUEST.APPLICATIONS}/${requestId}/attachments`);
    return Array.isArray(response.data?.content) ? response.data.content : [];
  },

  /**
   * Attach a file to the employee's own request. A photo on a slow connection
   * outlives the default API timeout, so this call gets its own.
   */
  async uploadAttachment(requestId: string, file: UploadableFile): Promise<RequestAttachment> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const response = await axiosInstance.post(
      `${ENDPOINTS.REQUEST.APPLICATIONS}/${requestId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    );
    return response.data.content;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.REQUEST.ATTACHMENTS}/${attachmentId}`);
  },

  /** Absolute URL of the file's bytes, for the download helper. */
  attachmentContentUrl(attachmentId: string): string {
    return `${ENDPOINTS.REQUEST.ATTACHMENTS}/${attachmentId}/content`;
  },

  // ==========================================
  // Attachments + reply — approver side (web API)
  // ==========================================

  async getAttachmentsAsApprover(requestId: string): Promise<RequestAttachment[]> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${requestId}/attachments`);
    return Array.isArray(response.data?.content) ? response.data.content : [];
  },

  async uploadAttachmentAsApprover(requestId: string, file: UploadableFile): Promise<RequestAttachment> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const response = await axiosInstance.post(
      `${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${requestId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    );
    return response.data.content;
  },

  async deleteAttachmentAsApprover(attachmentId: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/attachments/${attachmentId}`);
  },

  approverAttachmentContentUrl(attachmentId: string): string {
    return `${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/attachments/${attachmentId}/content`;
  },

  /** Send, edit, or (with an empty message) clear HR's reply. */
  async replyToRequest(requestId: string, message: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${requestId}/reply`, { message });
  },

};

export default requestService;
