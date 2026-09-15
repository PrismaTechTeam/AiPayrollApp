/**
 * The employee's own payslips.
 *
 * The detail call does not return raw payroll columns any more. It returns the
 * payslip already reduced to the rows that get printed — the same object the
 * server renders the PDF from — so the screen cannot decide a row is worth
 * showing that the PDF leaves out, or label one differently. See
 * `Payroll/Application/DTOs/Mobile/PayslipDocumentDto.cs`.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface PayslipListItem {
  payrollRunId: string;
  payrollYear: number;
  payrollMonth: number;
  runType: string;
  payrollNumber: string | null;
  description1: string | null;
  periodStart: string;
  periodEnd: string;
  processedDate: string;
  employeeCode: string;
  employeeName: string;
  grossPay: number;
  grossDeductions: number;
  netPay: number;
}

export interface PayslipListPage {
  items: PayslipListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface PayslipOvertimeLine {
  type: string;
  /** Multiplier, e.g. 1.5. Null when the source line carries none. */
  rate: number | null;
  hours: number | null;
  amount: number;
}

export interface PayslipLeaveRow {
  code: string;
  description: string;
  /** Entitlement plus carry forward — what the printed payslip calls "Entitlement". */
  entitlement: number;
  taken: number;
  balance: number;
}

export interface PayslipCompany {
  name: string;
  registrationNumber: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface PayslipEmployee {
  name: string;
  code: string;
  icNo: string | null;
  bankAccount: string | null;
  epfNo: string | null;
  socsoNo: string | null;
  basicSalary: number;
  /** Days worked in the period. Null for companies that do not run attendance. */
  workDays: number | null;
}

export interface PayslipDocument {
  payrollRunId: string;
  year: number;
  month: number;
  /** "1 Aug 2026 – 31 Aug 2026". Formatted server-side so it matches the PDF exactly. */
  periodLabel: string;
  paymentDateLabel: string;
  payrollNumber: string | null;

  company: PayslipCompany;
  employee: PayslipEmployee;

  income: PayslipLine[];
  deductions: PayslipLine[];

  overtimeLines: PayslipOvertimeLine[];
  overtimeTotal: number;

  leave: PayslipLeaveRow[];
  employerContributions: PayslipLine[];

  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

const payslipService = {
  async getList(params?: { year?: number; page?: number; pageSize?: number }): Promise<PayslipListPage> {
    const response = await axiosInstance.get(ENDPOINTS.PAYSLIP.LIST, { params });
    return response.data.content;
  },

  async getDocument(payrollRunId: string): Promise<PayslipDocument> {
    const response = await axiosInstance.get(`${ENDPOINTS.PAYSLIP.DETAIL}/${payrollRunId}`);
    return response.data.content;
  },

  /** The printable payslip, as HTML. expo-print turns it into the PDF the employee keeps. */
  async getHtml(payrollRunId: string): Promise<string> {
    const response = await axiosInstance.get(`${ENDPOINTS.PAYSLIP.DETAIL}/${payrollRunId}/html`);
    return response.data.content.html;
  },
};

export default payslipService;
