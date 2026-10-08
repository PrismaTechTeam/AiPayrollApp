/**
 * Claims, entirely through the mobile API.
 *
 * Every call here used to run through the web controllers (/api/claim-applications,
 * /api/Claim). Those carry [HasRight] and answer 403 for an ordinary employee — the
 * module only looked like it worked because the account being tested was an owner.
 * The mobile controller binds the employee from the token instead, so an employee
 * reaches their own claims and nobody else's.
 *
 * The two shapes the server sends back are normalised here rather than in the
 * screens: a list row and a detail row differ in which fields are populated, and
 * every screen was re-deciding what a missing one meant.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

// ── What a claim is ───────────────────────────────────────────────────────

export interface ClaimApplication {
  id: string;
  /** Present on the approval queue; the employee's own list omits it. */
  employeeId: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  departmentName: string | null;
  claimTypeId: string | null;
  claimTypeName: string | null;
  transDate: string;
  amount: number;
  description: string | null;
  receiptNo: string | null;
  receiptDate: string | null;
  status: string;
  submittedFrom: string | null;
  attachmentFileName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  /**
   * The claimant's allowance for this claim's type, sent only to an approver
   * reading somebody else's claim. Optional: the server live today does not send
   * it, and the screens show nothing about the allowance until it does.
   */
  balance?: ClaimBalance | null;
}

