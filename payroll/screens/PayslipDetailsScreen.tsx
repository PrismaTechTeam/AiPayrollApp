/**
 * One payslip, in full.
 *
 * The sections, their order, their labels and the dash-for-zero rule all come
 * from the server, which builds them from the same object it renders the PDF
 * from — so this screen and the file an employee downloads cannot disagree, and
 * neither can disagree with what HR sees in the web app. Nothing on this page
 * decides which rows are worth showing.
 *
 * It is laid out as the document rather than as a feed of cards: company header,
 * title bar, identity, the two money columns, overtime, leave, employer
 * contributions and summary, then net pay, the signatures and the footer — the
 * order of `WebAiPayroll/src/components/reports/HtmlPayslip.tsx`. Net pay in
 * particular belongs at the end, after the summary that produces it. An earlier
 * version opened with it as a hero figure, which read well but meant an employee
 * checking the screen against the printed slip was reading two different
 * documents.
 *
 * The two columns the web prints side by side are stacked here, and the wide
 * tables scroll sideways inside their own sections. Two other liberties, both
 * for a phone: a month with no overtime says so in one line instead of drawing
 * an empty table, and "Save PDF" and "Print" sit in a bar pinned above the
 * bottom edge — at the end of the document they were two thousand points of
 * scrolling away, and they are the only things on the page to tap.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import payslipService, { PayslipDocument, PayslipListItem } from '../api/services/payslipService';
import { serverMessage } from '../lib/serverMessage';
import { payslipFileName, printPayslip, sharePayslipPdf } from '../lib/payslipPdf';
import {
  CompanyHeader,
  DocumentFooter,
  DocumentSheet,
  EmptyDash,
  FieldRow,
  IdentityBlock,
  LeaveMatrix,
  MoneyRow,
  NetPayRow,
  OvertimeTable,
  Panel,
  PayslipState,
  QuietLine,
  SignatureBlock,
  TitleBar,
  count,
  monthLabel,
  ringgit,
  runLabel,
} from '../components/payslips/PayslipUi';

type PayslipDetailsRoute = RouteProp<
  { PayslipDetails: { payrollRunId?: string; payslip?: Partial<PayslipListItem> } },
  'PayslipDetails'
>;

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; doc: PayslipDocument }
  | { kind: 'failed'; message: string };

export const PayslipDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PayslipDetailsRoute>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();

  // The list passes payrollRunId; older call sites passed the whole list row.
  const payrollRunId = route.params?.payrollRunId ?? route.params?.payslip?.payrollRunId ?? null;

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);
  const alive = useRef(true);

  const fetch = useCallback(async () => {
    if (!payrollRunId) {
      setLoad({ kind: 'failed', message: 'This payslip could not be opened. Go back and pick it again.' });
      return;
    }
    try {
      const doc = await payslipService.getDocument(payrollRunId);
      if (!alive.current) return;
      setLoad({ kind: 'ready', doc });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load this payslip.') });
    }
  }, [payrollRunId]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      // Coming back to the screen keeps the payslip (and the scroll position)
      // while it refreshes; only a first open shows the spinner.
      setLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
      void fetch();
      return () => {
        alive.current = false;
      };
    }, [fetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    if (alive.current) setRefreshing(false);
  }, [fetch]);

  const doc = load.kind === 'ready' ? load.doc : null;

  const withHtml = async (what: 'share' | 'print', use: (html: string) => Promise<void>) => {
    if (!payrollRunId || !doc || busy) return;
    setBusy(what);
    try {
      const html = await payslipService.getHtml(payrollRunId);
      await use(html);
    } catch (err) {
      await dialog.notify({
        title: what === 'print' ? 'Could not print' : 'Could not create the PDF',
        message: serverMessage(err, 'Something went wrong preparing your payslip. Please try again.'),
        tone: 'danger',
      });
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const onShare = () =>
    void withHtml('share', async (html) => {
      const name = payslipFileName(doc!.year, doc!.month, doc!.employee.code);
      const { shared } = await sharePayslipPdf(html, name);
      // The share sheet is its own confirmation; a dialog on top of it is noise.
      // A phone without one gets the other route — a cache path is meaningless
      // to the person and the OS may clear it.
      if (!shared) {
        await dialog.notify({
          title: 'Sharing is not available',
          message: 'This phone cannot share files from the app. Tap Print and choose Save as PDF.',
          tone: 'warning',
        });
      }
    });

  const onPrint = () => void withHtml('print', (html) => printPayslip(html));

  // The run is named only when the list handed it over; a payslip opened from a
  // notification has just the month, which is still right.
  const run = route.params?.payslip ? runLabel(route.params.payslip) : null;
  const title = doc ? `${monthLabel(doc.year, doc.month)}${run ? ` · ${run}` : ''}` : 'Payslip';
  const noOvertime = doc ? doc.overtimeLines.length === 0 && !doc.overtimeTotal : false;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      {/* Top edge only: the action bar takes the bottom inset itself, so its
          white runs to the bottom of the screen under the home indicator. */}
      <SafeAreaView style={styles.flex} edges={['top']}>
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
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>Payslip</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{title}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, !doc && { paddingBottom: 16 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
          }
        >
          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <PayslipState
              icon="cloud-off-outline"
              title="Could not load this payslip"
              body={load.message}
              tone="danger"
              onRetry={payrollRunId ? () => void onRefresh() : undefined}
            />
          ) : (
            <>
              <DocumentSheet>
                <CompanyHeader
                  name={doc!.company.name}
                  registrationNumber={doc!.company.registrationNumber}
                  address={doc!.company.address}
                  logoUrl={doc!.company.logoUrl}
                />

                <TitleBar
                  period={doc!.periodLabel}
                  paymentDate={doc!.paymentDateLabel}
                  payrollNumber={doc!.payrollNumber}
                />

                <IdentityBlock>
                  <FieldRow label="Employee Name" value={doc!.employee.name || '-'} />
                  <FieldRow label="Employee Code" value={doc!.employee.code || '-'} />
                  <FieldRow label="IC No." value={doc!.employee.icNo ?? '-'} />
                  <FieldRow label="Bank A/C" value={doc!.employee.bankAccount ?? '-'} />
                  <FieldRow label="EPF No." value={doc!.employee.epfNo ?? '-'} />
                  <FieldRow label="SOCSO No." value={doc!.employee.socsoNo ?? '-'} />
                  <FieldRow
                    label="Basic Salary"
                    value={doc!.employee.basicSalary !== 0 ? ringgit(doc!.employee.basicSalary) : '-'}
                  />
                  <FieldRow
                    label="Work Days"
                    value={doc!.employee.workDays != null ? count(doc!.employee.workDays) : '-'}
                    last
                  />
                </IdentityBlock>

                <Panel title="Income & Allowances" currency>
                  {doc!.income.length === 0 ? (
                    <EmptyDash />
                  ) : (
                    doc!.income.map((row, i) => (
                      <MoneyRow
                        key={`${row.label}-${i}`}
                        label={row.label}
                        amount={row.amount}
                        last={i === doc!.income.length - 1}
                      />
                    ))
                  )}
                </Panel>

                <Panel title="Deductions" currency>
                  {doc!.deductions.length === 0 ? (
                    <EmptyDash />
                  ) : (
                    doc!.deductions.map((row, i) => (
                      <MoneyRow
                        key={`${row.label}-${i}`}
                        label={row.label}
                        amount={row.amount}
                        last={i === doc!.deductions.length - 1}
                      />
                    ))
                  )}
                </Panel>

                <Panel title="Overtime" flush>
                  {noOvertime ? (
                    <QuietLine>No overtime</QuietLine>
                  ) : (
                    <OvertimeTable lines={doc!.overtimeLines} total={doc!.overtimeTotal} />
                  )}
                </Panel>

                <Panel title="Leave" flush>
                  {doc!.leave.length === 0 ? (
                    <QuietLine>No leave data</QuietLine>
                  ) : (
                    <LeaveMatrix rows={doc!.leave} />
                  )}
                </Panel>

                <Panel title="Employer Contributions" currency>
                  {doc!.employerContributions.map((row, i) => (
                    <MoneyRow
                      key={row.label}
                      label={row.label}
                      amount={row.amount}
                      last={i === doc!.employerContributions.length - 1}
                    />
                  ))}
                </Panel>

                <Panel title="Summary" currency>
                  <MoneyRow label="Gross Pay" amount={doc!.grossPay} />
                  <MoneyRow label="Total Deductions" amount={doc!.totalDeductions} last />
                </Panel>

                <NetPayRow amount={doc!.netPay} />

                <SignatureBlock name={doc!.employee.name} date={doc!.paymentDateLabel} />

                <DocumentFooter />
              </DocumentSheet>
            </>
          )}
        </ScrollView>

        {doc ? (
          <View style={[styles.actions, { paddingBottom: Math.max(8, insets.bottom) }]}>
            <View style={styles.half}>
              <PrimaryButton
                label="Save PDF"
                icon="tray-arrow-down"
                onPress={onShare}
                loading={busy === 'share'}
                disabled={busy === 'print'}
                compact
              />
            </View>
            <View style={styles.half}>
              <PrimaryButton
                label="Print"
                icon="printer-outline"
                variant="outline"
                onPress={onPrint}
                loading={busy === 'print'}
                disabled={busy === 'share'}
                compact
              />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  // Back arrow, centred title, and a spacer the same width as the arrow: the
  // title is centred on the screen and a long subtitle truncates instead of
  // running under the arrow.
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  back: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 1 },

  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },

  // Pinned under the scrolling document, above the home indicator (the safe
  // area's bottom edge), so the two actions are always one tap away.
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  half: { flex: 1 },
});

export default PayslipDetailsScreen;
