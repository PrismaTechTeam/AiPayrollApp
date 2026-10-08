/**
 * Whether the signed-in employee approves leave for a department, and which departments.
 *
 * Department approvers are set by HR on the web (Leave > Department Approvers). They are
 * ordinary employees -- they keep the employee app, Punch included -- and additionally get
 * Leave Approval, where Approve and Reject show only on the steps of their departments.
 *
 * Until the answer arrives, and if it cannot be fetched, nobody is an approver: the extra
 * entry just appears a moment later, and the server checks every decision anyway.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import leaveService, { type DepartmentApproverStatus } from '../api/services/leaveService';
import { usePayrollAuth } from '../context/PayrollAuthContext';

const NONE: DepartmentApproverStatus = { isDepartmentApprover: false, departmentIds: [] };

// One request per person per company per app session, shared by every screen that asks.
const statusCache = new Map<string, Promise<DepartmentApproverStatus>>();
// The settled answers, readable on the first render. Without them the approver row on Home
// appeared a beat after everything else on every visit, pushing the rows under it down.
const settled = new Map<string, DepartmentApproverStatus>();
// A refresh on its way, and every mounted hook to tell when it lands. HR assigns approvers on the
// web; without these a newly assigned approver never got the row until the app was restarted.
const refreshing = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

/** Ask again although an answer is cached. On failure the answer already shown stays. */
function refreshStatus(key: string): Promise<void> {
  let pending = refreshing.get(key);
  if (!pending) {
    pending = leaveService
      .getApproverStatus()
      .then((status) => {
        settled.set(key, status);
        statusCache.set(key, Promise.resolve(status));
        listeners.forEach((notify) => notify());
      })
      .catch(() => undefined)
      .finally(() => {
        refreshing.delete(key);
      });
    refreshing.set(key, pending);
  }
  return pending;
}

function loadStatus(key: string): Promise<DepartmentApproverStatus> {
  let pending = statusCache.get(key);
  if (!pending) {
    pending = leaveService
      .getApproverStatus()
      .then((status) => {
        settled.set(key, status);
        return status;
      })
      .catch(() => {
        // Forget the failure, so the next screen asks again instead of inheriting it.
        statusCache.delete(key);
        return NONE;
      });
    statusCache.set(key, pending);
  }
  return pending;
}

export interface DepartmentApproverAccess extends DepartmentApproverStatus {
  /** Ask the server again, e.g. on pull-to-refresh. */
  refresh: () => Promise<void>;
}

export function useDepartmentApprover(): DepartmentApproverAccess {
  const { user } = usePayrollAuth();
  const key = user?.uid && user?.tenantId ? `${user.uid}:${user.tenantId}` : null;
  const [status, setStatus] = useState<{ key: string | null; value: DepartmentApproverStatus }>(() => ({
    key,
    value: (key && settled.get(key)) || NONE,
  }));

  useEffect(() => {
    let cancelled = false;
    const known = key ? settled.get(key) : undefined;
    const value = known ?? NONE;
    // Kept as the same object when nothing changed, so there is no second render for nothing.
    setStatus((prev) => (prev.key === key && prev.value === value ? prev : { key, value }));
    if (!key || known) return;
    loadStatus(key).then((loaded) => {
      if (!cancelled) setStatus({ key, value: loaded });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const notify = () => {
      const now = key ? settled.get(key) : undefined;
      if (now) setStatus((prev) => (prev.key === key && prev.value === now ? prev : { key, value: now }));
    };
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, [key]);

  const refresh = useCallback(async () => {
    if (!key) return;
    if (settled.has(key)) {
      await refreshStatus(key);
      return;
    }
    const loaded = await loadStatus(key);
    setStatus((prev) => (prev.key === key ? { key, value: loaded } : prev));
  }, [key]);

  // A company switch must not carry the previous company's departments for even one render.
  const value = status.key !== key ? (key && settled.get(key)) || NONE : status.value;
  // The same object while nothing changed, so a caller that keeps it in a dependency list does
  // not re-run for nothing.
  return useMemo(() => ({ ...value, refresh }), [value, refresh]);
}
