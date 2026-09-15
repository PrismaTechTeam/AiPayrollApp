/**
 * Where the phone is, and whether that counts as "at work".
 *
 * The same maths runs on the server and decides the punch; this copy exists so
 * the screen can say "you are 320 m from Main Office" BEFORE anyone taps, rather
 * than letting them try and bounce.
 */
import * as Location from 'expo-location';
import type { PunchLocation } from '../api/services/attendanceService';

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isMock: boolean;
}

export type FixFailure =
  | { kind: 'denied'; message: string }
  | { kind: 'off'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'error'; message: string };

export type FixResult = { ok: true; fix: Fix } | { ok: false; failure: FixFailure };

/**
 * Reads the current position.
 *
 * Returns a typed failure rather than a fake `{0, 0}`. The previous version
 * fell back to Null Island on both denial and error, so a punch with no
 * location at all looked to the server exactly like a punch in the Gulf of
 * Guinea — and was accepted.
 */
export async function getFix(): Promise<FixResult> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        ok: false,
        failure: {
          kind: 'denied',
          message: canAskAgain
            ? 'Allow location access so we can confirm you are at work.'
            : 'Location is switched off for this app. Turn it on in your phone settings, then try again.',
        },
      };
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      return { ok: false, failure: { kind: 'off', message: 'Turn on Location on your phone, then try again.' } };
    }

    // A first fix indoors can take a while; without a cap the screen would
    // simply hang with no explanation.
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      20000,
    );

    if (!position) {
      return {
        ok: false,
        failure: { kind: 'timeout', message: 'Could not get a location fix. Step outside or near a window and try again.' },
      };
    }

    return {
      ok: true,
      fix: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        isMock: (position as unknown as { mocked?: boolean }).mocked === true,
      },
    };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : 'Could not read your location.';
    return { ok: false, failure: { kind: 'error', message } };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    // The loser of a race still settles. Without this catch, a location read that fails
    // AFTER the timeout has already won becomes an unhandled rejection — a red box in
    // development and a silent crash report in production, for a case we handled.
    promise.catch(() => null),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. Mirrors GeoDistance.Meters on the server. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ZoneMatch {
  zone: PunchLocation;
  distance: number;
  inside: boolean;
}

/**
 * The zone the fix belongs to: one it is inside, else the closest.
 * Null only when the company has defined none.
 */
export function nearestZone(fix: Fix, zones: PunchLocation[]): ZoneMatch | null {
  let best: ZoneMatch | null = null;

  for (const zone of zones) {
    if (!zone.isActive) continue;
    const distance = distanceMeters(fix.latitude, fix.longitude, zone.latitude, zone.longitude);
    const inside = distance <= zone.radiusMeters;
    // A zone you are standing in always wins over a nearer centre you are outside of.
    const score = inside ? distance - zone.radiusMeters : distance;
    if (!best || score < (best.inside ? best.distance - best.zone.radiusMeters : best.distance)) {
      best = { zone, distance, inside };
    }
  }

  return best;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
