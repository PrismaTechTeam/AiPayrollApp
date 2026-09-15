/**
 * The pieces the two payslip screens share.
 *
 * A payslip is money in columns, so the rules that matter here are about figures:
 * every amount is tabular so the decimal points line up down a column, an exact
 * zero prints as a dash rather than "0.00", and the currency is Ringgit — the
 * screens used to render dollars while the rest of the app rendered RM.
 *
 * Those first two rules are not cosmetic. They are the ones the printed payslip
 * follows (`Payroll/Application/Services/Mobile/PayslipHtmlRenderer.cs`), and a
 * screen that rounds or fills differently from the PDF an employee downloads is
 * a screen that starts arguments.
 *
 * The document parts below — company header, title bar, identity block, panels,
 * the overtime table, the leave matrix, net pay, signatures, footer — are the
 * sections of `WebAiPayroll/src/components/reports/HtmlPayslip.tsx`, in that
 * file's order and with its labels. That component is the specification: the
 * requirement is that an employee reading the screen and HR reading the browser
 * are looking at the same document. What changes here is the surface — the app's
 * palette, one white sheet, and columns stacked for a phone-width page — not the
 * sections, their order, their wording, or which figure prints as a dash.
 */
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { SectionHeading, YearBar, goTo } from '../leave/LeaveUi';
import type {
  PayslipLeaveRow,
  PayslipListItem,
  PayslipOvertimeLine,
} from '../../api/services/payslipService';

// The year picker and the section heading are the same controls the leave screens
// use. Re-exported so a payslip screen imports its whole kit from one place.
export { SectionHeading, YearBar, goTo };

// ── Numbers ───────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(year: number, month: number): string {
  const name = MONTHS[month - 1];
  return name ? `${name} ${year}` : String(year);
}

export function shortMonthLabel(year: number, month: number): string {
  const name = MONTHS[month - 1];
  return name ? `${name.slice(0, 3)} ${year}` : String(year);
}

/**
 * A payslip figure. Exact zero is a dash, which is what the printed payslip does
 * and what stops a column of "0.00" from drowning the rows that carry money.
 */
export function money(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) return '-';
  return value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A figure that must always show a number, zero included. */
export function moneyExact(value: number | null | undefined): string {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Take-home, and anywhere else the unit has to be spelled out. Malaysian payroll: Ringgit. */
export function ringgit(value: number | null | undefined): string {
  return `RM ${moneyExact(value)}`;
}

/** Days and hours: 8 stays "8", 7.5 stays "7.5", and nothing becomes "0". */
export function count(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** The overtime multiplier as the document writes it: "1.5x", or a dash for none. */
function rateLabel(rate: number | null | undefined): string {
  if (typeof rate !== 'number' || Number.isNaN(rate) || rate === 0) return '-';
  return `${rate.toFixed(1)}x`;
}

// ── The sheet ─────────────────────────────────────────────────────────

/** The page the document is printed on: one white card, everything inside it. */
export const DocumentSheet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.sheet}>{children}</View>
);

/**
 * Who paid. A logo URL that will not load leaves no gap — the name carries the
 * header on its own, which is what the document does for companies without one.
 */
export const CompanyHeader: React.FC<{
  name: string;
  registrationNumber?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}> = ({ name, registrationNumber, address, logoUrl }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <View style={styles.company}>
      {logoUrl && !logoFailed ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.companyLogo}
          resizeMode="contain"
          onError={() => setLogoFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Text style={styles.companyName}>{name}</Text>
      {registrationNumber ? (
        <Text style={styles.companyMeta}>Reg No: {registrationNumber}</Text>
      ) : null}
      {address ? <Text style={styles.companyMeta}>{address}</Text> : null}
    </View>
  );
};

