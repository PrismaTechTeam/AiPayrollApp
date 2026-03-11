import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface PayslipListItem {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  processedDate: string;
  grossPay: number;
  netPay: number;
  status: string;
}

export interface PayslipDetail {
  payrollRunId: string;
  employeeCode: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  processedDate: string;

  // Income
  wages: number;
  allowance: number;
  overtime: number;
  commission: number;
  bonus: number;
  claims: number;
  others: number;

  // Deductions
  deduction: number;
  loan: number;
  advanceDeduct: number;
  unpaidLeave: number;

  // Statutory
  employeeEpf: number;
  employeeSocso: number;
  employeeEis: number;
  pcb: number;
  zakat: number;

  // Totals
  grossPay: number;
  grossDeductions: number;
  netPay: number;
}

const payslipService = {
  async getList(params?: { year?: number; page?: number; pageSize?: number }): Promise<{ items: PayslipListItem[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.PAYSLIP.LIST, { params });
    return response.data.content;
  },

  async getDetail(payrollRunId: string): Promise<PayslipDetail> {
    const response = await axiosInstance.get(`${ENDPOINTS.PAYSLIP.PDF}/${payrollRunId}`);
    return response.data.content;
  },

  async downloadPdf(payrollRunId: string): Promise<string> {
    const response = await axiosInstance.get(`${ENDPOINTS.PAYSLIP.PDF}/${payrollRunId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default payslipService;
