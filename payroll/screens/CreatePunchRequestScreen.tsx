/**
 * Missed Punch — "I forgot to clock in (or out)".
 *
 * Four things and a button: which punch, the day, the time, and why. The day
 * starts on today because that is when most people notice; the time starts
 * empty because a pre-filled "now" is exactly the wrong answer for a punch that
 * was missed hours ago, and it would go through unread.
 *
 * Opened from a day on My Attendance, the day and the missing punch arrive
 * already chosen, so the person only says when and why.
 *
 * All four sit in one card and the page fits one phone screen. With the
 * keyboard up, the reason and the Send button are scrolled into view: under
 * Android's edge-to-edge the window no longer shrinks for the keyboard by
 * itself, and both used to end up underneath it.
 *
 * Nothing here touches the work card. The request waits for HR, and the list it
 * returns to is where the answer appears.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { FieldError, FieldLabel, FormCard, SelectField } from '../components/leave/LeaveUi';
import {
  PUNCH_REQUEST_DAYS_BACK,
  PUNCH_TYPES,
  PickerSheet,
  PunchTypeGrid,
  clockText,
  dayLabel,
  toOffsetIso,
} from '../components/attendance/PunchRequestUi';
import attendanceService, { PunchType } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';

const REASON_MAX = 500;
/** The counter only appears once it is worth reading; "0/500" under an empty box is noise. */
const REASON_COUNTER_FROM = REASON_MAX - 100;

