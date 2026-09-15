/**
 * Attendance
 * Clock in or out, from a place the company allows, as a person the company can
 * identify.
 *
 * Three checks, in this order:
 *   0. Whether — the company may record attendance on the office terminals only,
 *      in which case the button is off and says so. An employee tapping a button
 *      that silently records nothing that will ever be paid is worse than a
 *      button that explains itself.
 *   1. Where — GPS must land inside one of HR's punch locations. The card says
 *      which one and how far off you are before you tap, so nobody discovers the
 *      problem by failing.
 *   2. Who — the phone's own fingerprint or face check when it has one enrolled,
 *      and a selfie when it does not. The old screen said "Biometric
 *      authentication is not available on this device" and stopped there, which
 *      left anyone on a phone without a sensor unable to start work.
 *
 * The server repeats the source and location checks; nothing here is the control.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import attendanceService, { PunchLocation, PunchType } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';
import { getFix, nearestZone, formatDistance, type Fix, type ZoneMatch } from '../lib/punchLocation';

type LocationState =
  | { kind: 'checking' }
  // zonesKnown is false when the zone list could not be fetched. Without it an
  // API outage looked exactly like "this company has no zones", and the screen
  // cheerfully told the employee they could punch from anywhere.
  | {
      kind: 'ok';
      fix: Fix;
      match: ZoneMatch | null;
      enforced: boolean;
      zonesKnown: boolean;
      /** False when the company records attendance on the office device only. */
      mobileAllowed: boolean;
    }
  | { kind: 'failed'; message: string };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** One clock-in and the clock-out that closed it. `out` is null while the person is still in. */
interface Session {
  in: string | null;
  out: string | null;
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

function timeOnly(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const AttendanceCheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user } = usePayrollAuth();

  const [now, setNow] = useState(new Date());
  const [punchType, setPunchType] = useState<PunchType>('IN');
  const [location, setLocation] = useState<LocationState>({ kind: 'checking' });
  const [zones, setZones] = useState<PunchLocation[]>([]);
  // Held outside `location` because it survives a failed GPS read: "your company does not
  // use the app" is worth saying even when we never found out where the phone is.
  const [mobileAllowed, setMobileAllowed] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [biometricReady, setBiometricReady] = useState<boolean | null>(null);
  const [biometricLabel, setBiometricLabel] = useState('Fingerprint');
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const alive = useRef(true);

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

  // Which way round the next punch goes, and what today already shows.
  const loadToday = useCallback(async () => {
    try {
      const today = await attendanceService.getToday();
      const punches = Array.isArray(today?.punches) ? today.punches : [];
      if (!alive.current) return;

      setSessions(pairPunches(punches));

      if (punches.length > 0) {
        const last = punches[punches.length - 1].punchType;
        setPunchType(last === 'IN' || last === 'BREAK_IN' ? 'OUT' : 'IN');
      }
    } catch {
      // Leaving it on IN is the safe default; the server records what it is told.
    }
  }, []);

