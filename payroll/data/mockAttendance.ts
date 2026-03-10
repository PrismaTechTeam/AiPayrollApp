/**
 * Mock Attendance Data
 * Sample attendance records for different dates
 */

import { Attendance, AttendanceDate } from '../types/attendance.types';

// Generate dates for the current week
const today = new Date();
const generateWeekDates = (): AttendanceDate[] => {
  const dates: AttendanceDate[] = [];
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Start from 7 days ago to show a week
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayIndex = date.getDay();
    const isToday = i === 0;
    
    dates.push({
      day: days[dayIndex],
      date: date.getDate(),
      month: months[date.getMonth()],
      fullDate: date.toISOString().split('T')[0], // YYYY-MM-DD format
      isToday,
      isSelected: isToday,
    });
  }
  
  return dates;
};

export const weekDates = generateWeekDates();

// Mock attendance records for today
export const mockTodayAttendance: Attendance[] = [
  {
    id: '1',
    name: 'Alexa Smith',
    checkIn: '09.30 AM',
    checkOut: '09.30 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Present',
  },
  {
    id: '2',
    name: 'Jack Liam',
    checkIn: '08.45 AM',
    checkOut: '06.15 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Present',
  },
  {
    id: '3',
    name: 'Mason Robert',
    checkIn: '09.00 AM',
    checkOut: '07.30 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Present',
  },
  {
    id: '4',
    name: 'James Rhys',
    checkIn: '10.15 AM',
    checkOut: '05.45 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Late',
  },
  {
    id: '5',
    name: 'William Smith',
    checkIn: '10.30 AM',
    checkOut: '06.00 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Late',
  },
  {
    id: '6',
    name: 'Emily Davis',
    checkIn: '00.00 AM',
    checkOut: '00.00 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Absent',
  },
  {
    id: '7',
    name: 'Michael Brown',
    checkIn: '00.00 AM',
    checkOut: '00.00 PM',
    location: '8 S Jefferson St, New Ulm, MN',
    date: '29 Aug, 2021',
    status: 'Absent',
  },
];

// Mock attendance records for other dates (you can expand this)
export const mockAttendanceByDate: Record<string, Attendance[]> = {
  [weekDates.find(d => d.isToday)?.fullDate || '']: mockTodayAttendance,
  // Add more dates as needed
};

/**
 * Get attendance records by date
 */
export const getAttendanceByDate = (date: string): Attendance[] => {
  return mockAttendanceByDate[date] || [];
};
