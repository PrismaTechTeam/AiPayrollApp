import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface LeaveBalanceItem {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeDescription: string;
  color: string | null;
  entitlement: number;
  carryForward: number;
  carryForwardExpiry: string | null;
  adjustment: number;
  used: number;
  pending: number;
  balance: number;
}

export interface LeaveBalance {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  year: number;
  balances: LeaveBalanceItem[];
}

export interface LeaveType {
  id: string;
  code: string;
  description: string;
  caption: string;
  allowHalfDay: boolean;
  allowHourly: boolean;
  isActive: boolean;
  color: string | null;
  requireAttachment: boolean;
  attachmentAfterDays: number | null;
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeDepartment: string | null;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeDescription: string;
  leaveTypeColor: string | null;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startDayPeriod: string | null;
  endDayPeriod: string | null;
  totalDays: number;
  totalHours: number | null;
  status: string;
  reason: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  attachmentPath: string | null;
  attachmentFileName: string | null;
  submittedFrom: string;
  currentApprovalStep: number;
  totalApprovalSteps: number;
  approvedAt: string | null;
  approvedByEmployeeName: string | null;
  createdAt: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startDayPeriod?: string;
  endDayPeriod?: string;
  reason: string;
  isDraft?: boolean;
}

const leaveService = {
  async getBalance(year?: number): Promise<LeaveBalance[]> {
    const params = year ? { year } : {};
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.BALANCE, { params });
    return response.data.content;
  },

  async getLeaveTypes(): Promise<LeaveType[]> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.TYPES);
    const content = response.data?.content ?? response.data;
    const list = Array.isArray(content) ? content : [];
    return list.map((t: { Id?: string; Code?: string; Description?: string; Color?: string | null; AllowHalfDay?: boolean }) => ({
      id: t.Id ?? t.id ?? '',
      code: t.Code ?? t.code ?? '',
      description: t.Description ?? t.description ?? '',
      caption: t.Description ?? t.description ?? '',
      allowHalfDay: t.AllowHalfDay ?? t.allowHalfDay ?? true,
      allowHourly: false,
      isActive: true,
      color: t.Color ?? t.color ?? null,
      requireAttachment: false,
      attachmentAfterDays: null,
    }));
  },

  async getApplications(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.APPLICATIONS, { params });
    return response.data.content;
  },

  async getApplicationById(id: string): Promise<LeaveApplication> {
    const response = await axiosInstance.get(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  async createApplication(data: CreateLeaveRequest): Promise<LeaveApplication> {
    const response = await axiosInstance.post(ENDPOINTS.LEAVE.APPLICATIONS, data);
    return response.data.content;
  },

  async withdrawApplication(id: string, reason?: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/withdraw`, {
      data: reason ? { reason } : undefined,
    });
  },

  async getPendingApprovals(params?: { page?: number; pageSize?: number }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.PENDING_APPROVALS, { params });
    return response.data.content;
  },

  async approveLeave(id: string, comments?: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/approve`, { comments });
  },

  async rejectLeave(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/reject`, { reason });
  },
};

export default leaveService;