/** The banner that names the document and dates it. */
export const TitleBar: React.FC<{
  period: string;
  paymentDate: string;
  payrollNumber?: string | null;
}> = ({ period, paymentDate, payrollNumber }) => (
  <View style={styles.titleBar}>
    <Text style={styles.titleWord}>PAYSLIP</Text>
    <View style={styles.titleMeta}>
      <Text style={styles.titleMetaLine}>Period: {period}</Text>
      <Text style={styles.titleMetaLine}>Payment Date: {paymentDate}</Text>
      {payrollNumber ? <Text style={styles.titleMetaLine}>Payroll #: {payrollNumber}</Text> : null}
    </View>
  </View>
);

/** The boxed "who this is" block. It carries no heading, and neither does the web's. */
export const IdentityBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.identity}>{children}</View>
);

/**
 * A section of the payslip. The "RM" on the right is where the printed payslip
 * puts its currency marker, so the rows underneath can stay bare numbers.
 * `flush` drops the body padding for sections that hold a table of their own.
 */
export const Panel: React.FC<{
  title: string;
  currency?: boolean;
  flush?: boolean;
  children: React.ReactNode;
}> = ({ title, currency = false, flush = false, children }) => (
  <View style={styles.panel}>
    <View style={styles.panelHead}>
      <Text style={styles.panelTitle}>{title}</Text>
      {currency ? <Text style={styles.panelUnit}>RM</Text> : null}
    </View>
    <View style={flush ? styles.panelBodyFlush : styles.panelBody}>{children}</View>
  </View>
);

/** One "label ......... amount" line. */
export const MoneyRow: React.FC<{
  label: string;
  amount: number;
  sub?: string;
  last?: boolean;
}> = ({ label, amount, sub, last = false }) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
    <Text style={styles.rowAmount}>{money(amount)}</Text>
  </View>
);

/**
 * A column with nothing in it. The document prints a grey dash rather than a
 * word, so an empty Deductions column reads as "nothing was taken" instead of
 * looking like a section that failed to load.
 */
export const EmptyDash: React.FC = () => <Text style={styles.dash}>-</Text>;

/**
 * The line under a panel that adds it up. Dash-for-zero, same as every other
 * figure on the document: a "Total Overtime" of 0.00 on the screen next to a
 * dash on the PDF is the kind of difference that gets read as a missing payment.
 */
export const TotalRow: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={styles.totalAmount}>{money(amount)}</Text>
  </View>
);

/** One "label : value" identity line. */
export const FieldRow: React.FC<{ label: string; value: string; last?: boolean }> = ({
  label,
  value,
  last = false,
}) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
  </View>
);

// ── Tables ────────────────────────────────────────────────────────────

/**
 * A table too wide for the page scrolls sideways inside its own section. The
 * page never does: a document that slides horizontally under the thumb is a
 * document nobody can read a column of.
 */
const HScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.hscrollContent}
  >
    {children}
  </ScrollView>
);

