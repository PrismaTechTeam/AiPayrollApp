/**
 * Punch
 * Clock in or out, from a place the company allows, as a person the company can
 * identify.
 *
 * Three checks, in this order:
 *   0. Whether — the company may record attendance on the office terminals only,
 *      in which case the button is off and says so. An employee tapping a button
 *      that silently records nothing that will ever be paid is worse than a
 *      button that explains itself.
 *   1. Where — GPS must land inside one of HR's punch locations, when HR has drawn
 *      any. The card says which one and how far off you are before you tap, so
 *      nobody discovers the problem by failing. A company with no locations has
 *      the server check no position at all, so a phone that cannot get a fix
 *      there still punches: locking indoor staff out over a reading nobody uses
 *      helped no one.
 *   2. Who — the phone's own fingerprint or face check when it has one enrolled,
 *      and a selfie when it does not. The old screen said "Biometric
 *      authentication is not available on this device" and stopped there, which
 *      left anyone on a phone without a sensor unable to start work.
 *
 * The page fits one phone screen. It is the page people open at a gate with a bag
 * in one hand, and a page that has to be scrolled to find out why the button is
 * grey fails exactly then.
 *
 * The server repeats the source and location checks; nothing here is the control.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import type { IconName } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { LeaveState, Segmented } from '../components/leave/LeaveUi';
import { clockText, fullDateText } from '../components/attendance/PunchRequestUi';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import attendanceService, { PunchLocation, PunchType } from '../api/services/attendanceService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import {
  getFix,
  nearestZone,
  formatDistance,
  type Fix,
  type FixFailure,
  type ZoneMatch,
} from '../lib/punchLocation';

type LocationState =
  | { kind: 'checking' }
  // zonesKnown is false when the zone list could not be fetched. Without it an
  // API outage looked exactly like "this company has no zones", and the screen
  // cheerfully told the employee they could punch from anywhere.
  | { kind: 'ok'; fix: Fix; match: ZoneMatch | null; enforced: boolean; zonesKnown: boolean }
  // Kept apart from 'ok' because whether a failed read matters depends on the zones: with
  // none drawn the server checks no location, and the punch goes ahead without one.
  | { kind: 'failed'; failure: FixFailure; enforced: boolean; zonesKnown: boolean };

/** One clock-in and the clock-out that closed it. `out` is null while the person is still in. */
interface Session {
  in: string | null;
  out: string | null;
}

/** Loading, failed and empty are three different things to say about today. */
type TodayLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; sessions: Session[] }
  | { kind: 'failed'; message: string };

type Direction = 'in' | 'out';

interface NoticeAction {
  label: string;
  icon: IconName;
  onPress: () => void;
}

interface Notice {
  tone: 'bad' | 'warn';
  title: string;
  body?: string;
  action?: NoticeAction;
}

const NOT_LINKED = 'Your account is not linked to an employee record in this company.';

/** What the success dialog calls each punch. */
const DONE_TITLE: Record<PunchType, string> = {
  IN: 'Clocked in',
  OUT: 'Clocked out',
  BREAK_IN: 'Back from break',
  BREAK_OUT: 'Break started',
};

/** What the button does, for the line under it. */
const ACTION_TEXT: Record<PunchType, string> = {
  IN: 'clock in',
  OUT: 'clock out',
  BREAK_IN: 'end your break',
  BREAK_OUT: 'start your break',
};

