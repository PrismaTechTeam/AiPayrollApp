/**
 * Mock Request Data
 * Separate data for each tab status
 */

import { Request } from '../types/request.types';

// Requested Requests (Pending Approval)
export const mockRequestedRequests: Request[] = [
  {
    id: '1',
    name: 'Alexa Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '2',
    name: 'Jack Liam',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Overtime Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '3',
    name: 'Mason Robert',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Request for Business Trip',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '4',
    name: 'James Rhys',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Factory Visit Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '5',
    name: 'William Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Deport Visit Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '6',
    name: 'Ethan Joe',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Client Meeting Request',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
];

// Active Requests (Approved and Ongoing)
export const mockActiveRequests: Request[] = [
  {
    id: '7',
    name: 'Sarah Johnson',
    dateRange: '25 Aug- 26 Aug, 2021',
    type: 'Business Trip',
    daysAgo: '4 Days Ago',
    status: 'active',
  },
  {
    id: '8',
    name: 'Michael Brown',
    dateRange: '24 Aug- 25 Aug, 2021',
    type: 'Overtime Request',
    daysAgo: '5 Days Ago',
    status: 'active',
  },
  {
    id: '9',
    name: 'Emily Davis',
    dateRange: '23 Aug- 24 Aug, 2021',
    type: 'Factory Visit Request',
    daysAgo: '6 Days Ago',
    status: 'active',
  },
  {
    id: '10',
    name: 'David Wilson',
    dateRange: '22 Aug- 23 Aug, 2021',
    type: 'Client Meeting Request',
    daysAgo: '7 Days Ago',
    status: 'active',
  },
];

// Cancelled Requests
export const mockCancelledRequests: Request[] = [
  {
    id: '11',
    name: 'Lisa Anderson',
    dateRange: '20 Aug- 21 Aug, 2021',
    type: 'Business Trip',
    daysAgo: '9 Days Ago',
    status: 'cancelled',
  },
  {
    id: '12',
    name: 'Robert Taylor',
    dateRange: '19 Aug- 20 Aug, 2021',
    type: 'Overtime Request',
    daysAgo: '10 Days Ago',
    status: 'cancelled',
  },
  {
    id: '13',
    name: 'Jennifer Martinez',
    dateRange: '18 Aug- 19 Aug, 2021',
    type: 'Factory Visit Request',
    daysAgo: '11 Days Ago',
    status: 'cancelled',
  },
];

/**
 * Get requests by status
 */
export const getRequestsByStatus = (status: 'requested' | 'active' | 'cancelled'): Request[] => {
  switch (status) {
    case 'requested':
      return mockRequestedRequests;
    case 'active':
      return mockActiveRequests;
    case 'cancelled':
      return mockCancelledRequests;
    default:
      return [];
  }
};

