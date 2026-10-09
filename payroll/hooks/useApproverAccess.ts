/**
 * What the signed-in person may approve in the current company.
 *
 * The app used to choose the HR view from the role's NAME: any role other than exactly
 * "Employee" got Request, Leave and Claims Approval. A role without those rights then saw
 * screens that each failed with 403. The server already guards every one of those endpoints
 * with the same rights ([HasRight(...)]), so the app reads the person's real rights and offers
 * only what will work.
 *
 * Until the rights arrive, and if they cannot be fetched, the flags fall back to the old
 * role-name rule, because the leave screens use them to pick an endpoint and a guess is better
 * than nothing there. The home screen, the bottom bar and View All do NOT trust the guess:
 * they show approval entries only once `ready` is true, so a "Manager" role with no approval
 * rights never sees three tiles that each answer 403.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { isOwner } from '../constants/userRoles';

/** The server's right codes, verbatim — the same ones its [HasRight] attributes check. */
export const APPROVAL_RIGHTS = {
  requests: 'REQUEST_APPLICATION.APPROVE',
  // The approval list and each request's page (GET /api/employee-requests and /{id})
  // are guarded by VIEW, not APPROVE.
  requestsView: 'REQUEST_APPLICATION.VIEW',
  leave: 'LEAVE_APPLICATION.APPROVE',
  // The live GET /api/Leave/applications (Home's count, the Leave Approval list, each leave's
  // page for HR) is guarded by VIEW. Only the reworked server, not yet deployed, also accepts
  // APPROVE there; once it is live, Leave Approval can follow APPROVE alone.
  leaveView: 'LEAVE_APPLICATION.VIEW',
  claims: 'CLAIM_APPLICATION.APPROVE',
  // Claim Approval's Approved, Rejected and All tabs read the web list, which is guarded by VIEW;
  // its Pending tab reads the mobile queue, which needs APPROVE only.
  claimsView: 'CLAIM_APPLICATION.VIEW',
  requestTypes: 'REQUEST_TYPE.VIEW',
  requestTypeCreate: 'REQUEST_TYPE.CREATE',
  requestTypeEdit: 'REQUEST_TYPE.EDIT',
  requestTypeDelete: 'REQUEST_TYPE.DELETE',
  // Either opens the team's attendance: the rights the server checks on the dashboard figures
  // and on team-today (Employee List, Employee Map).
  teamPunchReport: 'ATTENDANCE_PUNCH_REPORT.VIEW',
  teamWorkCard: 'ATTENDANCE_WORK_CARD.VIEW',
  // Approving or rejecting a punch request (POST punches/adjust/{id}/approve|reject).
  teamWorkCardEdit: 'ATTENDANCE_WORK_CARD.EDIT',
  // The company's invitation code (GET /api/CompanyJoinRequest/join-code).
  employeePortal: 'EMPLOYEE_PORTAL.VIEW',
} as const;

export interface ApproverAccess {
  /** Approve AND view: a role with approve alone would open a list that can only fail to load. */
  requests: boolean;
  leave: boolean;
  claims: boolean;
  requestTypes: boolean;
  /** Each change to a request type needs its own right; a view-only role sees no +, Edit or Delete. */
  requestTypeCreate: boolean;
  requestTypeEdit: boolean;
  requestTypeDelete: boolean;
  /**
   * May see the team's attendance (Home's Team today card, Employee List). The live server hands
   * those figures to any member, so this flag is the only thing keeping them from a plain
   * employee until the reworked server, which checks the same rights, is deployed.
   */
  team: boolean;
  /**
   * May read everyone's forgotten-punch requests (Punch Approval): ATTENDANCE_WORK_CARD.VIEW, the
   * right the web's Attendance > Daily > Punch Requests page and its endpoint check. Deciding
   * them is `punchDecide`.
   */
  punchApprovals: boolean;
  /** May approve or reject them: ATTENDANCE_WORK_CARD.EDIT, the right the server checks. */
  punchDecide: boolean;
  /** May browse decided claims (Claim Approval's Approved, Rejected and All tabs). */
  claimsView: boolean;
  /** May see and share the company's invitation code (Invite employees). */
  employeePortal: boolean;
  /** At least one approval right: this person approves things on top of anything else they do. */
  any: boolean;
  /** The flags above come from the server's answer, not from the role-name guess. */
  ready: boolean;
  /** The rights could not be fetched; the flags above are the role-name guess. */
  failed: boolean;
  /** Ask the server again, e.g. from pull-to-refresh after `failed`. */
  retry: () => void;
  /**
   * Ask the server again even though an answer is cached, e.g. on pull-to-refresh: a right
   * granted or removed on the web is otherwise not seen until the app is restarted. The answer
   * already shown stays up until the new one arrives, and stays if the new one fails.
   */
  refresh: () => Promise<void>;
}