const FAILURE_TITLE: Record<FixFailure['kind'], string> = {
  denied: 'Location access is off',
  off: 'Location is turned off',
  timeout: 'Could not find your location',
  error: 'Location unavailable',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Turns today's punches into in/out pairs.
 *
 * A day is not always IN then OUT. People clock out for lunch and back in, and
 * the old card showed only the first IN and the last OUT, so an afternoon
 * session was invisible and a lunch break looked like a nine-hour shift.
 *
 * Reads the list in order and lets each IN open a pair that the next OUT
 * closes. Breaks count as the same thing: BREAK_OUT ends the stretch you were
 * working, BREAK_IN starts the next one. An OUT with no open pair still gets a
 * row of its own rather than being dropped -- a missing clock-in is exactly the
 * kind of thing the employee needs to see.
 */
function pairPunches(punches: { punchType: string; punchTime: string }[]): Session[] {
  const ordered = [...punches].sort((a, b) => a.punchTime.localeCompare(b.punchTime));
  const sessions: Session[] = [];

  for (const punch of ordered) {
    const opens = punch.punchType === 'IN' || punch.punchType === 'BREAK_IN';
    const last = sessions[sessions.length - 1];

    if (opens) {
      // A second IN with the previous pair still open means a missing clock-out;
      // leave that pair showing a blank OUT rather than overwriting its time.
      sessions.push({ in: punch.punchTime, out: null });
    } else if (last && last.out === null) {
      last.out = punch.punchTime;
    } else {
      sessions.push({ in: null, out: punch.punchTime });
    }
  }

  return sessions;
}

/**
 * A punch time as "8:05 AM" -- the same way the clock above it and Punch Requests
 * write it. toLocaleTimeString gave 24-hour on one phone and 12-hour on the next,
 * so the clock and the card under it disagreed about the format of the same minute.
 */
function timeOnly(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return '--:--';
  return clockText(d.getHours(), d.getMinutes());
}

/**
 * The company's punch locations.
 *
 * `forbidden` carries the server's words when it answers 403: that is this account
 * having no employee record here, not an outage, and nothing on the page can work.
 */
async function readZones(): Promise<{
  items: PunchLocation[];
  enforced: boolean;
  mobileAllowed: boolean;
  known: boolean;
  forbidden: string | null;
}> {
  try {
    const r = await attendanceService.getPunchLocations();
    return { items: r.items, enforced: r.enforced, mobileAllowed: r.mobileAllowed, known: true, forbidden: null };
  } catch (err) {
    if (statusOfError(err) === 403) {
      return { items: [], enforced: false, mobileAllowed: true, known: false, forbidden: serverMessage(err, NOT_LINKED) };
    }
    // A failed call must not read as "the app is switched off" — mobileAllowed stays
    // true so an outage never locks somebody out of clocking in. The server decides.
    return { items: [], enforced: false, mobileAllowed: true, known: false, forbidden: null };
  }
}

export const AttendanceCheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user } = usePayrollAuth();
  const linkedOnRecord = !!user?.employeeId;

  const [now, setNow] = useState(new Date());
  // Which way the next punch goes. Guessed from today's last punch, but the person can flip
  // it: a night shift that clocked in before midnight has no punch "today" at all, and the
  // guess alone sent IN at the end of it.
  const [direction, setDirection] = useState<Direction>('in');
  // A break that ended on the terminal is closed with BREAK_IN; a plain IN after it reads to
  // the pairing engine as a second clock-in with the first never closed.
  const [lastPunch, setLastPunch] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState>({ kind: 'checking' });
  // Held outside `location` because it survives a failed GPS read: "your company does not
  // use the app" is worth saying even when we never found out where the phone is.
  const [mobileAllowed, setMobileAllowed] = useState(true);
  const [todayLoad, setTodayLoad] = useState<TodayLoad>({ kind: 'loading' });
  // The server's words when it says this account has no employee record here.
  const [unlinked, setUnlinked] = useState<string | null>(null);
  const [biometricReady, setBiometricReady] = useState<boolean | null>(null);
  const [biometricLabel, setBiometricLabel] = useState('Fingerprint');
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // takePictureAsync throws "Camera is not ready" if the shutter is pressed the moment the
  // sheet opens, and that surfaced as a "Camera problem" dialog that closed the camera.
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const alive = useRef(true);
  // Held from the tap until the punch is sent or abandoned. `submitting` only starts inside
  // send(), so a quick double tap used to start two fingerprint prompts, and the second one's
  // error opened the camera on top of the first.
  const busy = useRef(false);
  // The person flipped In/Out themselves; a today load landing afterwards must not flip it back.
  const directionPicked = useRef(false);
  // Each location read is numbered, so a slow one cannot overwrite a newer answer.
  const readSeq = useRef(0);
  const failureRef = useRef<FixFailure | null>(null);

  const punchType: PunchType = direction === 'out' ? 'OUT' : lastPunch === 'BREAK_OUT' ? 'BREAK_IN' : 'IN';

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // What the phone can prove about who is holding it.
  useEffect(() => {
    (async () => {
      try {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (!alive.current) return;
        setBiometricLabel(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face' : 'Fingerprint');
        setBiometricReady(hardware && enrolled);
      } catch {
        if (alive.current) setBiometricReady(false);
      }
    })();
  }, []);

  /**
   * Today's punches, and which way round the next one goes.
   * Resolves false when the server says this account cannot punch here at all.
   */
  const loadToday = useCallback(async (): Promise<boolean> => {
    setTodayLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
    try {
      const today = await attendanceService.getToday();
      if (!alive.current) return true;

      const ordered = [...today.punches].sort((a, b) => a.punchTime.localeCompare(b.punchTime));
      setTodayLoad({ kind: 'ready', sessions: pairPunches(ordered) });

      const last = ordered.length > 0 ? ordered[ordered.length - 1].punchType : null;
      setLastPunch(last);
      if (!directionPicked.current) setDirection(last === 'IN' || last === 'BREAK_IN' ? 'out' : 'in');
      return true;
    } catch (err) {
      if (!alive.current) return false;
      if (statusOfError(err) === 403) {
        setUnlinked(serverMessage(err, NOT_LINKED));
        return false;
      }
      // Said out loud: on a failed load the old card showed --:--, exactly what "no punches
      // yet" looks like, and invited somebody already clocked in to clock in again.
      setTodayLoad({ kind: 'failed', message: serverMessage(err, 'Please try again.') });
      return true;
    }
  }, []);

  /** `fresh` skips the position the phone already holds — for a retry, which must not get the same answer. */
  const readLocation = useCallback(async (fresh = false) => {
    const seq = ++readSeq.current;
    setLocation({ kind: 'checking' });

    const [fixResult, zones] = await Promise.all([getFix({ allowCached: !fresh }), readZones()]);
    if (!alive.current || seq !== readSeq.current) return;

    if (zones.forbidden) {
      setUnlinked(zones.forbidden);
      return;
    }
    setMobileAllowed(zones.mobileAllowed);

    if (!fixResult.ok) {
      setLocation({ kind: 'failed', failure: fixResult.failure, enforced: zones.enforced, zonesKnown: zones.known });
      return;
    }

    const settle = (fix: Fix) =>
      setLocation({
        kind: 'ok',
        fix,
        match: nearestZone(fix, zones.items),
        enforced: zones.enforced,
        zonesKnown: zones.known,
      });
    settle(fixResult.fix);

    // A position the phone already had makes the button live at once. Where a zone decides
    // the punch, a fresh read follows quietly, so a minute-old fix from the car park does not
    // tell someone now standing at the door that they are 120 m away.
    if (fixResult.fix.cached && zones.enforced) {
      const better = await getFix();
      if (!alive.current || seq !== readSeq.current || !better.ok) return;
      settle(better.fix);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      directionPicked.current = false;
      let cancelled = false;
      void (async () => {
        // An account with no employee record on file asks the server first, so it is told so
        // plainly rather than walked through a location prompt and a fingerprint for a punch
        // that would be refused.
        if (!linkedOnRecord) {
          const canPunchHere = await loadToday();
          if (cancelled || !canPunchHere) return;
        } else {
          void loadToday();
        }
        void readLocation();
      })();
      return () => {
        cancelled = true;
      };
    }, [linkedOnRecord, loadToday, readLocation]),
  );

  useEffect(() => {
    failureRef.current = location.kind === 'failed' ? location.failure : null;
  }, [location]);

  // Coming back from the phone's settings is not a navigation event, so focus never fires.
  // When the failure was one settings fix, read again as the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const failure = failureRef.current;
      if (state !== 'active' || !failure) return;
      if (failure.kind === 'off' || (failure.kind === 'denied' && !failure.canAskAgain)) {
        void readLocation(true);
      }
    });
    return () => sub.remove();
  }, [readLocation]);

  const recheck = () => {
    setUnlinked(null);
    void (async () => {
      if (await loadToday()) void readLocation(true);
    })();
  };

  // ── Where things stand ──────────────────────────────────────────────

  const enforced = location.kind === 'checking' ? false : location.enforced;
  const zonesKnown = location.kind === 'checking' ? true : location.zonesKnown;
  const match = location.kind === 'ok' ? location.match : null;
  const mocked = location.kind === 'ok' && location.fix.isMock;
  // A failed read only stops the punch where a position is actually checked: where HR has
  // drawn zones, or where we could not find out whether they have.
  const locationNeeded = enforced || !zonesKnown;
  // Unknown zones with a good fix do not block the punch: the server checks the coordinates
  // again and is the authority. They only stop us from claiming there is no limit.
  const inRange = !enforced || (match?.inside ?? false);
  const placeOk =
    location.kind === 'ok' ? inRange && !mocked : location.kind === 'failed' ? !locationNeeded : false;
  // biometricReady is null while the phone is still being asked what it has. Tapping during
  // that window used to open the camera on a phone that has a perfectly good fingerprint
  // reader, because null is falsy — so the button waits the fraction of a second instead.
  const identityKnown = biometricReady !== null;
  const canPunch = !unlinked && mobileAllowed && placeOk && identityKnown && !submitting;
  const firstName = user?.firstName || user?.name || 'there';

  // GPS accuracy is a radius, not a point. Standing inside a 50 m zone on a ±120 m fix is a
  // coin toss the server will resolve, and being told that beforehand beats being bounced
  // with no idea why. Warned about, never blocked — a hard accuracy gate would lock out
  // exactly the people this feature exists for, the ones punching indoors.
  const accuracyMeters = location.kind === 'ok' ? location.fix.accuracy : null;
  const shakyFix =
    enforced &&
    match !== null &&
    accuracyMeters !== null &&
    accuracyMeters > Math.max(50, match.zone.radiusMeters * 0.6);

  // ── Sending it ──────────────────────────────────────────────────────

  /** Back to where the person came from. A punch opened from a notification has nowhere to go back to. */
  const leave = () => {
    if (!alive.current) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    // Staying put: the next punch goes the other way, whatever was picked for this one.
    directionPicked.current = false;
    void loadToday();
  };

  const send = async (biometricVerified: boolean, selfie?: { uri: string; mimeType: string }) => {
    if (location.kind === 'checking') return;
    // Without a fix only where no position is checked; null, never 0, which is a real place.
    const fix = location.kind === 'ok' ? location.fix : null;

    setSubmitting(true);
    try {
      const payload = {
        punchType,
        latitude: fix?.latitude ?? null,
        longitude: fix?.longitude ?? null,
        accuracy: fix?.accuracy ?? null,
        biometricVerified,
        isMockLocation: fix?.isMock ?? false,
      };

      if (selfie) await attendanceService.clockWithSelfie(payload, selfie);
      else await attendanceService.clock(payload);

      const at = new Date();
      const when = clockText(at.getHours(), at.getMinutes());
      await dialog.notify({
        title: DONE_TITLE[punchType],
        message: match?.zone ? `Recorded at ${when}, ${match.zone.name}.` : `Recorded at ${when}.`,
        tone: 'success',
      });
      leave();
    } catch (err) {
      // A second tap, or a retry on a slow line, lands inside the server's duplicate window.
      // The first punch counted; "Punch not recorded" over "That one was recorded" sent people
      // straight back to try again.
      if (statusOfError(err) === 409) {
        await dialog.notify({
          title: 'Already recorded',
          message: serverMessage(err, 'That punch was already recorded.'),
          tone: 'info',
        });
        leave();
        return;
      }
      await dialog.notify({
        title: 'Punch not recorded',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
      // The server may have rejected on location, or because the company has since moved to
      // device-only punching. Re-read so the screen stops offering what was just refused.
      void readLocation(true);
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  /** Resolves true when the camera is open and now owns the punch until it closes. */
  const openCamera = async (): Promise<boolean> => {
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted.granted) {
        await dialog.notify({
          title: 'Camera needed',
          message: 'We take a photo to confirm it is you. Allow camera access in your phone settings, then try again.',
          tone: 'warning',
        });
        return false;
      }
    }
    setCameraReady(false);
    setCameraOpen(true);
    return true;
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraReady(false);
    busy.current = false;
  };

  /** Resolves true when it fell back to the camera, which then owns the punch. */
  const punchWithBiometric = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirm to ${ACTION_TEXT[punchType]}`,
        cancelLabel: 'Cancel',
        // A device PIN is not proof of who is holding the phone, which is the
        // whole point of the check.
        disableDeviceFallback: true,
      });

      if (result.success) {
        await send(true);
        return false;
      }
      // Cancelling is a choice, not a failure, whoever did the cancelling. Anything else
      // falls to the photo.
      if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
        return false;
      }
      return await openCamera();
    } catch {
      return await openCamera();
    }
  };

  const capture = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });
      setCameraOpen(false);
      setCameraReady(false);
      if (!photo?.uri) {
        await dialog.notify({ title: 'Photo not taken', message: 'Please try again.', tone: 'warning' });
        return;
      }
      await send(false, { uri: photo.uri, mimeType: 'image/jpeg' });
    } catch (err) {
      setCameraOpen(false);
      setCameraReady(false);
      await dialog.notify({ title: 'Camera problem', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      busy.current = false;
      // send() navigates away on success, so by here the screen may be unmounted.
      if (alive.current) setCapturing(false);
    }
  };

  const onPunch = async () => {
    if (!canPunch || busy.current) return;
    busy.current = true;
    let handedToCamera = false;
    try {
      handedToCamera = biometricReady ? await punchWithBiometric() : await openCamera();
    } finally {
      if (!handedToCamera) busy.current = false;
    }
  };

  // ── What the card says ──────────────────────────────────────────────

  const detected = ((): { name: string; pill: { text: string; good: boolean } | null } => {
    if (!mobileAllowed) return { name: 'Office device', pill: { text: 'App off', good: false } };
    if (location.kind === 'checking') return { name: 'Finding you…', pill: null };
    if (location.kind === 'failed') {
      return locationNeeded
        ? { name: 'No location', pill: { text: 'Unavailable', good: false } }
        : { name: 'Anywhere', pill: { text: 'Not required', good: true } };
    }
    if (mocked) return { name: 'Simulated location', pill: { text: 'Blocked', good: false } };
    if (!zonesKnown) return { name: 'Unavailable', pill: { text: 'Not checked', good: false } };
    if (!enforced) return { name: 'Anywhere', pill: { text: 'No limit set', good: true } };
    if (!match) return { name: 'No location nearby', pill: { text: 'Out of range', good: false } };
    if (match.inside) return { name: match.zone.name, pill: { text: 'In range', good: true } };
    return { name: match.zone.name, pill: { text: `${formatDistance(match.distance)} away`, good: false } };
  })();

  const tryAgain: NoticeAction = {
    label: 'Try again',
    icon: 'refresh',
    onPress: () => {
      void readLocation(true);
    },
  };

  /** The red or amber strip: says what to do, and offers the button that does it. */
  const notice = ((): Notice | null => {
    // First, because it makes every other line on this screen irrelevant.
    if (!mobileAllowed) {
      return {
        tone: 'bad',
        title: 'Your company records attendance on the office device',
        body: 'Clock in on the fingerprint or face terminal. Punches from this phone would not count.',
      };
    }
    if (location.kind === 'failed' && locationNeeded) {
      const failure = location.failure;
      // Once the system stops showing the permission prompt, a retry can only fail again;
      // the phone's settings are the one place left to fix it.
      const action: NoticeAction =
        failure.kind === 'denied' && !failure.canAskAgain
          ? {
              label: 'Open settings',
              icon: 'cog-outline',
              onPress: () => {
                Linking.openSettings().catch(() => {});
              },
            }
          : failure.kind === 'denied'
            ? { ...tryAgain, label: 'Allow location', icon: 'map-marker-check-outline' }
            : tryAgain;
      return { tone: 'bad', title: FAILURE_TITLE[failure.kind], body: failure.message, action };
    }
    if (mocked) {
      return {
        tone: 'bad',
        title: 'Simulated location detected',
        body: 'Turn off mock locations on your phone to record attendance.',
        action: tryAgain,
      };
    }
    if (enforced && match && !match.inside) {
      return {
        tone: 'bad',
        title: `You are ${formatDistance(match.distance)} from ${match.zone.name}`,
        body: `Move within ${formatDistance(match.zone.radiusMeters)} of it, then try again.`,
        action: tryAgain,
      };
    }
    if (enforced && !match) {
      return {
        tone: 'bad',
        title: 'Not at a work location',
        body: "None of your company's punch locations are near you.",
        action: tryAgain,
      };
    }
    if (location.kind === 'ok' && !zonesKnown) {
      return {
        tone: 'warn',
        title: "Could not load your company's work locations",
        body: 'You can still punch. The server checks your position when you do.',
      };
    }
    if (shakyFix && accuracyMeters !== null) {
      return {
        tone: 'warn',
        title: `Location accurate to about ${formatDistance(accuracyMeters)}`,
        body: 'If the punch is refused, step outside for a clearer signal.',
        action: tryAgain,
      };
    }
    return null;
  })();

  /**
   * The line under the button, from the same facts as canPunch. It used to know only about
   * submitting and identity, so a grey button waiting on GPS still said "Tap to Clock In" and
   * people tapped it again and again.
   */
  const hint = ((): string => {
    const verb = ACTION_TEXT[punchType];
    if (submitting) return 'Recording…';
    if (!mobileAllowed) return 'Use the office device';
    if (location.kind === 'checking') return 'Finding your location…';
    if (location.kind === 'failed' && locationNeeded) {
      if (location.failure.kind === 'denied') return `Allow location to ${verb}`;
      if (location.failure.kind === 'off') return `Turn on location to ${verb}`;
      return 'Location not found yet';
    }
    if (mocked) return 'Turn off mock location';
    if (!inRange) return match ? `Move closer to ${match.zone.name}` : 'Go to a work location';
    if (!identityKnown) return 'Getting ready…';
    return biometricReady ? `Tap to ${verb}` : `Tap to ${verb} with a photo`;
  })();

  const canRefresh = mobileAllowed && location.kind !== 'checking' && !submitting;
  const sessions = todayLoad.kind === 'ready' ? todayLoad.sessions : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {/* Named as the bottom bar names it, so the button and the page agree. */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Punch</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {unlinked ? (
            <View style={styles.stateCard}>
              <LeaveState
                icon="account-question-outline"
                title="Not linked to an employee yet"
                body={`${unlinked} Ask HR to link your account, then try again.`}
                onRetry={recheck}
              />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                {/* Who, and when */}
                <View style={styles.topRow}>
                  <View style={styles.flex}>
                    <Text style={styles.greeting} numberOfLines={1}>
                      {greeting()}, {firstName}
                    </Text>
                    <Text style={styles.dateText}>{fullDateText(now)}</Text>
                  </View>
                  <Text style={styles.time}>{clockText(now.getHours(), now.getMinutes())}</Text>
                </View>

                {/* Which way. Hidden when the app is off for this company: there is nothing to choose. */}
                {mobileAllowed ? (
                  <View style={styles.segment}>
                    <Segmented
                      options={[
                        { key: 'in', label: lastPunch === 'BREAK_OUT' ? 'Break in' : 'Clock in' },
                        { key: 'out', label: 'Clock out' },
                      ]}
                      value={direction}
                      onChange={(key) => {
                        if (submitting || busy.current) return;
                        directionPicked.current = true;
                        setDirection(key === 'out' ? 'out' : 'in');
                      }}
                    />
                  </View>
                ) : null}

                <View style={styles.buttonArea}>
                  {/* Concentric halos, palest outward. */}
                  <View style={[styles.halo, styles.haloOuter, !canPunch && styles.haloOff]} />
                  <View style={[styles.halo, styles.haloInner, !canPunch && styles.haloOff]} />
                  <TouchableOpacity
                    onPress={() => {
                      void onPunch();
                    }}
                    disabled={!canPunch}
                    activeOpacity={0.85}
                    style={[styles.punchButton, !canPunch && styles.punchButtonOff]}
                    accessibilityRole="button"
                    accessibilityLabel={hint}
                    accessibilityState={{ disabled: !canPunch, busy: submitting }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="large" color={C.blue} />
                    ) : (
                      <MaterialCommunityIcons
                        name={
                          !mobileAllowed
                            ? 'cellphone-off'
                            : biometricReady
                              ? biometricLabel === 'Face'
                                ? 'face-recognition'
                                : 'fingerprint'
                              : 'camera-outline'
                        }
                        size={52}
                        color={canPunch ? C.blue : '#B8C4DA'}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.tapHint} numberOfLines={2}>
                  {hint}
                </Text>

                {/* Where. The row is also the way to read the location again. */}
                <TouchableOpacity
                  style={styles.detected}
                  onPress={() => {
                    void readLocation(true);
                  }}
                  disabled={!canRefresh}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Location: ${detected.name}. Tap to check again.`}
                >
                  <View style={styles.detectedIcon}>
                    {location.kind === 'checking' && mobileAllowed ? (
                      <ActivityIndicator size="small" color={C.blue} />
                    ) : (
                      <MaterialCommunityIcons name="map-marker" size={18} color={C.blue} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    {/* The row stops being about location when location is not what decides
                        the punch, so the label moves with it. */}
                    <Text style={styles.detectedLabel}>{mobileAllowed ? 'Your location' : 'Attendance source'}</Text>
                    <Text style={styles.detectedName} numberOfLines={1}>
                      {detected.name}
                    </Text>
                  </View>
                  {detected.pill ? (
                    <View style={[styles.rangePill, detected.pill.good ? styles.rangeGood : styles.rangeBad]}>
                      <View style={[styles.rangeDot, { backgroundColor: detected.pill.good ? '#16A34A' : C.danger }]} />
                      <Text
                        style={[styles.rangeText, { color: detected.pill.good ? '#15803D' : C.danger }]}
                        numberOfLines={1}
                      >
                        {detected.pill.text}
                      </Text>
                    </View>
                  ) : null}
                  {canRefresh ? <MaterialCommunityIcons name="refresh" size={18} color={C.muted} /> : null}
                </TouchableOpacity>

                {/* What to do about it */}
                {notice ? (
                  <View style={[styles.notice, notice.tone === 'bad' ? styles.noticeBad : styles.noticeWarn]}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={20}
                      color={notice.tone === 'bad' ? C.danger : '#D97706'}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.noticeTitle, { color: notice.tone === 'bad' ? C.danger : '#B45309' }]}>
                        {notice.title}
                      </Text>
                      {notice.body ? <Text style={styles.noticeBody}>{notice.body}</Text> : null}
                      {notice.action ? (
                        <TouchableOpacity
                          style={styles.noticeAction}
                          onPress={notice.action.onPress}
                          disabled={submitting}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <MaterialCommunityIcons name={notice.action.icon} size={16} color={C.blue} />
                          <Text style={styles.noticeActionText}>{notice.action.label}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Today */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Today</Text>
                <TouchableOpacity
                  style={styles.viewAll}
                  onPress={() => navigation.navigate('Attendance')}
                  accessibilityRole="button"
                  accessibilityLabel="This month's attendance"
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                >
                  <Text style={styles.viewAllText}>This month</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={C.blue} />
                </TouchableOpacity>
              </View>

              <View style={styles.todayCard}>
                {todayLoad.kind === 'loading' ? (
                  <View style={styles.todayState}>
                    <ActivityIndicator size="small" color={C.blue} />
                  </View>
                ) : todayLoad.kind === 'failed' ? (
                  <View style={styles.todayFailed}>
                    <MaterialCommunityIcons name="cloud-off-outline" size={20} color={C.danger} />
                    <View style={styles.flex}>
                      <Text style={styles.todayFailedTitle}>Could not load today's punches</Text>
                      <Text style={styles.todayFailedBody} numberOfLines={2}>
                        {todayLoad.message}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.todayRetry}
                      onPress={() => {
                        void loadToday();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Load today's punches again"
                    >
                      <Text style={styles.todayRetryText}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  (sessions.length > 0 ? sessions : [{ in: null, out: null }]).map((session, index) => (
                    <View key={index}>
                      {index > 0 ? <View style={styles.sessionRule} /> : null}
                      {/* The label only earns its place once there is a second pair:
                          with one session "Clock in" already says everything. */}
                      {sessions.length > 1 ? <Text style={styles.sessionTag}>Session {index + 1}</Text> : null}
                      <View style={styles.todayPair}>
                        <View style={styles.todayHalf}>
                          <View style={[styles.todayIcon, styles.todayIn]}>
                            <MaterialCommunityIcons name="login" size={18} color="#16A34A" />
                          </View>
                          <View>
                            <Text style={styles.todayLabel}>Clock in</Text>
                            <Text style={styles.todayValue}>{timeOnly(session.in)}</Text>
                          </View>
                        </View>
                        <View style={styles.todayDivider} />
                        <View style={styles.todayHalf}>
                          <View style={[styles.todayIcon, styles.todayOut]}>
                            <MaterialCommunityIcons name="logout" size={18} color={C.danger} />
                          </View>
                          <View>
                            <Text style={styles.todayLabel}>Clock out</Text>
                            <Text style={styles.todayValue}>{timeOnly(session.out)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Selfie */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={closeCamera}>
        <View style={styles.cameraScreen}>
          <StatusBar barStyle="light-content" backgroundColor={C.ink} />
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              onCameraReady={() => setCameraReady(true)}
            />
          ) : null}

          <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={closeCamera}
                style={styles.cameraClose}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Photo for your attendance</Text>
              <View style={styles.cameraClose} />
            </View>

            <View style={styles.cameraMiddle}>
              <View style={styles.faceGuide} />
            </View>

            <View style={styles.cameraFooter}>
              <Text style={styles.cameraHint}>Look at the camera and keep your face inside the outline.</Text>
              <TouchableOpacity
                onPress={() => {
                  void capture();
                }}
                disabled={capturing || !cameraReady}
                style={styles.shutter}
                accessibilityRole="button"
                accessibilityLabel="Take the photo"
                accessibilityState={{ disabled: capturing || !cameraReady, busy: capturing || !cameraReady }}
              >
                {capturing || !cameraReady ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 8 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },

  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 16, fontWeight: '800', color: C.ink },
  dateText: { fontSize: 12, color: C.muted, marginTop: 2 },
  time: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },

  segment: { marginTop: 14 },

  buttonArea: { width: 168, height: 168, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  halo: { position: 'absolute', borderRadius: 999, backgroundColor: '#E8F0FE' },
  haloOuter: { width: 164, height: 164, opacity: 0.55 },
  haloInner: { width: 136, height: 136, opacity: 0.9 },
  haloOff: { backgroundColor: '#EEF2F7' },
  punchButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchButtonOff: { borderColor: '#C9D3E4' },

  tapHint: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 2 },

  detected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    marginTop: 14,
    backgroundColor: '#EEF4FE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detectedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  detectedLabel: { fontSize: 11, color: C.body },
  detectedName: { fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 1 },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, maxWidth: 128 },
  rangeGood: { backgroundColor: '#DCFCE7' },
  rangeBad: { backgroundColor: C.dangerBg },
  rangeDot: { width: 7, height: 7, borderRadius: 4 },
  rangeText: { flexShrink: 1, fontSize: 12, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 12, marginTop: 10 },
  noticeWarn: { backgroundColor: '#FFF4E5' },
  noticeBad: { backgroundColor: C.dangerBg },
  noticeTitle: { fontSize: 13, fontWeight: '700' },
  noticeBody: { fontSize: 12, lineHeight: 17, color: C.body, marginTop: 2 },
  noticeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 36,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9DAF8',
    backgroundColor: '#FFFFFF',
  },
  noticeActionText: { fontSize: 13, fontWeight: '700', color: C.blue },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#E6EEFF', borderRadius: 999, paddingLeft: 12, paddingRight: 8, paddingVertical: 6 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: C.blue },

  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: C.blue,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  todayState: { height: 40, alignItems: 'center', justifyContent: 'center' },
  todayFailed: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayFailedTitle: { fontSize: 13, fontWeight: '700', color: C.ink },
  todayFailedBody: { fontSize: 12, color: C.body, marginTop: 1 },
  todayRetry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  todayRetryText: { fontSize: 13, fontWeight: '700', color: C.blue },
  todayPair: { flexDirection: 'row', alignItems: 'center' },
  todayHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  sessionRule: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  sessionTag: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  todayDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.line },
  todayIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  todayIn: { backgroundColor: '#E7F7EE' },
  todayOut: { backgroundColor: C.dangerBg },
  todayLabel: { fontSize: 12, color: C.body },
  todayValue: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 1, fontVariant: ['tabular-nums'] },

  cameraScreen: { flex: 1, backgroundColor: C.ink },
  cameraOverlay: { flex: 1 },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  cameraClose: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  cameraMiddle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  faceGuide: { width: 250, height: 320, borderRadius: 160, borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)' },
  cameraFooter: { alignItems: 'center', paddingBottom: 24, gap: 18 },
  cameraHint: { fontSize: 14, color: '#FFFFFF', opacity: 0.9, textAlign: 'center', paddingHorizontal: 32 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
});

export default AttendanceCheckInScreen;
