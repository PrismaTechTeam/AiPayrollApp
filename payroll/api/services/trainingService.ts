/**
 * The employee's own training record.
 *
 * Every call here is bound server-side to the employee linked to the signed-in
 * user, which is why not one of these methods takes an employee id. The HR
 * controller that does take one (`GET api/training/employees/{id}`) is gated on
 * TRAINING_RECORD.VIEW, so an employee's token gets a 403 from it -- these are
 * the mobile equivalents on `api/mobile/training`.
 *
 * The shapes mirror EmployeeTrainingChecklistDto / EmployeeTrainingRowDto on
 * the server. The status vocabulary is defined there
 * (TrainingStatus) and must not be re-invented here, so `TrainingStatus` lists
 * exactly the seven tokens the resolver emits.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

/**
 * The server's TrainingStatus, verbatim.
 *
 * NOT_DONE rather than "missing": HR rejected that word because the fact is
 * that a person has not been trained yet, not that a file was lost.
 */
export type TrainingStatus =
  | 'DONE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'NOT_DONE'
  | 'DUE_SOON'
  | 'EXCUSED'
  | 'N/A';

/** One (employee, training type) row: what is required, and where it stands. */
export interface TrainingRow {
  trainingTypeId: string;
  code: string;
  name: string;
  category: string | null;
  status: TrainingStatus;
  isRequired: boolean;

  recordId: string | null;
  /** Plain YYYY-MM-DD; the server sends DateOnly, not a timestamp. */
  completedOn: string | null;
  expiresOn: string | null;
  /** SESSION when it came from a class with an attendance sheet, HR_ENTERED otherwise. */
  evidenceSource: string | null;
  trainer: string | null;

  sessionId: string | null;
  /** True when the session behind this row has a file that can be opened. */
  sessionHasProof: boolean;

  excusedReason: string | null;
}

export interface TrainingChecklist {
  employeeId: string;
  rows: TrainingRow[];
  requiredCount: number;
  doneCount: number;
  actionNeededCount: number;
  expiringCount: number;
  compliancePercent: number;
  /**
   * True when the company has configured no training at all. Distinct from a
   * checklist with no rows for this person -- "nobody has set this up yet" and
   * "none of it applies to you" need different words on screen.
   */
  catalogueIsEmpty: boolean;
}

const EMPTY: TrainingChecklist = {
  employeeId: '',
  rows: [],
  requiredCount: 0,
  doneCount: 0,
  actionNeededCount: 0,
  expiringCount: 0,
  compliancePercent: 100,
  catalogueIsEmpty: true,
};

const trainingService = {
  /** One row per active training type that applies to this employee. */
  async getChecklist(): Promise<TrainingChecklist> {
    const response = await axiosInstance.get(ENDPOINTS.TRAINING.CHECKLIST);
    const content = response.data?.content as Partial<TrainingChecklist> | undefined;
    if (!content) return EMPTY;
    return {
      ...EMPTY,
      ...content,
      rows: Array.isArray(content.rows) ? content.rows : [],
    };
  },

  /**
   * Server path of the attendance sheet for a session the employee sat in, for
   * the authenticated download helper. The server checks the caller is on that
   * sheet before it opens the file.
   */
  certificateUrl(sessionId: string): string {
    return `${ENDPOINTS.TRAINING.SESSIONS_BASE}/${sessionId}/certificate`;
  },
};

export default trainingService;
