/**
 * Status constants aligned with backend values.
 * All status comparisons should use these constants.
 */
export const STATUSES = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type Status = typeof STATUSES[keyof typeof STATUSES];

/** Status labels for display */
export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
};

/** Status colors for UI badges */
export const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  DRAFT: { bg: '#F5F5F5', text: '#757575' },
  PENDING: { bg: '#FFF3E0', text: '#E65100' },
  APPROVED: { bg: '#E8F5E9', text: '#2E7D32' },
  REJECTED: { bg: '#FFEBEE', text: '#C62828' },
  CANCELLED: { bg: '#ECEFF1', text: '#546E7A' },
  WITHDRAWN: { bg: '#F3E5F5', text: '#7B1FA2' },
};

/** Filter tab configurations for list screens */
export const LEAVE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: STATUSES.PENDING, label: 'Pending' },
  { key: STATUSES.APPROVED, label: 'Approved' },
  { key: STATUSES.REJECTED, label: 'Rejected' },
  { key: STATUSES.WITHDRAWN, label: 'Withdrawn' },
];

export const CLAIM_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: STATUSES.DRAFT, label: 'Draft' },
  { key: STATUSES.PENDING, label: 'Pending' },
  { key: STATUSES.APPROVED, label: 'Approved' },
  { key: STATUSES.REJECTED, label: 'Rejected' },
];

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
  ON_LEAVE: 'ON_LEAVE',
  HALF_DAY: 'HALF_DAY',
} as const;