// One request per person per company per app session, shared by every screen that asks.
// Keyed by user as well as company so signing in as someone else never inherits rights.
const rightsCache = new Map<string, Promise<string[] | null>>();
// The settled answers, readable synchronously. Without it every screen rendered once with the
// role-name guess and then again with the real rights, so the HR tiles flickered on each visit.
const settled = new Map<string, string[]>();
// When each settled answer arrived. Rights change on the web while the app sits in a pocket;
// an answer older than this is asked for again when the app comes back to the front.
const fetchedAt = new Map<string, number>();
const STALE_MS = 5 * 60 * 1000;
// A refresh already on its way, so Home and its bottom bar (two hooks) send one request, not two.
const refreshing = new Map<string, Promise<string[] | null>>();
// Every mounted hook, told when a refresh brings a new answer: the tiles and the tab bar on the
// same screen must not disagree about what this person may open.
const listeners = new Set<() => void>();

function fetchRights(): Promise<string[]> {
  return axiosInstance.get(ENDPOINTS.ACCESS_CONTROL.MY_PERMISSIONS).then((response) => {
    const content = response.data?.content;
    if (!content) throw new Error('No rights in the response');
    const fromRole: string[] = content.roleAccessRight ?? [];
    const fromUser: string[] = content.userAccessRight ?? [];
    return [...fromRole, ...fromUser];
  });
}

function remember(key: string, rights: string[]): void {
  settled.set(key, rights);
  fetchedAt.set(key, Date.now());
}

function loadRights(key: string): Promise<string[] | null> {
  let pending = rightsCache.get(key);
  if (!pending) {
    pending = fetchRights()
      .then((rights) => {
        remember(key, rights);
        return rights;
      })
      .catch(() => {
        // Forget the failure, so the next screen asks again instead of inheriting it.
        rightsCache.delete(key);
        return null;
      });
    rightsCache.set(key, pending);
  }
  return pending;
}

/** A fresh answer for a key that already has one. On failure the old answer stays. */
function refreshRights(key: string): Promise<string[] | null> {
  let pending = refreshing.get(key);
  if (!pending) {
    pending = fetchRights()
      .then((rights) => {
        remember(key, rights);
        rightsCache.set(key, Promise.resolve(rights));
        listeners.forEach((notify) => notify());
        return rights;
      })
      // A failed refresh must not take away tiles that worked a moment ago.
      .catch(() => null)
      .finally(() => {
        refreshing.delete(key);
      });
    refreshing.set(key, pending);
  }
  return pending;
}