/** Overtime, by type: what it was, at what multiple, for how long, for how much. */
export const OvertimeTable: React.FC<{
  lines: PayslipOvertimeLine[];
  total: number;
}> = ({ lines, total }) => (
  <>
    <HScroll>
      <View style={styles.table}>
        <View style={[styles.tRow, styles.tHeadRow]}>
          <Text style={[styles.tHead, styles.colType]}>Type</Text>
          <Text style={[styles.tHead, styles.colRate, styles.tRight]}>Rate</Text>
          <Text style={[styles.tHead, styles.colHours, styles.tRight]}>Hours</Text>
          <Text style={[styles.tHead, styles.colAmount, styles.tRight]}>Amount</Text>
        </View>

        {lines.length === 0 ? (
          <View style={styles.tRow}>
            <Text style={[styles.tMuted, styles.colWide]}>No overtime</Text>
            <Text style={[styles.tNum, styles.colAmount, styles.tRight]}>-</Text>
          </View>
        ) : (
          lines.map((line, i) => (
            <View key={`${line.type}-${i}`} style={styles.tRow}>
              <Text style={[styles.tCell, styles.colType]} numberOfLines={2}>
                {line.type}
              </Text>
              <Text style={[styles.tNum, styles.colRate, styles.tRight]}>
                {rateLabel(line.rate)}
              </Text>
              <Text style={[styles.tNum, styles.colHours, styles.tRight]}>
                {count(line.hours)}
              </Text>
              <Text style={[styles.tNum, styles.colAmount, styles.tRight]}>
                {money(line.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </HScroll>
    <View style={styles.tableFootWrap}>
      <TotalRow label="Total Overtime" amount={total} />
    </View>
  </>
);

/**
 * Leave, as the document draws it: a column per leave type headed by its code,
 * and a row each for what the year is worth, what is gone, and what is left.
 */
export const LeaveMatrix: React.FC<{ rows: PayslipLeaveRow[] }> = ({ rows }) => (
  <HScroll>
    <View style={styles.table}>
      <View style={[styles.tRow, styles.tHeadRow]}>
        <Text style={[styles.tHead, styles.colLeaveLabel]}>Type</Text>
        {rows.map((row, i) => (
          <Text
            key={`${row.code}-${i}`}
            style={[styles.tHead, styles.colLeave, styles.tRight]}
            numberOfLines={1}
          >
            {row.code}
          </Text>
        ))}
      </View>

      <LeaveMatrixRow label="Entitlement" values={rows.map((r) => r.entitlement)} />
      <LeaveMatrixRow label="Taken" values={rows.map((r) => r.taken)} />
      <LeaveMatrixRow label="Balance" values={rows.map((r) => r.balance)} strong last />
    </View>
  </HScroll>
);

const LeaveMatrixRow: React.FC<{
  label: string;
  values: number[];
  strong?: boolean;
  last?: boolean;
}> = ({ label, values, strong = false, last = false }) => (
  <View style={[styles.tRow, last && styles.tRowLast]}>
    <Text style={[styles.tCell, styles.colLeaveLabel, strong && styles.tStrong]}>{label}</Text>
    {values.map((value, i) => (
      <Text
        key={i}
        style={[styles.tNum, styles.colLeave, styles.tRight, strong && styles.tStrong]}
      >
        {count(value)}
      </Text>
    ))}
  </View>
);

// ── The end of the document ───────────────────────────────────────────

/**
 * Take-home. It sits here, after the summary, because that is where the printed
 * payslip puts it — the figure is the conclusion of the document, not its
 * headline, and moving it changes what the reader thinks they are checking.
 */
export const NetPayRow: React.FC<{ amount: number }> = ({ amount }) => (
  <View style={styles.net}>
    <Text style={styles.netLabel}>NET PAY</Text>
    <Text style={styles.netAmount}>RM {money(amount)}</Text>
  </View>
);

/** Where the two signatures go, and who is expected to write them. */
export const SignatureBlock: React.FC<{ name: string; date: string }> = ({ name, date }) => (
  <View style={styles.sign}>
    <View style={styles.signCol}>
      <View style={styles.signRule} />
      <Text style={styles.signCaption}>Employee Signature</Text>
      <Text style={styles.signRow}>
        Name: <Text style={styles.signValue}>{name}</Text>
      </Text>
      <Text style={styles.signRow}>
        Date: <Text style={styles.signValue}>{date}</Text>
      </Text>
    </View>
    <View style={styles.signCol}>
      <View style={styles.signRule} />
      <Text style={styles.signCaption}>Employer Signature</Text>
    </View>
  </View>
);

export const DocumentFooter: React.FC = () => (
  <Text style={styles.foot}>This is a computer-generated payslip.</Text>
);

export const QuietLine: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.quiet}>{children}</Text>
);

// ── List ──────────────────────────────────────────────────────────────

/** One month's pay in the list: which month, and what landed in the bank. */
export const PayslipRow: React.FC<{
  payslip: PayslipListItem;
  onPress: () => void;
}> = ({ payslip, onPress }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={`${monthLabel(payslip.payrollYear, payslip.payrollMonth)}, net pay ${ringgit(payslip.netPay)}`}
  >
    <View style={styles.cardIcon}>
      <MaterialCommunityIcons name="file-document-outline" size={22} color={C.blue} />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {monthLabel(payslip.payrollYear, payslip.payrollMonth)}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        Net {ringgit(payslip.netPay)}
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
  </TouchableOpacity>
);

// ── States ────────────────────────────────────────────────────────────

/**
 * Loading, failed and empty are three different answers and must not look alike.
 * The old screen showed the same "no payslips" panel whether the request failed
 * or genuinely came back with nothing, which hid every outage as an empty state.
 */
export const PayslipState: React.FC<{
  icon: IconName;
  title: string;
  body: string;
  tone?: 'plain' | 'danger';
  onRetry?: () => void;
}> = ({ icon, title, body, tone = 'plain', onRetry }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={30} color={tone === 'danger' ? C.danger : C.blue} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateBody}>{body}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  company: { marginBottom: 14 },
  companyLogo: { height: 44, width: 150, marginBottom: 8, alignSelf: 'flex-start' },
  companyName: { fontSize: 17, fontWeight: '800', color: C.ink },
  companyMeta: { fontSize: 12, color: C.body, marginTop: 2, lineHeight: 16 },

  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  titleWord: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  titleMeta: { flex: 1, alignItems: 'flex-end', gap: 2 },
  titleMetaLine: { fontSize: 11, color: '#EAF0FF', textAlign: 'right' },

  identity: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  panel: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.field,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  panelTitle: { fontSize: 13, fontWeight: '700', color: C.ink },
  panelUnit: { fontSize: 12, fontWeight: '700', color: C.body },
  panelBody: { paddingHorizontal: 14 },
  panelBodyFlush: {},

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, color: C.ink, fontWeight: '600' },
  rowSub: { fontSize: 12, color: C.body },
  rowAmount: { fontSize: 15, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },

  fieldLabel: { flex: 1, fontSize: 13, color: C.body },
  fieldValue: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'right' },

  // Sits inside a padded panel body, so it carries vertical spacing only.
  dash: { fontSize: 14, color: C.muted, paddingVertical: 12 },

  hscrollContent: { flexGrow: 1 },
  table: { flexGrow: 1 },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  tRowLast: { borderBottomWidth: 0 },
  tHeadRow: { paddingVertical: 8 },
  tHead: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.3 },
  tCell: { fontSize: 13, color: C.ink },
  tNum: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
  tMuted: { fontSize: 13, color: C.muted },
  tStrong: { fontWeight: '800' },
  tRight: { textAlign: 'right' },

  // The table is measured with an unconstrained width, so a flexed column takes
  // its minimum when the row has to scroll and shares the slack when it does not.
  // colWide is the empty-state cell spanning Type + Rate + Hours: its minimum is
  // their minimums plus the gaps between them, so the Amount column lands in the
  // same place whether there are overtime lines or not.
  colType: { flex: 1, minWidth: 96, maxWidth: 220 },
  colWide: { flex: 1, minWidth: 216, maxWidth: 340 },
  colRate: { width: 52 },
  colHours: { width: 48 },
  colAmount: { width: 82 },
  colLeaveLabel: { width: 96 },
  colLeave: { width: 62 },

  tableFootWrap: { paddingHorizontal: 14 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  totalLabel: { fontSize: 13, fontWeight: '800', color: C.ink },
  totalAmount: { fontSize: 14, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },

  net: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#D5E1FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  netLabel: { fontSize: 14, fontWeight: '800', color: C.ink, letterSpacing: 0.6 },
  netAmount: {
    fontSize: 21,
    fontWeight: '800',
    color: C.blue,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },

  sign: { flexDirection: 'row', gap: 20, marginTop: 32 },
  signCol: { flex: 1 },
  signRule: { height: 1, backgroundColor: C.muted, marginBottom: 6 },
  signCaption: { fontSize: 11, color: C.body },
  signRow: { fontSize: 11, color: C.muted, marginTop: 6 },
  signValue: { color: C.ink },

  foot: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 20 },

  quiet: { fontSize: 13, color: C.muted, paddingHorizontal: 14, paddingVertical: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 13, color: C.body, fontVariant: ['tabular-nums'] },

  state: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
