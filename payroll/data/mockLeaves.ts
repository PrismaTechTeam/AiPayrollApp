/**
 * Mock Leave Data
 * Separate data for each tab status
 */

import { Leave } from '../types/leave.types';

// Requested Leaves (Pending Approval)
export const mockRequestedLeaves: Leave[] = [
  {
    id: '1',
    name: 'Alexa Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Leave Application',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '2',
    name: 'Jack Liam',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Sick Leave Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '3',
    name: 'Mason Robert',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Annual Leave Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '4',
    name: 'James Rhys',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Sick Leave Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '5',
    name: 'William Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Annual Leave Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
];

// Active Leaves (Approved and Ongoing)
export const mockActiveLeaves: Leave[] = [
  {
    id: '6',
    name: 'Sarah Johnson',
    dateRange: '25 Aug- 26 Aug, 2021',
    type: 'Annual Leave Request',
    daysAgo: '4 Days Ago',
    status: 'active',
  },
  {
    id: '7',
    name: 'Michael Brown',
    dateRange: '24 Aug- 25 Aug, 2021',
    type: 'Sick Leave Request',
    daysAgo: '5 Days Ago',
    status: 'active',
  },
  {
    id: '8',
    name: 'Emily Davis',
    dateRange: '23 Aug- 24 Aug, 2021',
    type: 'Leave Application',
    daysAgo: '6 Days Ago',
    status: 'active',
  },
];

// Cancelled Leaves
export const mockCancelledLeaves: Leave[] = [
  {
    id: '9',
    name: 'Lisa Anderson',
    dateRange: '20 Aug- 21 Aug, 2021',
    type: 'Annual Leave Request',
    daysAgo: '9 Days Ago',
    status: 'cancelled',
  },
  {
    id: '10',
    name: 'Robert Taylor',
    dateRange: '19 Aug- 20 Aug, 2021',
    type: 'Sick Leave Request',
    daysAgo: '10 Days Ago',
    status: 'cancelled',
  },
];

/**
 * Get leaves by status
 */
export const getLeavesByStatus = (status: 'requested' | 'active' | 'cancelled'): Leave[] => {
  switch (status) {
    case 'requested':
      return mockRequestedLeaves;
    case 'active':
      return mockActiveLeaves;
    case 'cancelled':
      return mockCancelledLeaves;
    default:
      return [];
  }
};
