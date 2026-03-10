/**
 * Leave Types and Interfaces
 * Shared types for leave-related components
 */

export interface Leave {
  id: string;
  name: string;
  dateRange: string;
  type: string;
  daysAgo: string;
  status?: 'requested' | 'active' | 'cancelled';
  avatarUrl?: string;
}

export type LeaveStatus = 'requested' | 'active' | 'cancelled';

export interface LeaveCardProps {
  leave: Leave;
  onPress?: (leave: Leave) => void; // Navigate to details when card is pressed
  onApprove?: (leaveId: string) => void;
  onReject?: (leaveId: string) => void;
  onCancel?: (leaveId: string) => void; // For active leaves
  onRestore?: (leaveId: string) => void; // For cancelled leaves
  onViewDetails?: (leaveId: string) => void; // For all leaves (deprecated, use onPress instead)
}

export interface LeaveFilterTabsProps {
  activeTab: LeaveStatus;
  onTabChange: (tab: LeaveStatus) => void;
}

export interface LeaveListProps {
  leaves: Leave[];
  onPress?: (leave: Leave) => void; // Navigate to details when card is pressed
  onApprove?: (leaveId: string) => void;
  onReject?: (leaveId: string) => void;
  onCancel?: (leaveId: string) => void; // For active leaves
  onRestore?: (leaveId: string) => void; // For cancelled leaves
  onViewDetails?: (leaveId: string) => void; // For all leaves (deprecated, use onPress instead)
}
