/**
 * Apply for Leave.
 *
 * The form asks for as little as the chosen leave type allows and no more. A
 * half-day switch appears only where the type permits half days; the hourly
 * controls only where it permits hours; the attachment card only where it wants
 * evidence. A type that uses none of them gets four rows and a button.
 *
 * Two things it deliberately does not do for itself. It does not count the days
 * — weekends, public holidays and the employee's own shift roster decide that,
 * none of which the phone holds, so it asks the server and shows that answer.
 * And it does not decide what is allowed: every rule on the leave type is
 * checked by the same server code that will check it again on submit, so a
 * refusal appears under the field that caused it while there is still time to
 * change it, rather than as a message box after a round trip.
 *
 * The balance comes from the employee's entitlements, which is what My Leaves
 * shows. The old form read /leave/balance, a table the entitlement engine never
 * writes, and printed numbers that belonged to nobody.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import leaveService, {
  LeavePreview,
  LeaveType,
  MyLeaveEntitlement,
} from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import {
  formatBytes,
  iconForFile,
  pickFile,
  rejectionReason,
  type PickSource,
  type PickedFile,
} from '../lib/requestAttachments';
import { AttachButton, PickSourceSheet } from '../components/requests/RequestUi';
import {
  BalanceNote,
  DayTally,
  FieldError,
  FieldLabel,
  FormCard,
  LeaveState,
  LeaveTypeOption,
  Segmented,
  SelectField,
  SwitchRow,
} from '../components/leave/LeaveUi';

type Params = { CreateLeave: { leaveTypeId?: string } | undefined };

const HALVES = [
  { key: 'AM', label: 'Morning' },
  { key: 'PM', label: 'Afternoon' },
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A calendar day as the server stores it. Built from the local components on
 * purpose: toISOString() converts to UTC first, which moves the date back a day
 * for anyone east of Greenwich — the old form's dates were off by one all
 * evening in Malaysia.
 */
