import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface ClaimType {
  id: string;
  name: string;
  code: string;
  category: string;
  maxAmount: number | null;
  requireReceipt: boolean;
}

export interface ClaimApplication {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string | null;
  claimTypeId: string | null;
  claimTypeName: string | null;
  transDate: string;
  amount: number;
  description: string | null;
  receiptNo: string | null;
  receiptDate?: string | null;
  status: string;
  submittedFrom: string;
  attachmentFileName: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedByName?: string | null;
  rejectionReason: string | null;
}

export interface ClaimBalance {
  claimTypeId: string;
  claimTypeName: string;
  claimCategory: string | null;
  yearlyLimit: number;
  monthlyLimit: number;
  ytdClaimed: number;
  ytdPending: number;
  mtdClaimed: number;
  mtdPending: number;
  yearlyRemaining: number;
  monthlyRemaining: number;
}

export interface CreateClaimRequest {
  claimTypeId: string;
  transDate: string;
  amount: number;
  description?: string;
  receiptNo?: string;
  receiptDate?: string;
  isDraft?: boolean;
}

// --- Claim Type CRUD (Owner/HR) ---

export interface ClaimTypeDetail {
  id: string;
  shortCode: string;
  description: string | null;
  claimCategory: string | null;
  defaultYearlyLimit: number | null;
  defaultMonthlyLimit: number | null;
  requireReceipt: boolean;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimTypePayload {
  shortCode: string;
  description?: string;
  claimCategory?: string;
  defaultYearlyLimit?: number;
  defaultMonthlyLimit?: number;
  requireReceipt?: boolean;
  isDefault?: boolean;
  status?: string;
}

export interface UpdateClaimTypePayload {
  shortCode?: string;
  description?: string;
  claimCategory?: string;
  defaultYearlyLimit?: number;
  defaultMonthlyLimit?: number;
  requireReceipt?: boolean;
  isDefault?: boolean;
  status?: string;
}

// --- Filter for Owner view ---

export interface ClaimApplicationFilter {
  status?: string;
  claimTypeId?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

const claimService = {
  // ==========================================
  // Employee endpoints (mobile API)
  // ==========================================

  async getTypes(): Promise<ClaimType[]> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.TYPES);
    const raw = response.data.content;
    return (raw || []).map((ct: any) => ({
      id: ct.id,
      name: ct.description || ct.shortCode,
      code: ct.shortCode,
      category: ct.claimCategory,
      maxAmount: ct.defaultYearlyLimit || null,
      requireReceipt: ct.requireReceipt || false,
    }));
  },

  async getApplications(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: ClaimApplication[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.APPLICATIONS, { params });
    const data = response.data.content;
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      claimTypeId: c.claimTypeId,
      claimTypeName: c.claimTypeName || null,
      transDate: c.transDate,
      amount: c.amount,
      description: c.description,
      receiptNo: c.receiptNo,
      status: c.status,
      submittedFrom: c.submittedFrom,
      attachmentFileName: c.attachmentFileName,
      createdAt: c.createdAt,
      approvedAt: c.approvedAt,
      rejectionReason: c.rejectionReason,
    }));
    return { items, totalCount: data.total || 0 };
  },

  async createApplication(data: CreateClaimRequest): Promise<ClaimApplication> {
    const response = await axiosInstance.post(ENDPOINTS.CLAIM.APPLICATIONS, data);
    return response.data.content;
  },

  async createApplicationWithAttachment(formData: FormData): Promise<ClaimApplication> {
    const response = await axiosInstance.post(
      `${ENDPOINTS.CLAIM.APPLICATIONS}/with-attachment`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.content;
  },

  async getBalance(): Promise<ClaimBalance[]> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.BALANCE);
    return response.data.content;
  },

  async getReceiptUrl(claimId: string): Promise<{ url: string; fileName: string; expiresInMinutes: number }> {
    const response = await axiosInstance.get(`${ENDPOINTS.CLAIM.APPLICATIONS}/${claimId}/receipt`);
    return response.data.content;
  },

  /** Get receipt download URL as Owner/HR (web API - no employee ownership check) */
  async getReceiptUrlAsOwner(claimId: string): Promise<{ url: string; fileName: string; expiresInMinutes: number }> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_CLAIM.APPLICATIONS}/${claimId}/receipt`);
    return response.data.content;
  },

  async cancelClaim(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}`);
  },

  // ==========================================
  // Owner/HR endpoints (web API)
  // ==========================================

  /** Get all claim applications with filters (Owner/HR view) */
  async getAllClaims(filter: ClaimApplicationFilter = {}): Promise<{ items: ClaimApplication[]; total: number }> {
    const params: Record<string, string> = {};
    if (filter.status) params.status = filter.status;
    if (filter.claimTypeId) params.claimTypeId = filter.claimTypeId;
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.fromDate) params.fromDate = filter.fromDate;
    if (filter.toDate) params.toDate = filter.toDate;
    if (filter.page) params.page = filter.page.toString();
    if (filter.pageSize) params.pageSize = filter.pageSize.toString();
    const response = await axiosInstance.get(ENDPOINTS.WEB_CLAIM.APPLICATIONS, { params });
    return response.data.content;
  },

  /** Get a single claim by ID (Owner/HR view) */
  async getClaimById(id: string): Promise<ClaimApplication> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_CLAIM.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  /** Approve a claim (Owner/HR) */
  async approveClaim(id: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_CLAIM.APPLICATIONS}/${id}/approve`);
  },

  /** Reject a claim with reason (Owner/HR) */
  async rejectClaim(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.WEB_CLAIM.APPLICATIONS}/${id}/reject`, { reason });
  },

  // --- Claim Type CRUD (Owner/HR) ---

  /** Get all claim types (full detail) */
  async getClaimTypes(): Promise<ClaimTypeDetail[]> {
    const response = await axiosInstance.get(ENDPOINTS.WEB_CLAIM.TYPES);
    const content = response.data.content;
    return content?.data ?? content ?? [];
  },

  /** Get a claim type by ID */
  async getClaimTypeById(id: string): Promise<ClaimTypeDetail> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_CLAIM.TYPES}/${id}`);
    return response.data.content;
  },

  /** Create a claim type */
  async createClaimType(data: CreateClaimTypePayload): Promise<ClaimTypeDetail> {
    const response = await axiosInstance.post(ENDPOINTS.WEB_CLAIM.TYPES, data);
    return response.data.content;
  },

  /** Update a claim type */
  async updateClaimType(id: string, data: UpdateClaimTypePayload): Promise<ClaimTypeDetail> {
    const response = await axiosInstance.put(`${ENDPOINTS.WEB_CLAIM.TYPES}/${id}`, data);
    return response.data.content;
  },

  /** Delete a claim type */
  async deleteClaimType(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.WEB_CLAIM.TYPES}/${id}`);
  },
};

export default claimService;
