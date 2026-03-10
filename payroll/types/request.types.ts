/**
 * Request Types and Interfaces
 * Shared types for request-related components
 */

export interface Request {
  id: string;
  name: string;
  dateRange: string;
  type: string;
  daysAgo: string;
  status?: 'requested' | 'active' | 'cancelled';
  avatarUrl?: string;
}

export type RequestStatus = 'requested' | 'active' | 'cancelled';

export interface RequestCardProps {
  request: Request;
  onPress?: (request: Request) => void; // Navigate to details when card is pressed
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void; // For active requests
  onRestore?: (requestId: string) => void; // For cancelled requests
  onViewDetails?: (requestId: string) => void; // For all requests (deprecated, use onPress instead)
}

export interface FilterTabsProps {
  activeTab: RequestStatus;
  onTabChange: (tab: RequestStatus) => void;
}

export interface RequestListProps {
  requests: Request[];
  onPress?: (request: Request) => void; // Navigate to details when card is pressed
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void; // For active requests
  onRestore?: (requestId: string) => void; // For cancelled requests
  onViewDetails?: (requestId: string) => void; // For all requests (deprecated, use onPress instead)
}