export interface ClaimType {
  id: string;
  /** The description HR wrote, falling back to the code when they left it blank. */
  name: string;
  code: string;
  category: string | null;
  /**
   * The allowance for the year and for the month. These are budgets to spend
   * down, not a cap on a single claim — the old screen treated the yearly limit
   * as a per-claim maximum and refused valid claims because of it.
   */
  yearlyLimit: number | null;
  monthlyLimit: number | null;
  requireReceipt: boolean;
  taxable: boolean;
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

export interface ClaimPayload {
  claimTypeId: string;
  /** ISO. The server stores the date part. */
  transDate: string;
  amount: number;
  description?: string;
  receiptNo?: string;
  receiptDate?: string;
}

export interface ReceiptLink {
  /** Pre-signed and short-lived: the bytes come from storage, not from the API. */
  url: string;
  fileName: string;
  expiresInMinutes: number;
}

export interface ClaimPage {
  items: ClaimApplication[];
  total: number;
}

// ── Normalising ───────────────────────────────────────────────────────────

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function optionalNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toClaim(raw: any): ClaimApplication {
  return {
    id: String(raw?.id ?? ''),
    employeeId: str(raw?.employeeId),
    employeeName: str(raw?.employeeName),
    employeeCode: str(raw?.employeeCode),
    departmentName: str(raw?.departmentName),
    claimTypeId: str(raw?.claimTypeId),
    claimTypeName: str(raw?.claimTypeName),
    transDate: String(raw?.transDate ?? ''),
    amount: num(raw?.amount),
    description: str(raw?.description),
    receiptNo: str(raw?.receiptNo),
    receiptDate: str(raw?.receiptDate),
    // A row with no status is not a row anyone can act on; PENDING is the only
    // safe reading, and the screens all handle it.
    status: str(raw?.status) ?? 'PENDING',
    submittedFrom: str(raw?.submittedFrom),
    attachmentFileName: str(raw?.attachmentFileName),
    approvedByName: str(raw?.approvedByName),
    approvedAt: str(raw?.approvedAt),
    rejectionReason: str(raw?.rejectionReason),
    createdAt: String(raw?.createdAt ?? ''),
    balance: raw?.balance && typeof raw.balance === 'object' ? toBalance(raw.balance) : null,
  };
}

function toType(raw: any): ClaimType {
  const code = String(raw?.shortCode ?? '');
  return {
    id: String(raw?.id ?? ''),
    name: str(raw?.description) ?? code,
    code,
    category: str(raw?.claimCategory),
    yearlyLimit: optionalNum(raw?.defaultYearlyLimit),
    monthlyLimit: optionalNum(raw?.defaultMonthlyLimit),
    requireReceipt: raw?.requireReceipt === true,
    taxable: raw?.isTaxable === true,
  };
}

function toBalance(raw: any): ClaimBalance {
  return {
    claimTypeId: String(raw?.claimTypeId ?? ''),
    claimTypeName: str(raw?.claimTypeName) ?? 'Claim',
    claimCategory: str(raw?.claimCategory),
    yearlyLimit: num(raw?.yearlyLimit),
    monthlyLimit: num(raw?.monthlyLimit),
    ytdClaimed: num(raw?.ytdClaimed),
    ytdPending: num(raw?.ytdPending),
    mtdClaimed: num(raw?.mtdClaimed),
    mtdPending: num(raw?.mtdPending),
    yearlyRemaining: num(raw?.yearlyRemaining),
    monthlyRemaining: num(raw?.monthlyRemaining),
  };
}

function toPage(content: any): ClaimPage {
  const items = Array.isArray(content?.items) ? content.items : [];
  return { items: items.map(toClaim), total: num(content?.total) };
}

const claimService = {
  // ── The employee's own claims ───────────────────────────────────────────

  /** Active claim types for the tenant. Read-only on mobile; HR maintains them on the web. */
  async getTypes(): Promise<ClaimType[]> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.TYPES);
    const raw = response.data?.content;
    return (Array.isArray(raw) ? raw : []).map(toType);
  },

  async getApplications(params?: { page?: number; pageSize?: number; status?: string }): Promise<ClaimPage> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.APPLICATIONS, { params });
    return toPage(response.data?.content);
  },

  async getApplication(id: string): Promise<ClaimApplication> {
    const response = await axiosInstance.get(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}`);
    return toClaim(response.data?.content);
  },

  async createApplication(payload: ClaimPayload & { isDraft?: boolean }): Promise<ClaimApplication> {
    const response = await axiosInstance.post(ENDPOINTS.CLAIM.APPLICATIONS, payload);
    return toClaim(response.data?.content);
  },

  async createApplicationWithAttachment(form: FormData): Promise<ClaimApplication> {
    const response = await axiosInstance.post(
      `${ENDPOINTS.CLAIM.APPLICATIONS}/with-attachment`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return toClaim(response.data?.content);
  },

  /** Edit a claim nobody has decided yet. The server re-checks both ownership and status. */
  async updateApplication(id: string, payload: ClaimPayload): Promise<ClaimApplication> {
    const response = await axiosInstance.put(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}`, payload);
    return toClaim(response.data?.content);
  },

  /**
   * Withdraw a pending claim. The row survives as CANCELLED rather than
   * disappearing, which is what an audited money trail requires — so the screens
   * say "withdraw", not "delete".
   */
  async withdrawApplication(id: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}`);
  },

  /** What is left to claim this year and this month, per claim type. */
  async getBalance(): Promise<ClaimBalance[]> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.BALANCE);
    const raw = response.data?.content;
    return (Array.isArray(raw) ? raw : []).map(toBalance);
  },

  /**
   * A short-lived link to the receipt in storage.
   *
   * Unlike a request attachment, which streams its bytes back through the API,
   * this answers with a pre-signed URL. The download must therefore go straight
   * to that URL with no Authorization header — sending one to some storage
   * providers is what makes the signature fail.
   */
  async getReceiptLink(id: string): Promise<ReceiptLink> {
    const response = await axiosInstance.get(`${ENDPOINTS.CLAIM.APPLICATIONS}/${id}/receipt`);
    const content = response.data?.content;
    return {
      url: String(content?.url ?? ''),
      fileName: str(content?.fileName) ?? 'receipt',
      expiresInMinutes: num(content?.expiresInMinutes),
    };
  },

  // ── Deciding other people's claims ──────────────────────────────────────

  /**
   * The approval queue: claims that are actually pending, and nothing else.
   * 403 when the caller does not hold CLAIM_APPLICATION.APPROVE — the screen
   * reads that as "no approval rights" rather than as a failure.
   */
  async getPendingApprovals(params?: { page?: number; pageSize?: number }): Promise<ClaimPage> {
    const response = await axiosInstance.get(ENDPOINTS.CLAIM.PENDING_APPROVALS, { params });
    return toPage(response.data?.content);
  },

  /**
   * Every claim in the company, decided ones included, for the Approved,
   * Rejected and All tabs. The mobile controller has no such list, so this is
   * the web one: guarded by CLAIM_APPLICATION.VIEW rather than APPROVE (a 403
   * here means "may decide, may not browse"), and unlike the queue it does not
   * leave out the caller's own claims. Leave `status` out for every status.
   */
  async getAllClaims(params: { status?: string; page?: number; pageSize?: number }): Promise<ClaimPage> {
    const response = await axiosInstance.get(ENDPOINTS.WEB_CLAIM.APPLICATIONS, { params });
    return toPage(response.data?.content);
  },

  async approveClaim(id: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.CLAIM.BASE}/${id}/approve`);
  },

  async rejectClaim(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.CLAIM.BASE}/${id}/reject`, { reason });
  },
};

export default claimService;
