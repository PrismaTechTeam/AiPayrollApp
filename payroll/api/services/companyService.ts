import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

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

// Company search is gone from the app: it listed every customer company to any
// signed-in account, and joining now goes through HR's invitation code instead.
const companyService = {
  /**
   * Ask to join a company.
   *
   * `employeeCode` / `icNumber` are what HR uses to work out which employee record
   * this account belongs to. Without them the request reaches HR as a name and an
   * email, and at a company with ninety operators that leaves them guessing — a wrong
   * guess connects somebody to another person's payslips.
   */
  async submitJoinRequest(
    tenantId: string,
    message?: string,
    identity?: { employeeCode?: string; icNumber?: string },
  ): Promise<JoinRequest> {
    const response = await axiosInstance.post(ENDPOINTS.COMPANY.JOIN_REQUEST, {
      tenantId,
      message,
      employeeCode: identity?.employeeCode?.trim() || undefined,
      icNumber: identity?.icNumber?.trim() || undefined,
    });
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

  async joinViaCode(
    code: string,
    identity?: { employeeCode?: string; icNumber?: string; message?: string },
  ): Promise<JoinRequest> {
    const response = await axiosInstance.post(ENDPOINTS.COMPANY.JOIN_VIA_CODE, {
      code,
      message: identity?.message,
      employeeCode: identity?.employeeCode?.trim() || undefined,
      icNumber: identity?.icNumber?.trim() || undefined,
    });
    return response.data.content;
  },

  /**
   * The company's invitation code, for HR to hand to new employees. Needs
   * EMPLOYEE_PORTAL.VIEW. `code` is null when the company has never issued one;
   * issuing and rotating stay on the web, where the poster and the expiry are set.
   */
  async getJoinCode(): Promise<CompanyJoinCode> {
    const response = await axiosInstance.get(ENDPOINTS.COMPANY_JOIN_CODE);
    const content = response.data?.content ?? {};
    const code = typeof content.code === 'string' && content.code.trim() ? content.code.trim() : null;
    return {
      code,
      expiresAt: typeof content.expiresAt === 'string' ? content.expiresAt : null,
      isExpired: content.isExpired === true,
    };
  },
};

export interface CompanyJoinCode {
  code: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export default companyService;
