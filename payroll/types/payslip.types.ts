/**
 * Payslip Types and Interfaces
 * Shared types for payslip-related components
 */

export interface Payslip {
  id: string;
  name: string;
  dateRange: string;
  type: string;
  date: string; // Date displayed on right side (e.g., "2 Aug, 2021")
  amount: string; // Amount displayed (e.g., "$200.00")
  daysAgo?: string;
  status?: 'requested' | 'completed' | 'cancelled';
  avatarUrl?: string;
}

export type PayslipStatus = 'requested' | 'completed' | 'cancelled';

export interface PayslipCardProps {
  payslip: Payslip;
  onPress?: (payslip: Payslip) => void; // Navigate to details when card is pressed
  onApprove?: (payslipId: string) => void;
  onReject?: (payslipId: string) => void;
  onCancel?: (payslipId: string) => void; // For requested payslips
  onViewDetails?: (payslipId: string) => void; // For all payslips (deprecated, use onPress instead)
}

export interface PayslipFilterTabsProps {
  activeTab: PayslipStatus;
  onTabChange: (tab: PayslipStatus) => void;
}

export interface PayslipListProps {
  payslips: Payslip[];
  onPress?: (payslip: Payslip) => void; // Navigate to details when card is pressed
  onApprove?: (payslipId: string) => void;
  onReject?: (payslipId: string) => void;
  onCancel?: (payslipId: string) => void; // For requested payslips
  onViewDetails?: (payslipId: string) => void; // For all payslips (deprecated, use onPress instead)
}
