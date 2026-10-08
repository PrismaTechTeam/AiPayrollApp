/**
 * What HR's Home reads that no other screen does: the team's attendance today.
 *
 * Read defensively. The server live today and the reworked one answer this route differently
 * (the rework sends no attendance figures to somebody without the right), and Home must show
 * the right state on either rather than a row of zeros.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

// The request queue moved to requestService.getPendingApprovals; the type is re-exported so
// older imports keep compiling.
export type { WaitingRequest } from './requestService';

export interface TeamSnapshot {
  /** Active employees with an IN punch today. */
  present: number;
  /**
   * Active employees with no IN punch today. Not "absent": the server counts everyone without a
   * punch, so people on a rest day or on leave are in this number too.
   */
  notIn: number;
  total: number;
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
}

const dashboardService = {
  /**
   * Today's punched-in and not-punched-in counts for the whole company, or null when the server
   * sends none. GET /api/mobile/dashboard needs a company but no employee record, so it answers
   * HR who are not employees too. The live server sends the figures to every member; the
   * reworked one only to holders of an attendance report right. The app shows the card only to
   * those holders either way, and hides it on null.
   */
  async getTeamSnapshot(): Promise<TeamSnapshot | null> {
    const response = await axiosInstance.get(ENDPOINTS.DASHBOARD);
    const stats = response.data?.content?.attendanceStats;
    const present = count(stats?.present);
    const absent = count(stats?.absent);
    if (present === null || absent === null) return null;
    return { present, notIn: absent, total: present + absent };
  },
};

export default dashboardService;
