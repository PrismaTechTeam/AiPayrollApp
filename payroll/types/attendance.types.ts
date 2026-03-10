/**
 * Attendance Types and Interfaces
 * Shared types for attendance-related components
 */

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface Attendance {
  id: string;
  name: string;
  avatarUrl?: string;
  checkIn: string; // Time in format "09.30 AM"
  checkOut: string; // Time in format "09.30 PM"
  location: string; // Address
  date: string; // Date in format "DD MMM, YYYY"
  status: AttendanceStatus;
}

export interface AttendanceDate {
  day: string; // Day abbreviation "Su", "Mo", "Tu", etc.
  date: number; // Date number
  month: string; // Month abbreviation
  fullDate: string; // Full date string for filtering
  isToday?: boolean;
  isSelected?: boolean;
}

export interface AttendanceCardProps {
  attendance: Attendance;
  onPress?: (attendance: Attendance) => void;
}

export interface AttendanceListProps {
  attendances: Attendance[];
  onPress?: (attendance: Attendance) => void;
}

export interface DateSelectorProps {
  dates: AttendanceDate[];
  selectedDate: AttendanceDate;
  onDateSelect: (date: AttendanceDate) => void;
}