function toYmd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function fromYmd(value: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "12 Mar 2026". Written out rather than localised, so the range reads the same everywhere. */
function prettyDay(value: string | null): string | null {
  const d = fromYmd(value);
  return d ? `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}` : null;
}

function toHm(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

/** 09:30 → "9:30 AM". The picker gives 24h on Android and the form reads better in 12h. */
function prettyTime(value: string | null): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${match[2]} ${suffix}`;
}

function monthsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const joined = new Date(iso);
  if (Number.isNaN(joined.getTime())) return null;
  return Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

type Load =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'failed'; message: string };

type Picking = 'start' | 'end' | 'startTime' | 'endTime' | null;

export const CreateLeaveScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'CreateLeave'>>();
  const dialog = useDialog();
  const { employee } = usePayrollAuth();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [entitlements, setEntitlements] = useState<MyLeaveEntitlement[]>([]);
  const [entitlementYear, setEntitlementYear] = useState(() => new Date().getFullYear());

  const [typeId, setTypeId] = useState<string | null>(route.params?.leaveTypeId ?? null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [halfStart, setHalfStart] = useState(false);
  const [halfEnd, setHalfEnd] = useState(false);
  const [startPeriod, setStartPeriod] = useState('PM');
  const [endPeriod, setEndPeriod] = useState('AM');
  const [hourly, setHourly] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [reason, setReason] = useState('');

  const [typeSheet, setTypeSheet] = useState(false);
  const [sourceSheet, setSourceSheet] = useState(false);
  const [picking, setPicking] = useState<Picking>(null);
  const [reasonFocused, setReasonFocused] = useState(false);

  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // ── Loading ─────────────────────────────────────────────────────────

  const loadFor = useCallback(async (year: number) => {
    // Both lists matter and neither is useful alone: the entitlements decide
    // which types this employee may take and what is left of each, the types
    // carry the rules the form has to respect.
    const [typeList, mine] = await Promise.all([
      leaveService.getLeaveTypes(),
      leaveService.getMyEntitlements(year),
    ]);
    if (!alive.current) return;
    setTypes(typeList);
    setEntitlements(mine.items);
    setEntitlementYear(year);
  }, []);

  const reload = useCallback(async () => {
    setLoad({ kind: 'loading' });
    try {
      await loadFor(new Date().getFullYear());
      if (alive.current) setLoad({ kind: 'ready' });
    } catch (err) {
      if (alive.current) setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your leave types.') });
    }
  }, [loadFor]);

  useEffect(() => { void reload(); }, [reload]);

  // Leave booked into next year is charged against next year's allowance, so the
  // balance on screen has to follow the dates rather than the calendar.
  useEffect(() => {
    const year = fromYmd(startDate)?.getFullYear();
    if (load.kind !== 'ready' || !year || year === entitlementYear) return;
    void loadFor(year).catch(() => undefined);
  }, [startDate, entitlementYear, load.kind, loadFor]);

  // ── What the chosen type allows ─────────────────────────────────────

  const type = useMemo(() => types.find((t) => t.id === typeId) ?? null, [types, typeId]);
  const entitlement = useMemo(
    () => entitlements.find((e) => e.leaveTypeId === typeId) ?? null,
    [entitlements, typeId],
  );

  /**
   * The types this employee may pick. The entitlement list is the employee's own
   * set (HR's leave package decides it); the type list says which are still
   * offered. A type in one and not the other belongs in neither.
   */
  const options = useMemo(() => {
    const active = new Set(types.filter((t) => t.isActive).map((t) => t.id));
    return entitlements.filter((e) => active.has(e.leaveTypeId));
  }, [entitlements, types]);

  /**
   * Whether the employee is eligible for a type at all, answered before any
   * dates are entered — the two rules that depend on the person rather than on
   * the request. Being told after filling in a week of dates that the type was
   * never open to you is the worst version of this.
   */
  const eligibility = useCallback(
    (candidate: LeaveType | null): string | null => {
      if (!candidate) return null;

      const gender = (employee?.gender ?? '').trim();
      if (candidate.genderRestriction && gender
        && candidate.genderRestriction.toUpperCase() !== gender.toUpperCase()) {
        return `Only for ${candidate.genderRestriction.toUpperCase() === 'M' ? 'male' : 'female'} employees`;
      }

      const served = monthsSince(employee?.joinDate);
      if (candidate.minServiceMonths > 0 && served !== null && served < candidate.minServiceMonths) {
        return `Needs ${candidate.minServiceMonths} months of service — you have ${served}`;
      }

      return null;
    },
    [employee?.gender, employee?.joinDate],
  );

  const singleDay = startDate !== null && startDate === endDate;
  const canHalfDay = type?.allowHalfDay === true && !hourly;
  const canHourly = type?.allowHourly === true && singleDay;
  const wantsAttachment = type?.requireAttachment === true;

  // A type that forbids what was switched on has to clear it, or the form would
  // submit a half day the server will refuse and the switch nobody can see.
  useEffect(() => {
    if (!type) return;
    if (!type.allowHalfDay) { setHalfStart(false); setHalfEnd(false); }
    if (!type.allowHourly) { setHourly(false); setStartTime(null); setEndTime(null); }
    if (!type.requireAttachment) setFile(null);
  }, [type]);

  useEffect(() => {
    if (!canHourly && hourly) { setHourly(false); setStartTime(null); setEndTime(null); }
  }, [canHourly, hourly]);

  useEffect(() => {
    if (hourly) { setHalfStart(false); setHalfEnd(false); }
  }, [hourly]);

  // On one day there is one half to choose, not two.
  useEffect(() => {
    if (singleDay && halfEnd) setHalfEnd(false);
  }, [singleDay, halfEnd]);

  // ── The server's verdict ────────────────────────────────────────────

  const previewKey = [
    typeId, startDate, endDate,
    halfStart, halfEnd, startPeriod, endPeriod,
    hourly, startTime, endTime, file !== null,
  ].join('|');

  useEffect(() => {
    if (!typeId || !startDate || !endDate) {
      setPreview(null);
      setPreviewError(null);
      return undefined;
    }

    // Every keystroke on a date picker would otherwise be a round trip.
    let cancelled = false;
    setPreviewing(true);
    // The old verdict belonged to the old dates. Keeping it would leave a refusal
    // sitting under a field the person has just corrected.
    setPreview(null);
    const timer = setTimeout(async () => {
      try {
        const result = await leaveService.previewApplication({
          leaveTypeId: typeId,
          startDate,
          endDate,
          isHalfDayStart: halfStart,
          isHalfDayEnd: halfEnd,
          startDayPeriod: halfStart ? startPeriod : undefined,
          endDayPeriod: halfEnd ? endPeriod : undefined,
          startTime: hourly && startTime ? startTime : undefined,
          endTime: hourly && endTime ? endTime : undefined,
          hasAttachment: file !== null,
        });
        if (cancelled || !alive.current) return;
        setPreview(result);
        setPreviewError(null);
      } catch (err) {
        if (cancelled || !alive.current) return;
        setPreview(null);
        setPreviewError(serverMessage(err, 'Could not work out how long this leave is.'));
      } finally {
        if (!cancelled && alive.current) setPreviewing(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setPreviewing(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  /** The server's refusals, one per field, so each lands under its own control. */
  const issues = useMemo(() => {
    const map: Record<string, string> = {};
    (preview?.issues ?? []).forEach((issue) => {
      if (!map[issue.field]) map[issue.field] = issue.message;
    });
    return map;
  }, [preview]);

  const typeBlock = eligibility(type);
  const typeError = typeBlock ?? issues.leaveType ?? null;
  const dateError = issues.dates ?? issues.startDate ?? null;
  const attachmentError = issues.attachment ?? null;

  const missing = !typeId
    ? 'Choose a leave type.'
    : !startDate
      ? 'Choose the first day.'
      : !endDate
        ? 'Choose the last day.'
        : hourly && (!startTime || !endTime)
          ? 'Give the hours you will be away.'
          : null;

  // A preview that failed to arrive does not block anything: the server checks
  // the same rules again on submit and will say so then. Blocking on a network
  // hiccup would mean nobody could apply for leave while the preview is down.
  const blocked = missing !== null
    || typeBlock !== null
    || previewing
    || (preview !== null && preview.issues.length > 0);

  // ── Doing things ────────────────────────────────────────────────────

  /**
   * Which half a half-day means, before anyone chooses.
   * On a single day people take the morning; at the front of a longer range
   * they work the morning and leave after lunch.
   */
  const turnOnHalfStart = (next: boolean) => {
    setHalfStart(next);
    if (next) setStartPeriod(singleDay ? 'AM' : 'PM');
  };

  const chooseType = (item: MyLeaveEntitlement) => {
    setTypeId(item.leaveTypeId);
    setTypeSheet(false);
    setSubmitError(null);
  };

  const onDatePicked = (event: { type?: string }, value?: Date) => {
    const which = picking;
    // Android draws its own dialog and reports the dismissal; iOS keeps the
    // spinner on screen until it is closed from here.
    if (Platform.OS !== 'ios') setPicking(null);
    if (event?.type === 'dismissed' || !value) return;

    if (which === 'start') {
      const next = toYmd(value);
      setStartDate(next);
      // A range that runs backwards is a slip, not a request; the second date
      // moves with the first instead of being refused.
      if (!endDate || endDate < next) setEndDate(next);
    } else if (which === 'end') {
      setEndDate(toYmd(value));
    } else if (which === 'startTime') {
      setStartTime(toHm(value));
    } else if (which === 'endTime') {
      setEndTime(toHm(value));
    }
    if (Platform.OS === 'ios') setPicking(null);
    setSubmitError(null);
  };

  const addFile = async (source: PickSource) => {
    setSourceSheet(false);
    let picked: PickedFile | null;
    try {
      picked = await pickFile(source);
    } catch (err) {
      await dialog.notify({
        title: 'Cannot open the picker',
        message: serverMessage(err, 'Please try again.'),
        tone: 'warning',
      });
      return;
    }
    if (!picked) return;

    const why = rejectionReason(picked);
    if (why) {
      await dialog.notify({ title: 'That file cannot be attached', message: why, tone: 'warning' });
      return;
    }
    setFile(picked);
    setSubmitError(null);
  };

  /**
   * There is no draft half to this any more, and there never really was one.
   *
   * The button beside this one saved the application as a DRAFT and promised
   * "you can finish it later from your leave history" — which the backend
   * cannot honour. UpdateLeaveApplicationAsync never changes Status, the mobile
   * controller exposes no PUT or DELETE for an application, and withdraw is
   * PENDING-only, so a draft could never be submitted, edited or deleted from
   * the phone. It was a one-way door into a record the employee could only
   * look at. Rather than build a draft flow the server cannot support, the
   * button and its promise are gone; existing drafts still show in the history.
   */
  const submit = async () => {
    if (!typeId || !startDate || !endDate) return;
    setSubmitError(null);
    setSubmitting(true);

    const payload = {
      leaveTypeId: typeId,
      startDate,
      endDate,
      isHalfDayStart: halfStart,
      isHalfDayEnd: halfEnd,
      startDayPeriod: halfStart ? startPeriod : undefined,
      endDayPeriod: halfEnd ? endPeriod : undefined,
      startTime: hourly && startTime ? startTime : undefined,
      endTime: hourly && endTime ? endTime : undefined,
      reason: reason.trim(),
      isDraft: false,
    };

    try {
      // The file travels with the application rather than after it: a leave type
      // that requires evidence would refuse a creation that arrived without any.
      if (file) {
        await leaveService.createApplicationWithAttachment(payload, {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
        });
      } else {
        await leaveService.createApplication(payload);
      }

      await dialog.notify({
        title: 'Leave applied for',
        message: 'Your approver will be notified and you will see the answer here.',
        tone: 'success',
      });
      navigation.goBack();
    } catch (err) {
      setSubmitError(serverMessage(err, 'Could not send the leave request. Please try again.'));
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  // ── Screen ──────────────────────────────────────────────────────────

  const pickerValue = picking === 'end'
    ? fromYmd(endDate) ?? fromYmd(startDate) ?? new Date()
    : fromYmd(startDate) ?? new Date();

  const timePickerValue = () => {
    const source = picking === 'endTime' ? endTime : startTime;
    const match = /^(\d{2}):(\d{2})$/.exec(source ?? '');
    const now = new Date();
    if (!match) return now;
    now.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return now;
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
              <Text style={styles.headerTitle}>Apply for Leave</Text>
            </View>
          </View>

          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <View style={styles.flex}>
              <LeaveState
                icon="cloud-off-outline"
                title="Could not load your leave types"
                body={load.message}
                tone="danger"
                onRetry={() => void reload()}
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* What kind of leave */}
              <FormCard>
                <FieldLabel>Leave type</FieldLabel>
                <SelectField
                  icon="palm-tree"
                  value={entitlement?.description ?? null}
                  placeholder={options.length === 0 ? 'No leave types are set up for you' : 'Choose a leave type'}
                  onPress={() => setTypeSheet(true)}
                  disabled={options.length === 0}
                  invalid={typeError !== null}
                />
                {entitlement && !typeError ? <BalanceNote item={entitlement} /> : null}
                <FieldError message={typeError} />
              </FormCard>

              {/* When */}
              <FormCard>
                <FieldLabel>First day</FieldLabel>
                <SelectField
                  icon="calendar-start"
                  value={prettyDay(startDate)}
                  placeholder="Choose a date"
                  onPress={() => setPicking('start')}
                  invalid={dateError !== null}
                />

                <FieldLabel>Last day</FieldLabel>
                <SelectField
                  icon="calendar-end"
                  value={prettyDay(endDate)}
                  placeholder="Choose a date"
                  onPress={() => setPicking('end')}
                  disabled={!startDate}
                  invalid={dateError !== null || issues.endDate !== undefined}
                />
                <FieldError message={dateError ?? issues.endDate ?? null} />

                {/* Only where the type says so. */}
                {canHourly ? (
                  <>
                    <View style={styles.rule} />
                    <SwitchRow label="Just a few hours" value={hourly} onChange={setHourly} />
                  </>
                ) : null}

                {hourly ? (
                  <View style={styles.pair}>
                    <View style={styles.pairHalf}>
                      <FieldLabel>From</FieldLabel>
                      <SelectField
                        icon="clock-outline"
                        value={prettyTime(startTime)}
                        placeholder="Start"
                        onPress={() => setPicking('startTime')}
                        invalid={issues.time !== undefined}
                      />
                    </View>
                    <View style={styles.pairHalf}>
                      <FieldLabel>To</FieldLabel>
                      <SelectField
                        icon="clock-outline"
                        value={prettyTime(endTime)}
                        placeholder="End"
                        onPress={() => setPicking('endTime')}
                        invalid={issues.time !== undefined}
                      />
                    </View>
                  </View>
                ) : null}
                <FieldError message={issues.time ?? null} />

                {canHalfDay && startDate ? (
                  <>
                    <View style={styles.rule} />
                    <SwitchRow
                      label={singleDay ? 'Half day only' : 'First day is a half day'}
                      value={halfStart}
                      onChange={turnOnHalfStart}
                    />
                    {halfStart ? (
                      <Segmented options={HALVES} value={startPeriod} onChange={setStartPeriod} />
                    ) : null}

                    {!singleDay ? (
                      <>
                        <SwitchRow
                          label="Last day is a half day"
                          value={halfEnd}
                          onChange={setHalfEnd}
                        />
                        {halfEnd ? (
                          <Segmented options={HALVES} value={endPeriod} onChange={setEndPeriod} />
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}
                <FieldError message={issues.halfDay ?? null} />
              </FormCard>

              {/* What it costs — the server's figure, not a date subtraction. */}
              {typeId && startDate && endDate ? (
                <>
                  <DayTally
                    state={previewing ? 'busy' : preview ? 'ready' : 'blank'}
                    days={preview?.totalDays}
                    hours={preview?.totalHours ?? null}
                    excluded={preview?.excludedHolidays}
                  />
                  <FieldError message={issues.balance ?? previewError} />
                </>
              ) : null}

              {/* Evidence, only for types that ask for it. */}
              {wantsAttachment ? (
                <FormCard title="Supporting document" icon="paperclip">
                  {file ? (
                    <View style={styles.fileRow}>
                      <View style={styles.fileIcon}>
                        <MaterialCommunityIcons name={iconForFile(file.name)} size={22} color={C.blue} />
                      </View>
                      <View style={styles.fileText}>
                        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.fileMeta}>
                          {file.size != null ? formatBytes(file.size) : 'Ready to upload'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFile(null)}
                        style={styles.fileRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${file.name}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <AttachButton
                      onPress={() => setSourceSheet(true)}
                      disabled={submitting}
                      label={preview?.requiresAttachment ? 'Attach the certificate' : 'Add a file'}
                    />
                  )}
                  <FieldError message={attachmentError} />
                </FormCard>
              ) : null}

              {/* Why */}
              <FormCard>
                <FieldLabel>Reason</FieldLabel>
                <View style={[styles.textAreaWrap, reasonFocused && styles.textAreaFocused]}>
                  <TextInput
                    style={styles.textArea}
                    value={reason}
                    onChangeText={setReason}
                    onFocus={() => setReasonFocused(true)}
                    onBlur={() => setReasonFocused(false)}
                    placeholder="Say why, so your approver does not have to ask."
                    placeholderTextColor={C.muted}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>
                <Text style={styles.counter}>{reason.length}/500</Text>
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
                label="Apply for leave"
                onPress={() => { void submit(); }}
                loading={submitting}
                disabled={blocked}
              />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Leave type picker */}
      <Modal visible={typeSheet} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setTypeSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypeSheet(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Leave type</Text>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {options.map((item, index) => (
                <LeaveTypeOption
                  key={item.leaveTypeId}
                  item={item}
                  selected={item.leaveTypeId === typeId}
                  blockedReason={eligibility(types.find((t) => t.id === item.leaveTypeId) ?? null)}
                  onPress={() => chooseType(item)}
                  last={index === options.length - 1}
                />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setTypeSheet(false)} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PickSourceSheet
        visible={sourceSheet}
        onClose={() => setSourceSheet(false)}
        onPick={(source) => { void addFile(source); }}
      />

      {picking === 'start' || picking === 'end' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDatePicked}
          minimumDate={picking === 'end' ? fromYmd(startDate) ?? undefined : undefined}
        />
      ) : null}

      {picking === 'startTime' || picking === 'endTime' ? (
        <DateTimePicker
          value={timePickerValue()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDatePicked}
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

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  rule: { height: 1, backgroundColor: C.line, marginTop: 14, marginBottom: 4 },
  pair: { flexDirection: 'row', gap: 12 },
  pairHalf: { flex: 1 },

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

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center' },

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

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    maxHeight: '72%',
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 4 },
  sheetList: { flexGrow: 0 },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
});

export default CreateLeaveScreen;
