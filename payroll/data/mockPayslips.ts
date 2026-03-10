/**
 * Mock Payslip Data
 * Separate data for each tab status
 */

import { Payslip } from '../types/payslip.types';

// Requested Payslips (Pending)
export const mockRequestedPayslips: Payslip[] = [
  {
    id: '1',
    name: 'Alexa Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    date: '2 Aug, 2021',
    amount: '$200.00',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '2',
    name: 'Jack Liam',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    date: '2 Aug, 2021',
    amount: '$200.00',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '3',
    name: 'Mason Robert',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    date: '2 Aug, 2021',
    amount: '$200.00',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '4',
    name: 'James Rhys',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    date: '2 Aug, 2021',
    amount: '$200.00',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
  {
    id: '5',
    name: 'William Smith',
    dateRange: '27 Aug- 28 Aug, 2021',
    type: 'Business Trip',
    date: '2 Aug, 2021',
    amount: '$200.00',
    daysAgo: '2 Days Ago',
    status: 'requested',
  },
];

// Completed Payslips
export const mockCompletedPayslips: Payslip[] = [
  {
    id: '6',
    name: 'Sarah Johnson',
    dateRange: '25 Aug- 26 Aug, 2021',
    type: 'Business Trip',
    date: '1 Aug, 2021',
    amount: '$250.00',
    daysAgo: '4 Days Ago',
    status: 'completed',
  },
  {
    id: '7',
    name: 'Michael Brown',
    dateRange: '24 Aug- 25 Aug, 2021',
    type: 'Business Trip',
    date: '31 Jul, 2021',
    amount: '$180.00',
    daysAgo: '5 Days Ago',
    status: 'completed',
  },
  {
    id: '8',
    name: 'Emily Davis',
    dateRange: '23 Aug- 24 Aug, 2021',
    type: 'Business Trip',
    date: '30 Jul, 2021',
    amount: '$300.00',
    daysAgo: '6 Days Ago',
    status: 'completed',
  },
];

// Cancelled Payslips
export const mockCancelledPayslips: Payslip[] = [
  {
    id: '9',
    name: 'Lisa Anderson',
    dateRange: '20 Aug- 21 Aug, 2021',
    type: 'Business Trip',
    date: '27 Jul, 2021',
    amount: '$150.00',
    daysAgo: '9 Days Ago',
    status: 'cancelled',
  },
  {
    id: '10',
    name: 'Robert Taylor',
    dateRange: '19 Aug- 20 Aug, 2021',
    type: 'Business Trip',
    date: '26 Jul, 2021',
    amount: '$220.00',
    daysAgo: '10 Days Ago',
    status: 'cancelled',
  },
];

/**
 * Get payslips by status
 */
export const getPayslipsByStatus = (status: 'requested' | 'completed' | 'cancelled'): Payslip[] => {
  switch (status) {
    case 'requested':
      return mockRequestedPayslips;
    case 'completed':
      return mockCompletedPayslips;
    case 'cancelled':
      return mockCancelledPayslips;
    default:
      return [];
  }
};
