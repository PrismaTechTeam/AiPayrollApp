/**
 * The employee's own compliance documents.
 *
 * Every call here is bound server-side to the employee linked to the signed-in
 * user, which is why not one of these methods takes an employee id. The shapes
 * below mirror EmployeeDocumentChecklistDto / EmployeeDocumentRowDto on the
 * server; the status vocabulary is defined there and must not be re-invented
 * here, so `DocumentStatus` lists exactly the nine tokens the resolver emits.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

/** The server's ComplianceStatus, verbatim. 'N/A' is a row that is simply not owed. */
export type DocumentStatus =
  | 'OK'
  | 'PENDING'
  | 'REQUESTED'
  | 'EXPIRING'
  | 'MISSING'
  | 'EXPIRED'
  | 'REJECTED'
  | 'WAIVED'
  | 'N/A';

/** One stored file. Dates that are calendar dates arrive as plain YYYY-MM-DD. */
export interface DocumentFile {
  id: string;
  fileName: string;
  fileSizeKb: number | null;
  mimeType: string | null;
  description: string | null;
  /** NONE / SUBMITTED / VERIFIED / REJECTED / SUPERSEDED. */
  status: string;
  /** HR or PORTAL — whether HR filed it or the employee sent it. */
  submittedFrom: string;
  issueDate: string | null;
  expiryDate: string | null;
  /** Negative once expired. Comes from the server so the screen cannot disagree with the badge. */
  daysToExpiry: number | null;
  rejectionReason: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  versionNo: number;
  uploadedAt: string;
  uploadedByName: string | null;
  documentTypeLabel: string | null;
}

/** One (employee, document type) row: what is owed, and where it stands. */
export interface DocumentRow {
  documentTypeId: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  status: DocumentStatus;
  isRequired: boolean;
  /** False ⇒ HR issues this one. The employee downloads it and never uploads it. */
  employeeCanUpload: boolean;
  hasExpiry: boolean;
  hasTemplate: boolean;
  templateFileName: string | null;
  employeeInstructions: string | null;
  document: DocumentFile | null;
  history: DocumentFile[];
  requestId: string | null;
  dueDate: string | null;
  requestedAt: string | null;
  reminderCount: number;
  waiveReason: string | null;
  waiverId: string | null;
}

export interface DocumentChecklist {
  rows: DocumentRow[];
  requiredCount: number;
  satisfiedCount: number;
  actionNeededCount: number;
  pendingReviewCount: number;
  compliancePercent: number;
  /**
   * False when the employee may read but not send — employment ended, inside the
   * read grace period. The screen must say why rather than let a submit fail.
   */
  canUpload: boolean;
  /** The server's own words for that refusal. Null in the ordinary case. */
  notice: string | null;
}

/** What the picker produced, in the shape React Native's FormData needs. */
export interface UploadableFile {
  uri: string;
  name: string;
  mimeType: string;
}

const EMPTY: DocumentChecklist = {
  rows: [],
  requiredCount: 0,
  satisfiedCount: 0,
  actionNeededCount: 0,
  pendingReviewCount: 0,
  compliancePercent: 100,
  canUpload: false,
  notice: null,
};

const documentService = {
  /** The whole checklist: one row per document type this employee owes or has provided. */
  async getChecklist(): Promise<DocumentChecklist> {
    const response = await axiosInstance.get(ENDPOINTS.COMPLIANCE_DOCUMENTS.CHECKLIST);
    const content = response.data?.content as Partial<DocumentChecklist> | undefined;
    if (!content) return EMPTY;
    return {
      ...EMPTY,
      ...content,
      rows: Array.isArray(content.rows) ? content.rows : [],
    };
  },

  /**
   * How many rows the employee can actually do something about, for the home tile.
   * Answers 0 rather than throwing when the employee has no access, so a badge
   * can never be the thing that breaks the home screen.
   */
  async getActionNeeded(): Promise<number> {
    const response = await axiosInstance.get(ENDPOINTS.COMPLIANCE_DOCUMENTS.SUMMARY);
    const count = response.data?.content?.actionNeeded;
    return typeof count === 'number' ? count : 0;
  },

  /**
   * Send a document for one type. A phone photo on a slow connection outlives
   * the default API timeout, so this call gets its own.
   */
  async submit(documentTypeId: string, file: UploadableFile): Promise<DocumentFile> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const response = await axiosInstance.post(
      `${ENDPOINTS.COMPLIANCE_DOCUMENTS.BASE}/${documentTypeId}/submit`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    );
    return response.data.content;
  },

  /** Server path of one of the employee's own documents, for the download helper. */
  contentUrl(documentId: string): string {
    return `${ENDPOINTS.COMPLIANCE_DOCUMENTS.BASE}/${documentId}/content`;
  },

  /**
   * A short-lived URL for the blank form HR published for a type. The URL is
   * presigned and carries its own authorisation, so it is opened directly
   * rather than downloaded through the authenticated helper.
   */
  async getTemplateUrl(documentTypeId: string): Promise<string> {
    const response = await axiosInstance.get(
      `${ENDPOINTS.COMPLIANCE_DOCUMENTS.TYPES}/${documentTypeId}/template`,
    );
    const url = response.data?.content?.url;
    if (typeof url !== 'string' || !url) throw new Error('This document has no blank form to download.');
    return url;
  },
};

export default documentService;
