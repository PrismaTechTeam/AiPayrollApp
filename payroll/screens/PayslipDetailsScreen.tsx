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
 * tables scroll sideways inside their own sections. That is the only liberty
 * taken: a phone is not 210mm.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import payslipService, { PayslipDocument } from '../api/services/payslipService';
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
} from '../components/payslips/PayslipUi';

type PayslipDetailsRoute = RouteProp<
  { PayslipDetails: { payrollRunId?: string; payslip?: { payrollRunId?: string } } },
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
      setLoad({ kind: 'loading' });
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
        title: 'Could not create the PDF',
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
      const { uri, shared } = await sharePayslipPdf(html, name);
      // The share sheet is its own confirmation; a dialog on top of it is noise.
      // Only a phone that has no sheet needs to be told where the file went.
      if (!shared) {
        await dialog.notify({ title: 'Payslip saved', message: uri, tone: 'success' });
      }
    });

  const onPrint = () => void withHtml('print', (html) => printPayslip(html));

  const title = doc ? monthLabel(doc.year, doc.month) : 'Payslip';

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
            <Text style={styles.headerTitle}>Payslip</Text>
            <Text style={styles.headerSubtitle}>{title}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
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
                  <OvertimeTable lines={doc!.overtimeLines} total={doc!.overtimeTotal} />
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

              <View style={styles.actions}>
                <PrimaryButton
                  label="Save or share PDF"
                  icon="tray-arrow-down"
                  onPress={onShare}
                  loading={busy === 'share'}
                  disabled={busy === 'print'}
                />
                <PrimaryButton
                  label="Print"
                  icon="printer-outline"
                  variant="outline"
                  onPress={onPrint}
                  loading={busy === 'print'}
                  disabled={busy === 'share'}
                />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  actions: { gap: 12, marginTop: 8 },
});

export default PayslipDetailsScreen;
