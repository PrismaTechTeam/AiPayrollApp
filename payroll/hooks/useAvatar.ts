/**
 * The signed-in person's profile picture, fetched once and shared by every
 * screen that shows it. The login response carries no avatar, and asking the
 * server on every mount made the home screen flash between initials and photo.
 */
import { useEffect, useState } from 'react';
import accountService from '../api/services/accountService';

const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();

/** Record a new picture (or its removal) so every mounted screen updates at once. */
export function setCachedAvatar(userId: string, url: string | null): void {
  cache.set(userId, url);
  listeners.forEach((notify) => notify());
}

export function useAvatarUrl(userId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(userId ? cache.get(userId) ?? null : null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    const notify = () => setUrl(cache.get(userId) ?? null);
    listeners.add(notify);

    if (!cache.has(userId)) {
      accountService
        .getAvatarUrl(userId)
        .then((fetched) => {
          if (cancelled) return;
          cache.set(userId, fetched);
          setUrl(fetched);
        })
        .catch(() => {
          // No picture is a normal state; a failed lookup just shows initials.
        });
    } else {
      notify();
    }

    return () => {
      cancelled = true;
      listeners.delete(notify);
    };
  }, [userId]);

  return url;
}
