/**
 * What the signed-in person may approve in the current company.
 *
 * The app used to choose the HR view from the role's NAME: any role other than exactly
 * "Employee" got Request, Leave and Claims Approval. A role without those rights then saw
 * screens that each failed with 403. The server already guards every one of those endpoints
 * with the same rights ([HasRight(...)]), so the app reads the person's real rights and offers
 * only what will work. Someone with none of them gets the employee app, Punch included.
 *
 * Until the rights arrive, and if they cannot be fetched, it falls back to the old role-name
 * rule, so a slow or failed request never blanks the home screen.
 */
import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { isOwner } from '../constants/userRoles';

/** The server's right codes, verbatim — the same ones its [HasRight] attributes check. */
export const APPROVAL_RIGHTS = {
  requests: 'REQUEST_APPLICATION.APPROVE',
  leave: 'LEAVE_APPLICATION.APPROVE',
  claims: 'CLAIM_APPLICATION.APPROVE',
  requestTypes: 'REQUEST_TYPE.VIEW',
} as const;

export interface ApproverAccess {
  requests: boolean;
  leave: boolean;
  claims: boolean;
  requestTypes: boolean;
  /** At least one approval right: this person gets the HR view. */
  any: boolean;
}

// One request per person per company per app session, shared by every screen that asks.
// Keyed by user as well as company so signing in as someone else never inherits rights.
const rightsCache = new Map<string, Promise<string[] | null>>();

function loadRights(key: string): Promise<string[] | null> {
  let pending = rightsCache.get(key);
  if (!pending) {
    pending = axiosInstance
      .get(ENDPOINTS.ACCESS_CONTROL.MY_PERMISSIONS)
      .then((response) => {
        const content = response.data?.content;
        if (!content) return null;
        const fromRole: string[] = content.roleAccessRight ?? [];
        const fromUser: string[] = content.userAccessRight ?? [];
        return [...fromRole, ...fromUser];
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

function fromRights(rights: string[]): ApproverAccess {
  const has = (code: string) => rights.includes(code);
  const requests = has(APPROVAL_RIGHTS.requests);
  const leave = has(APPROVAL_RIGHTS.leave);
  const claims = has(APPROVAL_RIGHTS.claims);
  return { requests, leave, claims, requestTypes: has(APPROVAL_RIGHTS.requestTypes), any: requests || leave || claims };
}

function fromRoleName(role: string | null): ApproverAccess {
  const owner = isOwner(role);
  return { requests: owner, leave: owner, claims: owner, requestTypes: owner, any: owner };
}

export function useApproverAccess(): ApproverAccess {
  const { user, currentRole } = usePayrollAuth();
  const key = user?.uid && user?.tenantId ? `${user.uid}:${user.tenantId}` : null;
  const [rights, setRights] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRights(null);
    if (!key) return;
    loadRights(key).then((loaded) => {
      if (!cancelled) setRights(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return rights ? fromRights(rights) : fromRoleName(currentRole);
}
