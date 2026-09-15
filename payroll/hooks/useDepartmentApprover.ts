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
import { useEffect, useState } from 'react';
import leaveService, { type DepartmentApproverStatus } from '../api/services/leaveService';
import { usePayrollAuth } from '../context/PayrollAuthContext';

const NONE: DepartmentApproverStatus = { isDepartmentApprover: false, departmentIds: [] };

// One request per person per company per app session, shared by every screen that asks.
const statusCache = new Map<string, Promise<DepartmentApproverStatus>>();

function loadStatus(key: string): Promise<DepartmentApproverStatus> {
  let pending = statusCache.get(key);
  if (!pending) {
    pending = leaveService.getApproverStatus().catch(() => {
      // Forget the failure, so the next screen asks again instead of inheriting it.
      statusCache.delete(key);
      return NONE;
    });
    statusCache.set(key, pending);
  }
  return pending;
}

export function useDepartmentApprover(): DepartmentApproverStatus {
  const { user } = usePayrollAuth();
  const key = user?.uid && user?.tenantId ? `${user.uid}:${user.tenantId}` : null;
  const [status, setStatus] = useState<DepartmentApproverStatus>(NONE);

  useEffect(() => {
    let cancelled = false;
    setStatus(NONE);
    if (!key) return;
    loadStatus(key).then((loaded) => {
      if (!cancelled) setStatus(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return status;
}
