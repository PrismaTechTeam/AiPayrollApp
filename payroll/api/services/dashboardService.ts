import axiosInstance from '../axiosInstance';

export interface DashboardData {
  attendanceStats: {
    present: number;
    late: number;
    absent: number;
  };
  recentLeaveApplications: Array<{
    id: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
  }>;
  unreadNotificationCount: number;
}

const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const response = await axiosInstance.get('/api/mobile/dashboard');
    return response.data.content;
  },
};

export default dashboardService;
