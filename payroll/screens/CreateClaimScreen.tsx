/**
 * New claim, and editing one nobody has decided yet.
 *
 * One screen for both because they are the same eight facts; the only
 * differences are where the first values come from and which verb is on the
 * button. Opened with a claimId, it edits that claim; opened without, it makes
 * a new one.
 *
 * The form answers back in place rather than through a dialog. The version this
 * replaces raised seventeen OS alerts — one per validation rule — so a person
 * who left two fields blank was told about them one modal at a time, and each
 * one hid the field it was talking about.
 *
 * A receipt can only be attached as the claim is created: the API has one
 * multipart action, on create. Editing therefore shows the receipt and says
 * plainly that it cannot be swapped, instead of offering a control that fails.
 *
 * Two cards and a fixed Send button, sized to sit on one phone screen: the form
 * used to run to about 880pt against 760pt of room, so the button that sends it
 * was the one thing on the page you had to scroll to find.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StackActions, usePreventRemove, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import claimService, { ClaimBalance, ClaimType } from '../api/services/claimService';
import { serverMessage } from '../lib/serverMessage';
import { pickFile, type PickSource, type PickedFile } from '../lib/requestAttachments';
import { openSignedUrl } from '../lib/downloadAttachment';
import {
  ClaimState,
  ReceiptButton,
  ReceiptRow,
  allowance,
  allowancePeriod,
  claimDate,
  claimIcon,
  money,
  parseAmount,
  receiptRejectionReason,
  tighterAllowance,
} from '../components/claims/ClaimUi';

type Params = { CreateClaim: { claimId?: string } | undefined };

/** The server asks for at least this much explanation, and so does an approver. */
const MIN_DESCRIPTION = 10;

type Field = 'type' | 'amount' | 'description' | 'receipt';

/**
 * The claim as it was when an edit opened. Two jobs: telling a real change from
 * a look-and-leave before asking "discard?", and knowing how much of the
 * balance's "used" is this very claim.
 */
interface Original {
  typeId: string | null;
  amount: number;
  amountText: string;
  /** YYYY-MM-DD */
  day: string;
  description: string;
  receiptNo: string;
}

