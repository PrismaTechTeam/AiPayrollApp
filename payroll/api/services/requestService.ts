import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface RequestType {
  /** The type's row id; what a new request is linked by. */
  id: string;
  /** The short code, upper-cased by the server ("EQUIP", "OTHER"). */
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
  status: string; // PENDING, APPROVED, REJECTED, CANCELLED; DRAFT on old rows only
  reviewedByUserId?: string | null;
  /** Who approved or rejected it. Not sent by the server live today; shown when it arrives. */
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  /** HR's written answer. Separate from the approve/reject decision. */
  hrReply?: string | null;
  hrReplyAt?: string | null;
  hrReplyByName?: string | null;
  /** The employee's answer to HR. Written from the app; HR reads it. */
  employeeReply?: string | null;
  employeeReplyAt?: string | null;
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
  /**
   * Links the request to its type by id. Names are not unique (only short codes
   * are), and the server's name fallback takes the first match, so two types
   * called "Letter" could put a request under the wrong one.
   */
  requestTypeId?: string;
  /** The type's name, or for "Other" what the employee typed in its place. */
  requestType: string;
  notes?: string;
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
  /**
   * 'oldest' puts the longest-waiting first, for the Pending queue. The live
   * server does not read it yet and always answers newest first; the app copes
   * with either order.
   */
  sort?: 'newest' | 'oldest';
  /**
   * Leave out the caller's own requests on the server, so the Pending total
   * matches the Home tile. Not read by the live server yet; the app filters
   * them out itself as well.
   */
  excludeOwn?: boolean;
}

/**
 * One row of the approver's queue (GET /api/mobile/request/pending-approvals): the fields that
 * route sends, nothing more.
 */
export type WaitingRequest = Pick<
  EmployeeRequest,
  'id' | 'employeeId' | 'employeeName' | 'employeeCode' | 'requestType' | 'notes' | 'createdAt'
>;

const requestService = {
  // ==========================================
  // Employee endpoints (mobile API)
  // ==========================================

  /** The active request types an employee may choose from. */
  async getTypes(): Promise<RequestType[]> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.TYPES);
    const content = response.data?.content ?? response.data;
    const list = Array.isArray(content) ? content : [];
    return list.map((t: { id?: string; shortCode?: string; description?: string }) => {
      const label = t.description || t.shortCode || '';
      const key = t.shortCode || t.id || '';
      return { id: t.id ?? '', key, label };
    });
  },

  /** The current employee's own requests, one page, with the server's count of all that match. */
  async getApplications(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: EmployeeRequest[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.APPLICATIONS, { params });
    return response.data.content;
  },

  /** Create a new request */
  async createApplication(data: CreateRequestPayload): Promise<EmployeeRequest> {
    const response = await axiosInstance.post(ENDPOINTS.REQUEST.APPLICATIONS, data);
    return response.data.content;
  },

  /** Withdraw the employee's own request while it is still pending. */
  async cancelApplication(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.REQUEST.APPLICATIONS}/${id}`);
  },

  // ==========================================
  // Owner/HR endpoints
  // ==========================================

  /**
   * Every request in the company except drafts, newest first unless `sort` says
   * otherwise (and the server reads it), one page at a time.
   * Filter by status on the server: filtering a fixed page on the phone loses
   * whatever falls off the end of it.
   */
  async getAllRequests(filter: RequestApplicationFilter = {}): Promise<{ items: EmployeeRequest[]; total: number }> {
    const params: Record<string, string> = {};
    if (filter.status) params.status = filter.status;
    if (filter.requestType) params.requestType = filter.requestType;
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.page) params.page = filter.page.toString();
    if (filter.pageSize) params.pageSize = filter.pageSize.toString();
    if (filter.sort) params.sort = filter.sort;
    if (filter.excludeOwn) params.excludeOwn = 'true';
    const response = await axiosInstance.get(ENDPOINTS.WEB_REQUEST.APPLICATIONS, { params });
    return response.data.content;
  },

  /**
   * The requests waiting for this approver, newest first, and how many there are in all:
   * pending and not their own, which the server leaves out. Home's Waiting list and its
   * Requests count read one page of it, so both agree with the Pending tab.
   */
  async getPendingApprovals(params: { page?: number; pageSize?: number } = {}): Promise<{ items: WaitingRequest[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.REQUEST.PENDING_APPROVALS, {
      params: { page: params.page ?? 1, pageSize: params.pageSize ?? 20 },
    });
    const content = response.data?.content;
    const items: WaitingRequest[] = Array.isArray(content?.items) ? content.items : [];
    const total = content?.total;
    return { items, total: typeof total === 'number' && Number.isFinite(total) ? Math.max(0, total) : items.length };
  },

  /** How many requests are waiting for this approver: the same number the Pending tab shows. */
  async getPendingApprovalCount(): Promise<number> {
    const page = await requestService.getPendingApprovals({ page: 1, pageSize: 1 });
    return page.total;
  },

  /** One request for the approver, with every file on it from both sides. */
  async getRequestById(id: string): Promise<EmployeeRequest> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  /** Approve a request. Refused (403) when it is the approver's own. */
  async approveRequest(id: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.REQUEST.APPROVE(id));
  },

  /** Reject a request with the reason the employee will read. Refused (403) when it is the approver's own. */
  async rejectRequest(id: string, reason: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.REQUEST.REJECT(id), { reason });
  },

  // --- Request Type CRUD (Owner/HR) ---

  /** Get all request types */
  async getRequestTypes(status?: string): Promise<RequestTypeDetail[]> {
    const params = status ? { status } : {};
    const response = await axiosInstance.get(ENDPOINTS.WEB_REQUEST.TYPES, { params });
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
  // Attachments + reply — approver side
  // ==========================================

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

  /** The employee's own answer to HR on their request. An empty message clears it. */
  async replyAsEmployee(requestId: string, message: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.REQUEST.APPLICATIONS}/${requestId}/reply`, { message });
  },

  /** Send, edit, or (with an empty message) clear HR's reply. The app never offers it on the approver's own request. */
  async replyToRequest(requestId: string, message: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_REQUEST.APPLICATIONS}/${requestId}/reply`, { message });
  },

};

export default requestService;