  const readLocation = useCallback(async () => {
    setLocation({ kind: 'checking' });

    const [fixResult, zoneResult] = await Promise.all([
      getFix(),
      attendanceService
        .getPunchLocations()
        .then((r) => ({ ...r, known: true }))
        // A failed call must not read as "the app is switched off" — mobileAllowed stays
        // true so an outage never locks somebody out of clocking in. The server decides.
        .catch(() => ({
          items: [] as PunchLocation[],
          enforced: false,
          mobileAllowed: true,
          known: false,
        })),
    ]);
    if (!alive.current) return;

    setZones(zoneResult.items);
    setMobileAllowed(zoneResult.mobileAllowed);

    if (!fixResult.ok) {
      setLocation({ kind: 'failed', message: fixResult.failure.message });
      return;
    }

    setLocation({
      kind: 'ok',
      fix: fixResult.fix,
      match: nearestZone(fixResult.fix, zoneResult.items),
      enforced: zoneResult.enforced,
      zonesKnown: zoneResult.known,
      mobileAllowed: zoneResult.mobileAllowed,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadToday();
      void readLocation();
    }, [loadToday, readLocation]),
  );

  const enforced = location.kind === 'ok' ? location.enforced : zones.length > 0;
  // Unknown zones do not block the punch: the server checks the coordinates
  // again and is the authority. They only stop us from claiming there is no limit.
  const zonesKnown = location.kind !== 'ok' || location.zonesKnown;
  const match = location.kind === 'ok' ? location.match : null;
  const inRange = !enforced || (match?.inside ?? false);
  const mocked = location.kind === 'ok' && location.fix.isMock;
  // biometricReady is null while the phone is still being asked what it has. Tapping during
  // that window used to open the camera on a phone that has a perfectly good fingerprint
  // reader, because null is falsy — so the button waits the fraction of a second instead.
  const identityKnown = biometricReady !== null;
  const canPunch =
    location.kind === 'ok' && mobileAllowed && inRange && !mocked && identityKnown && !submitting;
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

  const send = async (biometricVerified: boolean, selfie?: { uri: string; mimeType: string }) => {
    if (location.kind !== 'ok') return;

    setSubmitting(true);
    try {
      const payload = {
        punchType,
        latitude: location.fix.latitude,
        longitude: location.fix.longitude,
        accuracy: location.fix.accuracy,
        biometricVerified,
        isMockLocation: location.fix.isMock,
      };

      if (selfie) await attendanceService.clockWithSelfie(payload, selfie);
      else await attendanceService.clock(payload);

      await dialog.notify({
        title: punchType === 'IN' ? 'Clocked in' : 'Clocked out',
        message: match?.zone ? `Recorded at ${match.zone.name}.` : 'Recorded.',
        tone: 'success',
      });
      if (alive.current) navigation.goBack();
    } catch (err) {
      await dialog.notify({
        title: 'Punch not recorded',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
      // The server may have rejected on location, or because the company has since moved to
      // device-only punching. Re-read so the screen stops offering what was just refused.
      void readLocation();
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted.granted) {
        await dialog.notify({
          title: 'Camera needed',
          message: 'We take a photo to confirm it is you. Allow camera access in your phone settings, then try again.',
          tone: 'warning',
        });
        return;
      }
    }
    setCameraOpen(true);
  };

  const punchWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: punchType === 'IN' ? 'Confirm clock in' : 'Confirm clock out',
        cancelLabel: 'Cancel',
        // A device PIN is not proof of who is holding the phone, which is the
        // whole point of the check.
        disableDeviceFallback: true,
      });