export const CreateClaimScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'CreateClaim'>>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();

  const claimId = route.params?.claimId;
  const editing = typeof claimId === 'string' && claimId.length > 0;

  const [types, setTypes] = useState<ClaimType[] | null>(null);
  const [balances, setBalances] = useState<ClaimBalance[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [typeId, setTypeId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [transDate, setTransDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  /** Carried through an edit untouched: the form has no field for it, and
   *  sending nothing back would quietly wipe what HR entered on the web. */
  const [receiptDate, setReceiptDate] = useState<string | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [original, setOriginal] = useState<Original | null>(null);

  const [showTypes, setShowTypes] = useState(false);
  const [showDate, setShowDate] = useState(false);
  /** The iOS wheel's own value, kept apart until Done so Cancel really cancels. */
  const [draftDate, setDraftDate] = useState(new Date());
  const [showSource, setShowSource] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    type: false, amount: false, description: false, receipt: false,
  });
  const [saving, setSaving] = useState(false);

  const pendingSource = useRef<PickSource | null>(null);
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set once the claim is saved, so leaving does not ask "discard?". */
  const leaving = useRef(false);

  useEffect(() => () => {
    if (pickTimer.current) clearTimeout(pickTimer.current);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [typeList, balanceList, claim] = await Promise.all([
        claimService.getTypes(),
        claimService.getBalance().catch(() => [] as ClaimBalance[]),
        editing ? claimService.getApplication(claimId as string) : Promise.resolve(null),
      ]);
      setTypes(typeList);
      setBalances(balanceList);

      if (claim) {
        const amountText = claim.amount > 0 ? claim.amount.toFixed(2) : '';
        const parsed = /^(\d{4})-(\d{2})-(\d{2})/.exec(claim.transDate);
        const day = parsed
          ? new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]))
          : new Date();
        setTypeId(claim.claimTypeId);
        setAmount(amountText);
        setTransDate(day);
        setDescription(claim.description ?? '');
        setReceiptNo(claim.receiptNo ?? '');
        setReceiptDate(claim.receiptDate);
        setExistingReceipt(claim.attachmentFileName);
        setOriginal({
          typeId: claim.claimTypeId,
          amount: claim.amount,
          amountText,
          day: toIsoDay(day),
          description: claim.description ?? '',
          receiptNo: claim.receiptNo ?? '',
        });
      }
    } catch (err) {
      setLoadError(serverMessage(err, editing ? 'Could not open this claim.' : 'Could not load the claim types.'));
      setTypes((prev) => prev ?? []);
    }
  }, [claimId, editing]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => (types ?? []).find((t) => t.id === typeId) ?? null, [types, typeId]);
  const balance = useMemo(
    () => balances.find((b) => b.claimTypeId === typeId) ?? null,
    [balances, typeId],
  );
  const value = parseAmount(amount);

  // ── What is left to claim ──────────────────────────────────────────────

  /**
   * The budget this claim draws on, or null when there is none to check.
   *
   * The balance describes the current month and year. A claim counts against
   * the month it was spent in, so the monthly figure only applies to a date in
   * this month, and the yearly one only to a date in this year; checking a
   * September receipt against October's allowance warned about the wrong month.
   *
   * When editing, the server's "used" already includes this claim, so its
   * original amount is handed back where it was counted -- its own type, its own
   * month and year -- or a description-only edit was told it was over the limit.
   */
  const budget = useMemo(() => {
    if (!balance) return null;
    const now = new Date();
    const thisYear = transDate.getFullYear() === now.getFullYear();
    const thisMonth = thisYear && transDate.getMonth() === now.getMonth();

    let monthCredit = 0;
    let yearCredit = 0;
    if (original && original.typeId === typeId) {
      const [y, m] = original.day.split('-').map(Number);
      if (y === now.getFullYear()) {
        yearCredit = original.amount;
        if (m - 1 === now.getMonth()) monthCredit = original.amount;
      }
    }

    return tighterAllowance(
      thisMonth ? allowance(balance, 'month', monthCredit) : null,
      thisYear ? allowance(balance, 'year', yearCredit) : null,
    );
  }, [balance, transDate, original, typeId]);

  // ── What is wrong, one sentence per field ──────────────────────────────

  const errors = useMemo(() => {
    const map: Partial<Record<Field, string>> = {};
    if (!selected) map.type = 'Choose what you are claiming for.';
    if (amount.trim() === '') map.amount = 'Enter the amount you paid.';
    else if (value === null) map.amount = 'That is not an amount. Use digits, like 42.50.';
    else if (value <= 0) map.amount = 'The amount must be more than zero.';
    if (description.trim().length === 0) map.description = 'Say what this was for.';
    else if (description.trim().length < MIN_DESCRIPTION) {
      map.description = `A little more detail, please — at least ${MIN_DESCRIPTION} characters.`;
    }
    // Only on create: an edit cannot add a receipt, so demanding one would trap
    // the person on a form they have no way of satisfying.
    if (!editing && selected?.requireReceipt && !file) {
      map.receipt = 'This claim type needs a receipt attached.';
    }
    return map;
  }, [selected, amount, value, description, file, editing]);

  const ready = Object.keys(errors).length === 0;
  const show = (field: Field) => (touched[field] ? errors[field] : undefined);
  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  // ── Leaving with something typed ───────────────────────────────────────

  /**
   * A back-swipe, the Android back button or the arrow used to throw away the
   * amount, the description and a just-taken receipt photo without a word.
   * An edit only counts as changed when something differs from what it opened with.
   */
  const dirty = useMemo(() => {
    if (types === null) return false;
    if (editing) {
      if (!original) return false;
      return (
        typeId !== original.typeId
        || amount !== original.amountText
        || toIsoDay(transDate) !== original.day
        || description !== original.description
        || receiptNo !== original.receiptNo
      );
    }
    return (
      typeId !== null
      || amount.trim() !== ''
      || description.trim() !== ''
      || receiptNo.trim() !== ''
      || file !== null
    );
  }, [types, editing, original, typeId, amount, transDate, description, receiptNo, file]);

  usePreventRemove(dirty && !saving, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    void (async () => {
      const discard = await dialog.confirm({
        title: editing ? 'Discard your changes?' : 'Discard this claim?',
        message: editing ? 'The claim stays as it was.' : 'What you have filled in will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
      });
      if (discard) navigation.dispatch(data.action);
    })();
  });

  // ── Type, date and receipt pickers ─────────────────────────────────────

  /**
   * Closing the sheet with nothing chosen is the moment the field counts as
   * answered-and-empty. Marking it on the way in put a red error behind the
   * sheet before the person had been shown a single option.
   */
  const closeTypes = () => {
    setShowTypes(false);
    touch('type');
  };

  const openDate = () => {
    setDraftDate(transDate);
    setShowDate(true);
  };

  const onAndroidDate = (event: DateTimePickerEvent, picked?: Date) => {
    setShowDate(false);
    if (event.type === 'set' && picked) setTransDate(picked);
  };

  const confirmIosDate = () => {
    setTransDate(draftDate);
    setShowDate(false);
  };

  const addReceipt = async (source: PickSource) => {
    let picked: PickedFile | null;
    try {
      picked = await pickFile(source);
    } catch (err) {
      await dialog.notify({ title: 'Cannot open the picker', message: serverMessage(err, 'Please try again.'), tone: 'warning' });
      return;
    }
    if (!picked) return;

    const why = receiptRejectionReason(picked);
    if (why) {
      await dialog.notify({ title: 'That file cannot be attached', message: why, tone: 'warning' });
      return;
    }
    setFile(picked);
    touch('receipt');
  };

  const startPendingPick = () => {
    const source = pendingSource.current;
    pendingSource.current = null;
    if (source) void addReceipt(source);
  };

  /**
   * The picker opens once the sheet has gone, not while it is fading out. iOS
   * will not present the camera, the photo library or the document picker over
   * a modal that is still being dismissed: "Take a photo" did nothing on the
   * first tap, or its promise never settled. iOS says when the sheet is gone
   * (onDismiss); Android has no such event, so it waits out the same fade.
   */
  const chooseSource = (source: PickSource) => {
    pendingSource.current = source;
    setShowSource(false);
    if (Platform.OS !== 'ios') {
      if (pickTimer.current) clearTimeout(pickTimer.current);
      pickTimer.current = setTimeout(startPendingPick, 350);
    }
  };

  /** Opening the receipt already on the claim being edited. */
  const openExisting = async () => {
    if (!editing) return;
    try {
      const link = await claimService.getReceiptLink(claimId as string);
      await openSignedUrl(link.url, link.fileName);
    } catch (err) {
      await dialog.notify({
        title: 'Could not open the receipt',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  // ── Saving ─────────────────────────────────────────────────────────────

  /** The over-limit question, asked once, or null when there is nothing to ask. */
  const overLimitMessage = (): string | null => {
    if (!budget || value === null || value <= budget.remaining) return null;
    const whose = budget.period === 'month' ? "this month's" : "this year's";
    return `You have ${money(budget.remaining)} left of ${whose} ${money(budget.limit)}. This claim is ${money(value)}.`;
  };

  const save = async () => {
    setTouched({ type: true, amount: true, description: true, receipt: true });
    if (!ready || !selected || value === null) return;

    const over = overLimitMessage();
    if (over) {
      const carryOn = await dialog.confirm({
        title: 'Over your limit',
        message: `${over} You can still send it, but it may be turned down.`,
        confirmText: 'Send anyway',
        cancelText: 'Go back',
        tone: 'warning',
      });
      if (!carryOn) return;
    }

    // Midday, so that writing the date out in the phone's own zone cannot land
    // it on the day before.
    const day = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate(), 12);
    const payload = {
      claimTypeId: selected.id,
      transDate: day.toISOString(),
      amount: value,
      description: description.trim(),
      receiptNo: receiptNo.trim() || undefined,
      receiptDate: receiptDate ?? undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await claimService.updateApplication(claimId as string, payload);
      } else if (file) {
        const form = new FormData();
        form.append('claimTypeId', payload.claimTypeId);
        form.append('transDate', payload.transDate);
        form.append('amount', String(payload.amount));
        form.append('description', payload.description);
        if (payload.receiptNo) form.append('receiptNo', payload.receiptNo);
        // The form is built by hand, so every field the JSON body carries has to
        // be repeated here. receiptDate was not, which meant a claim sent with
        // its receipt attached — the ones that actually have a receipt to date —
        // lost the date on the way out. `MobileCreateClaimRequest.ReceiptDate`
        // binds case-insensitively, same as the fields above it.
        if (payload.receiptDate) form.append('receiptDate', payload.receiptDate);
        form.append('receipt', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        await claimService.createApplicationWithAttachment(form);
      } else {
        await claimService.createApplication(payload);
      }
    } catch (err) {
      setSaving(false);
      await dialog.notify({
        title: editing ? 'Could not save your changes' : 'Could not send the claim',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
      return;
    }

    // `saving` stays true from here: the screen is on its way out, and turning
    // it off would re-arm the "discard?" guard during the closing animation.
    leaving.current = true;
    if (editing) {
      navigation.goBack();
    } else {
      // Back to My Claims, where the new claim sits at the top as Pending.
      // Started from Claim Types, plain goBack left the person on the types
      // list with no sign the claim had gone; popTo returns to My Claims when
      // it is underneath, and puts it in this screen's place when it is not.
      navigation.dispatch(StackActions.popTo('Claims'));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  /** A comma can be a decimal point or a thousands mark; say which way it was read. */
  const amountEcho = amount.includes(',') && value !== null && value > 0 ? `Reads as ${money(value)}` : null;
  const sheetBottom = { paddingBottom: Math.max(insets.bottom, 16) };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
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
            <Text style={styles.headerTitle}>{editing ? 'Edit claim' : 'New claim'}</Text>
          </View>
        </View>

        {types === null ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : loadError && types.length === 0 ? (
          <ClaimState
            icon="cloud-off-outline"
            title="Could not load the form"
            body={loadError}
            tone="danger"
            actionLabel="Try again"
            onAction={() => {
              setTypes(null);
              void load();
            }}
          />
        ) : types.length === 0 ? (
          // Without a single type there is nothing the form could send, and the
          // person used to learn that only after typing the whole claim out.
          <ClaimState
            icon="tag-outline"
            title="Nothing to claim yet"
            body="HR has not set up any claim types."
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            // Padding on Android too: the app draws edge-to-edge, and in that mode
            // adjustResize no longer shrinks the window, so without it the keyboard
            // sat over "What was it for?" and the Send button.
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* What, how much, and when */}
              <View style={styles.card}>
                <Text style={styles.label}>What are you claiming for?</Text>
                <TouchableOpacity
                  style={[styles.field, styles.fieldRow, show('type') ? styles.fieldBad : null]}
                  onPress={() => setShowTypes(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  {selected ? (
                    <View style={styles.typeDot}>
                      <MaterialCommunityIcons name={claimIcon(selected)} size={16} color={C.body} />
                    </View>
                  ) : null}
                  <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
                    {selected ? selected.name : 'Choose a claim type'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
                </TouchableOpacity>
                {show('type') ? <Text style={styles.error}>{errors.type}</Text> : null}

                {budget ? (
                  <View style={styles.allowance}>
                    <MaterialCommunityIcons name="wallet-outline" size={16} color={C.blue} />
                    <Text style={styles.allowanceText} numberOfLines={1}>
                      {money(budget.remaining)} left {allowancePeriod(budget)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.spacer} />

                <View style={styles.pair}>
                  <View style={styles.pairHalf}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={[styles.field, styles.fieldRow, show('amount') ? styles.fieldBad : null]}>
                      <Text style={styles.currency}>RM</Text>
                      <TextInput
                        style={styles.amount}
                        value={amount}
                        onChangeText={setAmount}
                        onBlur={() => touch('amount')}
                        placeholder="0.00"
                        placeholderTextColor={C.muted}
                        keyboardType="decimal-pad"
                        maxLength={13}
                        accessibilityLabel="Amount in ringgit"
                      />
                    </View>
                  </View>

                  <View style={styles.pairHalf}>
                    <Text style={styles.label}>When you paid</Text>
                    <TouchableOpacity
                      style={[styles.field, styles.fieldRow]}
                      onPress={openDate}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`When you paid, ${claimDate(toIsoDay(transDate))}`}
                    >
                      <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={C.blue} />
                      <Text style={styles.fieldText} numberOfLines={1}>{claimDate(toIsoDay(transDate))}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {show('amount') ? (
                  <Text style={styles.error}>{errors.amount}</Text>
                ) : amountEcho ? (
                  <Text style={styles.echo}>{amountEcho}</Text>
                ) : null}
              </View>

              {/* The story behind it, and the proof */}
              <View style={styles.card}>
                <Text style={styles.label}>What was it for?</Text>
                <TextInput
                  style={[styles.field, styles.multiline, show('description') ? styles.fieldBad : null]}
                  value={description}
                  onChangeText={setDescription}
                  onBlur={() => touch('description')}
                  placeholder="e.g. Taxi from the airport to the client's office"
                  placeholderTextColor={C.muted}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                {show('description') ? <Text style={styles.error}>{errors.description}</Text> : null}

                <View style={styles.spacer} />

                <Text style={styles.label}>Receipt number <Text style={styles.optional}>optional</Text></Text>
                <TextInput
                  style={styles.field}
                  value={receiptNo}
                  onChangeText={setReceiptNo}
                  placeholder="From the receipt, if it has one"
                  placeholderTextColor={C.muted}
                  maxLength={60}
                />

                <View style={styles.spacer} />

                <Text style={styles.label}>
                  Receipt{' '}
                  {editing ? null : selected?.requireReceipt ? (
                    <Text style={styles.needed}>required</Text>
                  ) : (
                    <Text style={styles.optional}>optional</Text>
                  )}
                </Text>

                {editing ? (
                  existingReceipt ? (
                    <ReceiptRow fileName={existingReceipt} onOpen={openExisting} hint="Can't be changed after sending" />
                  ) : (
                    <Text style={styles.note} numberOfLines={1}>None attached — can't be added after sending.</Text>
                  )
                ) : file ? (
                  <ReceiptRow
                    fileName={file.name}
                    thumbUri={isImage(file.name) ? file.uri : undefined}
                    onRemove={() => setFile(null)}
                    hint="Goes up with the claim"
                  />
                ) : (
                  <>
                    <ReceiptButton onPress={() => setShowSource(true)} />
                    {show('receipt') ? <Text style={styles.error}>{errors.receipt}</Text> : null}
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <PrimaryButton
                icon={editing ? 'content-save-outline' : 'send-outline'}
                label={editing ? 'Save changes' : 'Send claim'}
                onPress={() => { void save(); }}
                loading={saving}
                compact
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {/* Android draws its own date dialog; the element only has to exist. */}
      {Platform.OS === 'android' && showDate ? (
        <DateTimePicker
          value={transDate}
          mode="date"
          maximumDate={new Date()}
          display="default"
          onChange={onAndroidDate}
        />
      ) : null}

      {/* iOS has no dialog of its own. The wheel used to be dropped under the
          form with no way to close it, and in dark mode its white text sat on
          this light page; it now lives in a sheet with a Done button and is held
          to the light look the rest of the app uses. */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDate} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowDate(false)}>
          <View style={[styles.sheetBackdrop, sheetBottom]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDate(false)} accessibilityLabel="Dismiss" />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>When you paid</Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                themeVariant="light"
                textColor={C.ink}
                onChange={(_event, picked) => { if (picked) setDraftDate(picked); }}
                style={styles.wheel}
              />
              <PrimaryButton label="Done" onPress={confirmIosDate} compact />
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowDate(false)} accessibilityRole="button">
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Claim type */}
      <Modal visible={showTypes} transparent animationType="fade" statusBarTranslucent onRequestClose={closeTypes}>
        <View style={[styles.sheetBackdrop, sheetBottom]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTypes} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Claim type</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {(types ?? []).map((t, index, all) => {
                const on = t.id === typeId;
                // This person's own limits where HR set them, the type's default otherwise.
                const own = balances.find((b) => b.claimTypeId === t.id);
                const yearly = own ? own.yearlyLimit : t.yearlyLimit;
                const monthly = own ? own.monthlyLimit : t.monthlyLimit;
                const limit = yearly && yearly > 0
                  ? ` · ${money(yearly)} a year`
                  : monthly && monthly > 0
                    ? ` · ${money(monthly)} a month`
                    : '';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.sheetRow, index < all.length - 1 && styles.sheetDivider]}
                    onPress={() => { setTypeId(t.id); setShowTypes(false); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={styles.typeDot}>
                      <MaterialCommunityIcons name={claimIcon(t)} size={16} color={C.body} />
                    </View>
                    <View style={styles.sheetText}>
                      <Text style={styles.sheetRowTitle} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.sheetRowMeta} numberOfLines={1}>
                        {t.requireReceipt ? 'Receipt required' : 'Receipt optional'}
                        {limit}
                      </Text>
                    </View>
                    {on ? <MaterialCommunityIcons name="check" size={20} color={C.blue} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={closeTypes} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Where the receipt comes from */}
      <Modal
        visible={showSource}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSource(false)}
        onDismiss={Platform.OS === 'ios' ? startPendingPick : undefined}
      >
        <View style={[styles.sheetBackdrop, sheetBottom]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSource(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Attach a receipt</Text>
            {RECEIPT_SOURCES.map((o, index) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.sheetRow, index < RECEIPT_SOURCES.length - 1 && styles.sheetDivider]}
                onPress={() => chooseSource(o.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.sourceIcon}>
                  <MaterialCommunityIcons name={o.icon} size={22} color={C.blue} />
                </View>
                <View style={styles.sheetText}>
                  <Text style={styles.sheetRowTitle}>{o.title}</Text>
                  <Text style={styles.sheetRowMeta}>{o.hint}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSource(false)} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const RECEIPT_SOURCES = [
  { key: 'camera' as PickSource, icon: 'camera-outline' as const, title: 'Take a photo', hint: 'Photograph the receipt now' },
  { key: 'library' as PickSource, icon: 'image-outline' as const, title: 'Choose a photo', hint: 'From your gallery' },
  { key: 'document' as PickSource, icon: 'file-pdf-box' as const, title: 'Choose a PDF', hint: 'An emailed or downloaded receipt' },
];

function isImage(name: string): boolean {
  return /\.(jpe?g|png)$/i.test(name);
}

function toIsoDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 12, paddingTop: 2 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  spacer: { height: 10 },
  pair: { flexDirection: 'row', gap: 10 },
  pairHalf: { flex: 1, minWidth: 0 },

  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 6 },
  optional: { fontSize: 12, fontWeight: '600', color: C.muted },
  needed: { fontSize: 12, fontWeight: '700', color: C.blue },

  field: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.ink,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldBad: { borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  fieldText: { flex: 1, fontSize: 15, color: C.ink },
  placeholder: { color: C.muted },
  multiline: { minHeight: 72 },
  currency: { fontSize: 15, fontWeight: '700', color: C.body },
  amount: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: '700', color: C.ink, padding: 0, fontVariant: ['tabular-nums'] },
  error: { fontSize: 12, color: C.danger, marginTop: 6, lineHeight: 17 },
  echo: { fontSize: 12, fontWeight: '600', color: C.blue, marginTop: 6 },
  note: { fontSize: 12, color: C.body, lineHeight: 18 },

  // The neutral disc the claim lists use: the icon tells the types apart, so no pastel per type.
  typeDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center' },

  allowance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 8,
  },
  allowanceText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.ink },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetScroll: { maxHeight: 320 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 52 },
  sheetDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  sheetText: { flex: 1 },
  sheetRowTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  sheetRowMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
  wheel: { alignSelf: 'stretch', height: 216, marginBottom: 8, backgroundColor: '#FFFFFF' },
});

export default CreateClaimScreen;
