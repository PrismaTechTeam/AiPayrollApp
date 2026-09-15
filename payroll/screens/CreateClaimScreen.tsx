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
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  claimDate,
  claimIcon,
  claimTint,
  claimWash,
  money,
  parseAmount,
  receiptRejectionReason,
} from '../components/claims/ClaimUi';

type Params = { CreateClaim: { claimId?: string } | undefined };

/** The server asks for at least this much explanation, and so does an approver. */
const MIN_DESCRIPTION = 10;

type Field = 'type' | 'amount' | 'description' | 'receipt';

export const CreateClaimScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'CreateClaim'>>();
  const dialog = useDialog();

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

  const [showTypes, setShowTypes] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    type: false, amount: false, description: false, receipt: false,
  });
  const [saving, setSaving] = useState(false);

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
        setTypeId(claim.claimTypeId);
        setAmount(claim.amount > 0 ? claim.amount.toFixed(2) : '');
        const parsed = /^(\d{4})-(\d{2})-(\d{2})/.exec(claim.transDate);
        if (parsed) setTransDate(new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3])));
        setDescription(claim.description ?? '');
        setReceiptNo(claim.receiptNo ?? '');
        setReceiptDate(claim.receiptDate);
        setExistingReceipt(claim.attachmentFileName);
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

  // ── Receipt ────────────────────────────────────────────────────────────

  /**
   * Closing the sheet with nothing chosen is the moment the field counts as
   * answered-and-empty. Marking it on the way in put a red error behind the
   * sheet before the person had been shown a single option.
   */
  const closeTypes = () => {
    setShowTypes(false);
    touch('type');
  };

  const addReceipt = async (source: PickSource) => {
    setShowSource(false);
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
    if (!balance || value === null) return null;
    if (balance.monthlyLimit > 0 && value > balance.monthlyRemaining) {
      return `You have ${money(balance.monthlyRemaining)} left of this month's ${money(balance.monthlyLimit)}. This claim is ${money(value)}.`;
    }
    if (balance.yearlyLimit > 0 && value > balance.yearlyRemaining) {
      return `You have ${money(balance.yearlyRemaining)} left of this year's ${money(balance.yearlyLimit)}. This claim is ${money(value)}.`;
    }
    return null;
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
      navigation.goBack();
    } catch (err) {
      await dialog.notify({
        title: editing ? 'Could not save your changes' : 'Could not send the claim',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const tint = claimTint(selected?.id ?? null);

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
            onAction={() => void load()}
          />
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={12}
          >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* What, and how much */}
              <View style={styles.card}>
                <Text style={styles.label}>What are you claiming for?</Text>
                <TouchableOpacity
                  style={[styles.field, styles.fieldRow, show('type') ? styles.fieldBad : null]}
                  onPress={() => setShowTypes(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  {selected ? (
                    <View style={[styles.typeDot, { backgroundColor: claimWash(tint) }]}>
                      <MaterialCommunityIcons name={claimIcon(selected)} size={18} color={tint} />
                    </View>
                  ) : null}
                  <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
                    {selected ? selected.name : 'Choose a claim type'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
                </TouchableOpacity>
                {show('type') ? <Text style={styles.error}>{errors.type}</Text> : null}

                {balance && (balance.yearlyLimit > 0 || balance.monthlyLimit > 0) ? (
                  <View style={styles.allowance}>
                    <MaterialCommunityIcons name="wallet-outline" size={16} color={C.blue} />
                    <Text style={styles.allowanceText}>
                      {balance.monthlyLimit > 0
                        ? `${money(balance.monthlyRemaining)} left this month`
                        : `${money(balance.yearlyRemaining)} left this year`}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.spacer} />

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
                    accessibilityLabel="Amount in ringgit"
                  />
                </View>
                {show('amount') ? <Text style={styles.error}>{errors.amount}</Text> : null}

                <View style={styles.spacer} />

                <Text style={styles.label}>When you paid</Text>
                <TouchableOpacity
                  style={[styles.field, styles.fieldRow]}
                  onPress={() => setShowDate(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.blue} />
                  <Text style={styles.fieldText}>{claimDate(toIsoDay(transDate))}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
                </TouchableOpacity>
              </View>

              {/* The story behind it */}
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
              </View>

              {/* Proof */}
              <View style={styles.card}>
                <Text style={styles.label}>
                  Receipt {!editing && selected?.requireReceipt ? <Text style={styles.needed}>required</Text> : <Text style={styles.optional}>optional</Text>}
                </Text>

                {editing ? (
                  existingReceipt ? (
                    <>
                      <ReceiptRow fileName={existingReceipt} onOpen={openExisting} hint="Attached when you sent this" />
                      <Text style={styles.note}>A receipt cannot be swapped after the claim is sent. Withdraw it and make a new one if the wrong file went up.</Text>
                    </>
                  ) : (
                    <Text style={styles.note}>No receipt was attached, and one cannot be added after the claim is sent.</Text>
                  )
                ) : file ? (
                  <>
                    {isImage(file.name) ? (
                      <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" />
                    ) : null}
                    <ReceiptRow
                      fileName={file.name}
                      onRemove={() => setFile(null)}
                      hint="Goes up with the claim"
                    />
                  </>
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
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {showDate ? (
        <DateTimePicker
          value={transDate}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, picked) => {
            setShowDate(Platform.OS === 'ios');
            if (picked) setTransDate(picked);
          }}
        />
      ) : null}

      {/* Claim type */}
      <Modal visible={showTypes} transparent animationType="fade" statusBarTranslucent onRequestClose={closeTypes}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTypes} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Claim type</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {(types ?? []).length === 0 ? (
                <Text style={styles.note}>No claim types are set up yet. HR adds these.</Text>
              ) : (
                (types ?? []).map((t, index, all) => {
                  const rowTint = claimTint(t.id);
                  const on = t.id === typeId;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.sheetRow, index < all.length - 1 && styles.sheetDivider]}
                      onPress={() => { setTypeId(t.id); setShowTypes(false); }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <View style={[styles.typeDot, { backgroundColor: claimWash(rowTint) }]}>
                        <MaterialCommunityIcons name={claimIcon(t)} size={18} color={rowTint} />
                      </View>
                      <View style={styles.sheetText}>
                        <Text style={styles.sheetRowTitle} numberOfLines={1}>{t.name}</Text>
                        <Text style={styles.sheetRowMeta} numberOfLines={1}>
                          {t.requireReceipt ? 'Receipt required' : 'Receipt optional'}
                          {t.yearlyLimit ? ` · ${money(t.yearlyLimit)} a year` : ''}
                        </Text>
                      </View>
                      {on ? <MaterialCommunityIcons name="check" size={20} color={C.blue} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={closeTypes} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Where the receipt comes from */}
      <Modal visible={showSource} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowSource(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSource(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Attach a receipt</Text>
            {RECEIPT_SOURCES.map((o, index) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.sheetRow, index < RECEIPT_SOURCES.length - 1 && styles.sheetDivider]}
                onPress={() => { void addReceipt(o.key); }}
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

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  spacer: { height: 16 },

  label: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 8 },
  optional: { fontSize: 12, fontWeight: '600', color: C.muted },
  needed: { fontSize: 12, fontWeight: '700', color: C.blue },

  field: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldBad: { borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  fieldText: { flex: 1, fontSize: 15, color: C.ink },
  placeholder: { color: C.muted },
  multiline: { minHeight: 104 },
  currency: { fontSize: 15, fontWeight: '700', color: C.body },
  amount: { flex: 1, fontSize: 17, fontWeight: '700', color: C.ink, padding: 0, fontVariant: ['tabular-nums'] },
  error: { fontSize: 12, color: C.danger, marginTop: 6, lineHeight: 17 },
  note: { fontSize: 12, color: C.body, lineHeight: 18, marginTop: 8 },

  typeDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  allowance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
  },
  allowanceText: { fontSize: 13, fontWeight: '600', color: C.ink },

  preview: { width: '100%', height: 170, borderRadius: 14, backgroundColor: C.field, marginBottom: 4 },

  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', padding: 16 },
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
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  sheetDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  sheetText: { flex: 1 },
  sheetRowTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  sheetRowMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
});

export default CreateClaimScreen;