      if (result.success) {
        await send(true);
        return;
      }
      // Cancelling is a choice, not a failure. Anything else falls to the photo.
      if ('error' in result && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        await openCamera();
      }
    } catch {
      await openCamera();
    }
  };

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });
      setCameraOpen(false);
      if (!photo?.uri) {
        await dialog.notify({ title: 'Photo not taken', message: 'Please try again.', tone: 'warning' });
        return;
      }
      await send(false, { uri: photo.uri, mimeType: 'image/jpeg' });
    } catch (err) {
      setCameraOpen(false);
      await dialog.notify({ title: 'Camera problem', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      // send() navigates away on success, so by here the screen may be unmounted.
      if (alive.current) setCapturing(false);
    }
  };

  const onPunch = () => {
    if (!canPunch) return;
    if (biometricReady) void punchWithBiometric();
    else void openCamera();
  };

  // ── The two status rows ─────────────────────────────────────────────

  const detected = useMemo(() => {
    if (!mobileAllowed) return { name: 'Office device', pill: { text: 'App off', good: false } };
    if (location.kind === 'checking') return { name: 'Finding you…', pill: null as null | { text: string; good: boolean } };
    if (location.kind === 'failed') return { name: 'No location', pill: { text: 'Unavailable', good: false } };
    if (mocked) return { name: 'Simulated location', pill: { text: 'Blocked', good: false } };
    if (!zonesKnown) return { name: 'Unavailable', pill: { text: 'Not checked', good: false } };
    if (!enforced) return { name: 'Anywhere', pill: { text: 'No limit set', good: true } };
    if (!match) return { name: 'No location nearby', pill: { text: 'Out of range', good: false } };
    if (match.inside) return { name: match.zone.name, pill: { text: 'Within Range', good: true } };
    return { name: match.zone.name, pill: { text: `${formatDistance(match.distance)} away`, good: false } };
  }, [location, enforced, zonesKnown, match, mocked, mobileAllowed]);

  /** The amber strip: says what to do, never just what is missing. */
  const notice = useMemo(() => {
    // First, because it makes every other line on this screen irrelevant.
    if (!mobileAllowed) {
      return {
        tone: 'bad' as const,
        title: 'Your company records attendance on the office device',
        body: 'Clock in and out on the fingerprint or face terminal. Punches taken on this phone would not count towards your hours.',
      };
    }
    if (location.kind === 'failed') {
      return { tone: 'bad' as const, title: 'Location unavailable', body: location.message };
    }
    if (mocked) {
      return {
        tone: 'bad' as const,
        title: 'Simulated location detected',
        body: 'Turn off mock locations on your phone to record attendance.',
      };
    }
    if (enforced && match && !match.inside) {
      return {
        tone: 'bad' as const,
        title: `You are ${formatDistance(match.distance)} from ${match.zone.name}`,
        body: `Move within ${formatDistance(match.zone.radiusMeters)} of it to clock ${punchType === 'IN' ? 'in' : 'out'}.`,
      };
    }
    if (enforced && !match) {
      return {
        tone: 'bad' as const,
        title: 'Not at a work location',
        body: 'None of your company\'s punch locations are near you.',
      };
    }
    if (!zonesKnown) {
      return {
        tone: 'warn' as const,
        title: "Could not load your company's work locations",
        body: 'You can still record attendance. Your position is sent with it and checked again on the server.',
      };
    }
    if (shakyFix && match && accuracyMeters !== null) {
      return {
        tone: 'warn' as const,
        title: `Your location is only accurate to about ${formatDistance(accuracyMeters)}`,
        body: `You look like you are at ${match.zone.name}, but the reading is rough. If the punch is refused, step outside for a clearer signal and try again.`,
      };
    }
    if (biometricReady === false) {
      return {
        tone: 'warn' as const,
        title: 'No fingerprint or face unlock on this phone',
        body: 'We will take a quick photo instead when you tap the button.',
      };
    }
    return null;
  }, [location, mocked, enforced, zonesKnown, match, biometricReady, punchType, mobileAllowed, shakyFix, accuracyMeters]);

  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>Record your attendance</Text>
          </View>

          <TouchableOpacity
            style={styles.placeChip}
            onPress={() => { void readLocation(); }}
            accessibilityRole="button"
            accessibilityLabel="Refresh your location"
          >
            <MaterialCommunityIcons name="map-marker" size={15} color={C.blue} />
            <Text style={styles.placeChipText} numberOfLines={1}>{detected.name}</Text>
            <MaterialCommunityIcons name="refresh" size={15} color={C.blue} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The punch card */}
          <View style={styles.card}>
            <Text style={styles.greeting}>{greeting()}, {firstName}</Text>
            <Text style={styles.greetingSub}>
              {mobileAllowed
                ? 'Tap the button to record your attendance'
                : 'Attendance for this company is recorded on the office device'}
            </Text>

            <View style={styles.buttonArea}>
              {/* Concentric halos, palest outward. */}
              <View style={[styles.halo, styles.haloOuter, !canPunch && styles.haloOff]} />
              <View style={[styles.halo, styles.haloInner, !canPunch && styles.haloOff]} />
              <TouchableOpacity
                onPress={onPunch}
                disabled={!canPunch}
                activeOpacity={0.85}
                style={[styles.punchButton, !canPunch && styles.punchButtonOff]}
                accessibilityRole="button"
                accessibilityLabel={punchType === 'IN' ? 'Clock in' : 'Clock out'}
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
                    size={74}
                    color={canPunch ? C.blue : '#B8C4DA'}
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.tapHint}>
              {submitting
                ? 'Recording…'
                : !mobileAllowed
                  ? 'Use the office device'
                  : !identityKnown
                    ? 'Getting ready…'
                    : `Tap to Clock ${punchType === 'IN' ? 'In' : 'Out'}`}
            </Text>

            <Text style={styles.time}>{time}</Text>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={15} color={C.muted} />
              <Text style={styles.dateText}>{date}</Text>
            </View>

            {/* Detected location */}
            <View style={styles.detected}>
              <View style={styles.detectedIcon}>
                {location.kind === 'checking' ? (
                  <ActivityIndicator size="small" color={C.blue} />
                ) : (
                  <MaterialCommunityIcons name="map-marker" size={20} color={C.blue} />
                )}
              </View>
              <View style={styles.flex}>
                {/* The row stops being about location when location is not what decides
                    the punch, so the label moves with it. */}
                <Text style={styles.detectedLabel}>
                  {mobileAllowed ? 'Detected Location' : 'Attendance source'}
                </Text>
                <Text style={styles.detectedName} numberOfLines={1}>{detected.name}</Text>
              </View>
              {detected.pill ? (
                <View style={[styles.rangePill, detected.pill.good ? styles.rangeGood : styles.rangeBad]}>
                  <View style={[styles.rangeDot, { backgroundColor: detected.pill.good ? '#16A34A' : C.danger }]} />
                  <Text style={[styles.rangeText, { color: detected.pill.good ? '#15803D' : C.danger }]}>
                    {detected.pill.text}
                  </Text>
                </View>
              ) : null}
            </View>

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
                  <Text style={styles.noticeBody}>{notice.body}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Today */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <TouchableOpacity
              style={styles.viewAll}
              onPress={() => navigation.navigate('Attendance')}
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={C.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.todayCard}>
            {(sessions.length > 0 ? sessions : [{ in: null, out: null }]).map((session, index) => (
              <View key={index}>
                {index > 0 ? <View style={styles.sessionRule} /> : null}
                <View style={styles.sessionRow}>
                  {/* The label only earns its place once there is a second pair:
                      with one session "Clock In" already says everything. */}
                  {sessions.length > 1 ? (
                    <Text style={styles.sessionTag}>Session {index + 1}</Text>
                  ) : null}
                  <View style={styles.todayPair}>
                    <View style={styles.todayHalf}>
                      <View style={[styles.todayIcon, styles.todayIn]}>
                        <MaterialCommunityIcons name="login" size={20} color="#16A34A" />
                      </View>
                      <View>
                        <Text style={styles.todayLabel}>Clock In</Text>
                        <Text style={styles.todayValue}>{timeOnly(session.in)}</Text>
                      </View>
                    </View>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayHalf}>
                      <View style={[styles.todayIcon, styles.todayOut]}>
                        <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
                      </View>
                      <View>
                        <Text style={styles.todayLabel}>Clock Out</Text>
                        <Text style={styles.todayValue}>{timeOnly(session.out)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={20} color={C.blue} />
            <Text style={styles.infoText}>
              {!mobileAllowed
                ? 'Your company takes attendance from its fingerprint or face terminals. Your hours still appear here once the device sends them.'
                : location.kind === 'checking'
                ? 'Checking where you are and which work locations apply.'
                : !zonesKnown
                ? 'We could not reach the server to load your work locations. Your attendance is still checked when you submit it.'
                : enforced
                  ? 'Make sure you are within the allowed location to clock in/out.'
                  : 'Your company has not set any punch locations, so you can clock in from anywhere.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Selfie */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraScreen}>
          <StatusBar barStyle="light-content" backgroundColor={C.ink} />
          {cameraPermission?.granted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
          ) : null}

          <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={() => setCameraOpen(false)}
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
                onPress={() => { void capture(); }}
                disabled={capturing}
                style={styles.shutter}
                accessibilityRole="button"
                accessibilityLabel="Take the photo"
              >
                {capturing ? <ActivityIndicator size="large" color={C.blue} /> : <View style={styles.shutterInner} />}
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

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.body, marginTop: 1 },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 132,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  placeChipText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 28 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  greeting: { alignSelf: 'flex-start', fontSize: 18, fontWeight: '800', color: C.ink },
  greetingSub: { alignSelf: 'flex-start', fontSize: 13, color: C.body, marginTop: 3 },

  buttonArea: { width: 232, height: 232, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  halo: { position: 'absolute', borderRadius: 999, backgroundColor: '#E8F0FE' },
  haloOuter: { width: 224, height: 224, opacity: 0.55 },
  haloInner: { width: 184, height: 184, opacity: 0.9 },
  haloOff: { backgroundColor: '#EEF2F7' },
  punchButton: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchButtonOff: { borderColor: '#C9D3E4' },

  tapHint: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 10 },
  time: { fontSize: 40, fontWeight: '800', color: C.ink, letterSpacing: -0.5, marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 18 },
  dateText: { fontSize: 13, color: C.muted },

  detected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: '#EEF4FE',
    borderRadius: 16,
    padding: 12,
  },
  detectedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  detectedLabel: { fontSize: 11, color: C.body },
  detectedName: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 1 },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  rangeGood: { backgroundColor: '#DCFCE7' },
  rangeBad: { backgroundColor: C.dangerBg },
  rangeDot: { width: 7, height: 7, borderRadius: 4 },
  rangeText: { fontSize: 12, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%', borderRadius: 16, padding: 12, marginTop: 10 },
  noticeWarn: { backgroundColor: '#FFF4E5' },
  noticeBad: { backgroundColor: C.dangerBg },
  noticeTitle: { fontSize: 13, fontWeight: '700' },
  noticeBody: { fontSize: 12, lineHeight: 18, color: C.body, marginTop: 2 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#E6EEFF', borderRadius: 999, paddingLeft: 12, paddingRight: 8, paddingVertical: 6 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: C.blue },

  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  todayHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  todayPair: { flexDirection: 'row', alignItems: 'center' },
  sessionRow: { gap: 8 },
  sessionRule: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  sessionTag: { fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  todayDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.line },
  todayIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  todayIn: { backgroundColor: '#E7F7EE' },
  todayOut: { backgroundColor: C.dangerBg },
  todayLabel: { fontSize: 12, color: C.body },
  todayValue: { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 1, letterSpacing: 1 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF4FE',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: C.blue },

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
