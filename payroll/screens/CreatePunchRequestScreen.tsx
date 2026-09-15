/**
 * New Punch Request — "I forgot to clock in (or out)".
 *
 * Four things and a button: which punch, the day, the time, and why. The day
 * starts on today because that is when most people notice; the time starts
 * empty because a pre-filled "now" is exactly the wrong answer for a punch that
 * was missed hours ago, and it would go through unread.
 *
 * Nothing here touches the work card. The request waits for HR, and the list it
 * returns to is where the answer appears.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { FieldError, FieldLabel, FormCard, SelectField } from '../components/leave/LeaveUi';
import { PunchTypeGrid, clockText, dayLabel, toOffsetIso } from '../components/attendance/PunchRequestUi';
import attendanceService, { PunchType } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';

/** The server refuses anything older than this. The date picker stops there too. */
const DAYS_BACK = 60;
const REASON_MAX = 500;

type Picking = 'date' | 'time' | null;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const CreatePunchRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const today = useRef(startOfDay(new Date())).current;
  const earliest = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate() - DAYS_BACK),
    [today],
  );

  const [punchType, setPunchType] = useState<PunchType | null>(null);
  const [day, setDay] = useState<Date>(today);
  const [time, setTime] = useState<{ h: number; m: number } | null>(null);
  const [reason, setReason] = useState('');

  const [picking, setPicking] = useState<Picking>(null);
  const [reasonFocused, setReasonFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

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

  const onPicked = (event: { type?: string }, value?: Date) => {
    const which = picking;
    // Android draws its own dialog and reports the dismissal; iOS keeps the
    // spinner on screen until it is closed from here.
    if (Platform.OS !== 'ios') setPicking(null);
    if (event?.type === 'dismissed' || !value) return;

    if (which === 'date') setDay(startOfDay(value));
    else if (which === 'time') setTime({ h: value.getHours(), m: value.getMinutes() });

    if (Platform.OS === 'ios') setPicking(null);
    setSubmitError(null);
  };

  const submit = async () => {
    if (!punchType || !when || blocked || submitting) return;
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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
              <Text style={styles.headerTitle}>New Request</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Which punch */}
            <FormCard>
              <FieldLabel>What did you miss?</FieldLabel>
              <PunchTypeGrid
                value={punchType}
                onChange={(next) => {
                  setPunchType(next);
                  setSubmitError(null);
                }}
              />
            </FormCard>

            {/* When */}
            <FormCard>
              <FieldLabel>Date</FieldLabel>
              <SelectField
                icon="calendar-month-outline"
                value={dayLabel(day)}
                placeholder="Choose a date"
                onPress={() => setPicking('date')}
              />

              <FieldLabel>Time</FieldLabel>
              <SelectField
                icon="clock-outline"
                value={time ? clockText(time.h, time.m) : null}
                placeholder="Choose the time"
                onPress={() => setPicking('time')}
                invalid={timeError !== null}
              />
              <FieldError message={timeError} />
            </FormCard>

            {/* Why */}
            <FormCard>
              <FieldLabel>Reason</FieldLabel>
              <View style={[styles.textAreaWrap, reasonFocused && styles.textAreaFocused]}>
                <TextInput
                  style={styles.textArea}
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text);
                    setSubmitError(null);
                  }}
                  onFocus={() => setReasonFocused(true)}
                  onBlur={() => setReasonFocused(false)}
                  placeholder="Say what happened, so HR does not have to ask."
                  placeholderTextColor={C.muted}
                  multiline
                  maxLength={REASON_MAX}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.counter}>{reason.length}/{REASON_MAX}</Text>
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

      {picking === 'date' ? (
        <DateTimePicker
          value={day}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPicked}
          minimumDate={earliest}
          maximumDate={new Date()}
        />
      ) : null}

      {picking === 'time' ? (
        <DateTimePicker
          value={timePickerValue()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPicked}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 96, fontSize: 15, lineHeight: 22, color: C.ink },
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
