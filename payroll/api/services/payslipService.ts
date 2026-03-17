import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface PayslipListItem {
  payrollRunId: string;
  payrollYear: number;
  payrollMonth: number;
  periodStart: string;
  periodEnd: string;
  processedDate: string;
  runType: string;
  description1: string | null;
  employeeCode: string;
  employeeName: string;
  grossPay: number;
  grossDeductions: number;
  netPay: number;
}

export interface PayslipDetail {
  payrollRunId: string;
  employeeCode: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  processedDate: string;
  payrollYear: number;
  payrollMonth: number;

  // Income (nested under "income" from API)
  income: {
    wages: number;
    allowance: number;
    overtime: number;
    commission: number;
    bonus: number;
    claims: number;
    others: number;
    directorFees: number;
    advancePaid: number;
    gratuity: number;
  };

  // Deductions (nested under "deductions" from API)
  deductions: {
    deduction: number;
    loan: number;
    advanceDeduct: number;
    unpaidLeaveDeduct: number;
  };

  // Statutory (nested under "statutory" from API)
  statutory: {
    epfEmployee: number;
    epfEmployer: number;
    socsoEmployee: number;
    socsoEmployer: number;
    eisEmployee: number;
    eisEmployer: number;
    pcbPayable: number;
    zakat: number;
    cp38: number;
  };

  // Totals
  grossPay: number;
  grossDeductions: number;
  netPay: number;
  adjustment: number;
}

const payslipService = {
  async getList(params?: { year?: number; page?: number; pageSize?: number }): Promise<{ items: PayslipListItem[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.PAYSLIP.LIST, { params });
    return response.data.content;
  },

  async getDetail(payrollRunId: string): Promise<PayslipDetail> {
    const response = await axiosInstance.get(`/api/mobile/payslip/${payrollRunId}`);
    return response.data.content;
  },

  async getPayslipHtml(payrollRunId: string): Promise<string> {
    const response = await axiosInstance.get(`/api/mobile/payslip/${payrollRunId}/html`);
    return response.data.content.html;
  },
};

export default payslipService;