function fromRights(rights: string[]) {
  const has = (code: string) => rights.includes(code);
  const requests = has(APPROVAL_RIGHTS.requests) && has(APPROVAL_RIGHTS.requestsView);
  const leave = has(APPROVAL_RIGHTS.leave) && has(APPROVAL_RIGHTS.leaveView);
  const claims = has(APPROVAL_RIGHTS.claims);
  return {
    requests,
    leave,
    claims,
    requestTypes: has(APPROVAL_RIGHTS.requestTypes),
    requestTypeCreate: has(APPROVAL_RIGHTS.requestTypeCreate),
    requestTypeEdit: has(APPROVAL_RIGHTS.requestTypeEdit),
    requestTypeDelete: has(APPROVAL_RIGHTS.requestTypeDelete),
    team: has(APPROVAL_RIGHTS.teamPunchReport) || has(APPROVAL_RIGHTS.teamWorkCard),
    punchApprovals: has(APPROVAL_RIGHTS.teamWorkCard),
    punchDecide: has(APPROVAL_RIGHTS.teamWorkCard) && has(APPROVAL_RIGHTS.teamWorkCardEdit),
    claimsView: has(APPROVAL_RIGHTS.claimsView),
    employeePortal: has(APPROVAL_RIGHTS.employeePortal),
    // Any approval right at all makes this person HR here, whether or not the
    // request or leave list itself will open for them.
    any: has(APPROVAL_RIGHTS.requests) || has(APPROVAL_RIGHTS.leave) || claims,
  };
}

function fromRoleName(role: string | null) {
  const owner = isOwner(role);
  return {
    requests: owner,
    leave: owner,
    claims: owner,
    requestTypes: owner,
    requestTypeCreate: owner,
    requestTypeEdit: owner,
    requestTypeDelete: owner,
    // Never guessed: the guess decides an endpoint for the leave screens, but the team's
    // attendance is somebody else's data, shown only on the server's word.
    team: false,
    punchApprovals: false,
    punchDecide: false,
    claimsView: owner,
    employeePortal: owner,
    any: owner,
  };
}

type Fetched = { key: string | null; rights: string[] | null; failed: boolean };

export function useApproverAccess(): ApproverAccess {
  const { user, currentRole } = usePayrollAuth();
  const key = user?.uid && user?.tenantId ? `${user.uid}:${user.tenantId}` : null;
  const [fetched, setFetched] = useState<Fetched>(() => ({
    key,
    rights: key ? settled.get(key) ?? null : null,
    failed: false,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const known = key ? settled.get(key) ?? null : null;
    // Unchanged state is kept as the same object, so a screen that already had the answer on its
    // first render does not render a second time for nothing.
    setFetched((prev) => (prev.key === key && prev.rights === known && !prev.failed ? prev : { key, rights: known, failed: false }));
    if (!key || known) return;
    loadRights(key).then((loaded) => {
      if (!cancelled) setFetched({ key, rights: loaded, failed: loaded === null });
    });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  // Another hook's refresh brought a new answer for this key: show it here too.
  useEffect(() => {
    const notify = () => {
      const now = key ? settled.get(key) ?? null : null;
      setFetched((prev) => (now && (prev.key !== key || prev.rights !== now) ? { key, rights: now, failed: false } : prev));
    };
    listeners.add(notify);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && key && settled.has(key) && Date.now() - (fetchedAt.get(key) ?? 0) > STALE_MS) {
        void refreshRights(key);
      }
    });
    return () => {
      listeners.delete(notify);
      sub.remove();
    };
  }, [key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const refresh = useCallback(async () => {
    if (!key) return;
    if (settled.has(key)) {
      await refreshRights(key);
      return;
    }
    // Never answered yet (or the answer failed): the ordinary load, shared with any other screen.
    const loaded = await loadRights(key);
    setFetched((prev) => (prev.key === key ? { key, rights: loaded, failed: loaded === null } : prev));
  }, [key]);

  // Read through the key so a company switch never shows the previous company's rights for the
  // one render before the effect above catches up.
  const rights = fetched.key === key ? fetched.rights : key ? settled.get(key) ?? null : null;
  const flags = rights ? fromRights(rights) : fromRoleName(currentRole);
  return {
    ...flags,
    ready: rights !== null,
    failed: fetched.key === key && fetched.failed,
    retry,
    refresh,
  };
}
