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
  claimTypeId: string | null;
  claimTypeName: string | null;
  transDate: string;
  amount: number;
  description: string | null;
  receiptNo: string | null;
  status: string;
  submittedFrom: string;
  attachmentFileName: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
}

export interface CreateClaimRequest {
  claimTypeId: string;
  transDate: string;
  amount: number;
  description?: string;
  receiptNo?: string;
  receiptDate?: string;
}

const claimService = {
  async getTypes(): Promise<ClaimType[]> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.TYPES);
    const raw = response.data.content;
    // Map backend field names to mobile interface
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
    // Map backend fields: claimType (string) → claimTypeName
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      claimTypeId: c.claimTypeId,
      claimTypeName: c.claimType || null,
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

  async createApplication(data: CreateClaimRequest | FormData): Promise<ClaimApplication> {
    const isFormData = data instanceof FormData;
    const response = await axiosInstance.post(ENDPOINTS.CLAIM.APPLICATIONS, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data.content;
  },

  async getPendingApprovals(params?: { page?: number; pageSize?: number }): Promise<{ items: ClaimApplication[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.PENDING_APPROVALS, { params });
    const data = response.data.content;
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      employeeId: c.employeeId,
      employeeName: c.employeeName,
      claimTypeId: c.claimTypeId,
      claimTypeName: c.claimType || null,
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

  async approveClaim(id: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}/approve`);
  },

  async rejectClaim(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}/reject`, { reason });
  },
};

export default claimService;