type Picking = 'date' | 'time' | null;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "2026-09-15" as a local calendar day, or null when it is not one. */
function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export const CreatePunchRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dialog = useDialog();

  const today = useRef(startOfDay(new Date())).current;
  const earliest = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate() - PUNCH_REQUEST_DAYS_BACK),
    [today],
  );

  // What the day on My Attendance handed over. Anything outside the window the server
  // accepts is ignored rather than shown and then refused.
  const seed = useMemo(() => {
    const params = (route.params ?? {}) as { date?: unknown; punchType?: unknown };
    const seededDay = parseDay(params.date);
    const seededType =
      typeof params.punchType === 'string' && (PUNCH_TYPES as string[]).includes(params.punchType)
        ? (params.punchType as PunchType)
        : null;
    return {
      day: seededDay && seededDay >= earliest && seededDay <= today ? seededDay : null,
      punchType: seededType,
    };
  }, [route.params, earliest, today]);

  const [punchType, setPunchType] = useState<PunchType | null>(seed.punchType);
  const [day, setDay] = useState<Date>(seed.day ?? today);
  const [time, setTime] = useState<{ h: number; m: number } | null>(null);
  const [reason, setReason] = useState('');

  const [picking, setPicking] = useState<Picking>(null);
  const [reasonFocused, setReasonFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const reasonFocusedRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // The keyboard finishing its slide is when the room left is known; scroll then, so the
  // reason being typed and the Send button both stay above it.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (reasonFocusedRef.current) scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  // ── What has been chosen ────────────────────────────────────────────

  const when = time
    ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.h, time.m, 0, 0)
    : null;

  // The Android time dialog ignores any maximum, so a later-today time can be
  // picked; it is caught here, under the field, instead of by the server.
  const inFuture = when !== null && when.getTime() > Date.now();
  const timeError = inFuture ? 'That time has not happened yet.' : null;

  const missing = !punchType
    ? 'Choose what you missed.'
    : !time
      ? 'Choose the time.'
      : !reason.trim()
        ? 'Give a reason.'
        : null;

  const blocked = missing !== null || inFuture;

  // ── Doing things ────────────────────────────────────────────────────

  const commit = (which: Picking, value: Date) => {
    if (which === 'date') setDay(startOfDay(value));
    else if (which === 'time') setTime({ h: value.getHours(), m: value.getMinutes() });
    setSubmitError(null);
  };

  /** Android only: its own dialog reports Set or Cancel once, and closes itself. */
  const onAndroidPicked = (event: DateTimePickerEvent, value?: Date) => {
    const which = picking;
    setPicking(null);
    if (event.type !== 'set' || !value) return;
    commit(which, value);
  };

  const submit = async () => {
    if (!punchType || !when || blocked || submitting) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await attendanceService.createPunchRequest({
        punchTime: toOffsetIso(when),
        punchType,
        reason: reason.trim(),
      });

      await dialog.notify({
        title: 'Request sent to HR',
        message: 'Your attendance updates once HR approves it.',
        tone: 'success',
      });
      navigation.goBack();
    } catch (err) {
      if (alive.current) setSubmitError(serverMessage(err, 'Could not send the request. Please try again.'));
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  // ── Screen ──────────────────────────────────────────────────────────

  const timePickerValue = () => {
    const value = new Date(day);
    if (time) value.setHours(time.h, time.m, 0, 0);
    else {
      const now = new Date();
      value.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }
    return value;
  };

  const openPicker = (which: Exclude<Picking, null>) => {
    Keyboard.dismiss();
    setPicking(which);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
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
              <Text style={styles.headerTitle}>Missed Punch</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onLayout={() => {
              // The keyboard shrinking the page lands here too, after the listener above
              // on some Android builds; scrolling again then is what actually sticks.
              if (reasonFocusedRef.current) scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <FormCard>
              <FieldLabel>What did you miss?</FieldLabel>
              <PunchTypeGrid
                value={punchType}
                onChange={(next) => {
                  setPunchType(next);
                  setSubmitError(null);
                }}
              />

              <View style={styles.fieldGap} />
              <FieldLabel>Date</FieldLabel>
              <SelectField
                icon="calendar-month-outline"
                value={dayLabel(day)}
                placeholder="Choose a date"
                onPress={() => openPicker('date')}
              />

              <View style={styles.fieldGap} />
              <FieldLabel>Time</FieldLabel>
              <SelectField
                icon="clock-outline"
                value={time ? clockText(time.h, time.m) : null}
                placeholder="Choose the time"
                onPress={() => openPicker('time')}
                invalid={timeError !== null}
              />
              <FieldError message={timeError} />

              <View style={styles.fieldGap} />
              <FieldLabel>Reason</FieldLabel>
              <View style={[styles.textAreaWrap, reasonFocused && styles.textAreaFocused]}>
                <TextInput
                  style={styles.textArea}
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text);
                    setSubmitError(null);
                  }}
                  onFocus={() => {
                    reasonFocusedRef.current = true;
                    setReasonFocused(true);
                  }}
                  onBlur={() => {
                    reasonFocusedRef.current = false;
                    setReasonFocused(false);
                  }}
                  placeholder="e.g. My phone died. I arrived at 8:55 AM."
                  placeholderTextColor={C.muted}
                  multiline
                  maxLength={REASON_MAX}
                  textAlignVertical="top"
                  accessibilityLabel="Reason"
                />
              </View>
              {reason.length >= REASON_COUNTER_FROM ? (
                <Text style={styles.counter}>{reason.length}/{REASON_MAX}</Text>
              ) : null}
            </FormCard>

            {missing && !submitting ? (
              <View style={styles.hint}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.body} />
                <Text style={styles.hintText}>{missing}</Text>
              </View>
            ) : null}

            {submitError ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              icon="send-outline"
              label="Send to HR"
              onPress={() => { void submit(); }}
              loading={submitting}
              disabled={blocked}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {Platform.OS === 'ios' ? (
        <>
          <PickerSheet
            visible={picking === 'date'}
            mode="date"
            title="Date"
            value={day}
            minimumDate={earliest}
            maximumDate={new Date()}
            onCancel={() => setPicking(null)}
            onDone={(value) => {
              setPicking(null);
              commit('date', value);
            }}
          />
          <PickerSheet
            visible={picking === 'time'}
            mode="time"
            title="Time"
            value={timePickerValue()}
            onCancel={() => setPicking(null)}
            onDone={(value) => {
              setPicking(null);
              commit('time', value);
            }}
          />
        </>
      ) : picking === 'date' ? (
        <DateTimePicker
          value={day}
          mode="date"
          display="default"
          onChange={onAndroidPicked}
          minimumDate={earliest}
          maximumDate={new Date()}
        />
      ) : picking === 'time' ? (
        <DateTimePicker value={timePickerValue()} mode="time" display="default" onChange={onAndroidPicked} />
      ) : null}
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

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },

  fieldGap: { height: 10 },

  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textAreaFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 72, maxHeight: 120, fontSize: 15, lineHeight: 21, color: C.ink },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: C.muted, marginTop: 6 },

  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  hintText: { flex: 1, fontSize: 13, color: C.body },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.danger },
});

export default CreatePunchRequestScreen;
