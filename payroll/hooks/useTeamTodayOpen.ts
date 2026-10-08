/**
 * Whether Team Today (Employee List, and the map it opens) will open for this person.
 *
 * Two things decide it. The attendance right (ATTENDANCE_PUNCH_REPORT.VIEW or
 * ATTENDANCE_WORK_CARD.VIEW, `access.team`), and, on both servers in use today, an employee
 * record: GET team-today still sits behind [RequiresEmployee], so an HR account added
 * straight to the company is refused whatever its rights. Offering that person a tile that
 * opens on "no access" is a control that does nothing, so for them the route is asked once
 * per app session and the tile shows only if the server answers. The day the server drops
 * the employee requirement, the tile appears by itself, with no app update.
 *
 * A linked person with the right is never asked: the server always lets them in.
 */
import { useEffect, useState } from 'react';
import attendanceService from '../api/services/attendanceService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { statusOfError } from '../lib/serverMessage';
import { useApproverAccess } from './useApproverAccess';

// Per person per company, for this app session. Only an answer is kept: a refusal (403) is
// one, a timeout or an outage is not, and is asked again on the next screen that wants it.
const answers = new Map<string, boolean>();
const asking = new Map<string, Promise<boolean | null>>();

function probe(key: string): Promise<boolean | null> {
  let pending = asking.get(key);
  if (!pending) {
    pending = attendanceService
      .getTeamToday()
      .then(
        () => {
          answers.set(key, true);
          return true as boolean | null;
        },
        (err: unknown) => {
          if (statusOfError(err) === 403) {
            answers.set(key, false);
            return false;
          }
          return null;
        },
      )
      .finally(() => {
        asking.delete(key);
      });
    asking.set(key, pending);
  }
  return pending;
}

export function useTeamTodayOpen(): boolean {
  const { user } = usePayrollAuth();
  const access = useApproverAccess();
  const linked = !!user?.employeeId;
  const allowed = access.ready && access.team;
  const key = user?.uid && user?.tenantId ? `${user.uid}:${user.tenantId}` : null;
  // Kept with the key it belongs to, so a company switch never shows the previous company's answer.
  const [probed, setProbed] = useState<{ key: string | null; open: boolean | null }>(() => ({
    key,
    open: key ? answers.get(key) ?? null : null,
  }));

  useEffect(() => {
    if (!key || !allowed || linked) return;
    const known = answers.get(key);
    if (known !== undefined) {
      setProbed({ key, open: known });
      return;
    }
    let cancelled = false;
    void probe(key).then((open) => {
      if (!cancelled) setProbed({ key, open });
    });
    return () => {
      cancelled = true;
    };
  }, [key, allowed, linked]);

  if (!allowed || !key) return false;
  if (linked) return true;
  const open = probed.key === key ? probed.open : answers.get(key) ?? null;
  return open === true;
}
