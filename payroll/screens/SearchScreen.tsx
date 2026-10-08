/**
 * All services — what "View all" on Home opens.
 *
 * Everything this person can open, in sections that follow the same two facts
 * Home does: approval rights give "Approvals" and "Setup", an employee record
 * gives "My work". It is a superset of Home's tiles, so nothing on Home is
 * missing here. The search box narrows the list by name or by the words people
 * use for a thing ("salary", "check in", "MC", "staff"); it is not the way in.
 *
 * An HR user who is not an employee has about nine things, which as a launcher
 * grid filled barely half the phone and looked unfinished. A short list is
 * drawn as rows instead (icon, name, chevron) so it fills the screen and every
 * name reads in full; an employee's dozen-plus stays a grid so it still fits
 * without scrolling. The choice is made from the whole list, not the filtered
 * one, so the layout never flips while somebody types.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { ServiceCard } from '../components/ServiceCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useDepartmentApprover } from '../hooks/useDepartmentApprover';
import { useTeamTodayOpen } from '../hooks/useTeamTodayOpen';
import { AUTH_COLORS as C, SERVICE_TILE } from '../components/auth/AuthBackdrop';
import type { IconName } from '../components/auth/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';

interface Service {
  id: string;
  title: string;
  icon: IconName;
  route: keyof RootStackParamList;
  /** Other words people search for it by. */
  keywords?: string;
}

/** What the Approvals section shows before, or instead of, its tiles. */
type SectionState = 'loading' | 'failed';

interface Section {
  key: string;
  title: string;
  items: Service[];
  state?: SectionState;
}

/** One look for every service, shared with Home: a navy line icon on the soft blue wash. */
const TILE = SERVICE_TILE;

/** A short list reads better as rows; more than this many and it becomes the launcher grid. */
const MAX_ROWS = 10;

// The employee's own things, in the order Home lists them, each followed by the action that
// starts a new one.
const MY_WORK: Service[] = [
  { id: 'my-requests', title: 'My Requests', icon: 'text-box-outline', route: 'MyRequests', keywords: 'letter hr' },
  { id: 'new-request', title: 'New Request', icon: 'text-box-plus-outline', route: 'CreateRequest', keywords: 'apply letter hr' },
  { id: 'my-leaves', title: 'My Leaves', icon: 'calendar-clock-outline', route: 'MyLeaves', keywords: 'balance annual mc sick holiday' },
  { id: 'apply-leave', title: 'Apply Leave', icon: 'calendar-plus', route: 'CreateLeave', keywords: 'new mc sick holiday annual' },
  { id: 'payslip', title: 'My Payslips', icon: 'wallet-outline', route: 'MyPayslip', keywords: 'salary pay slip gaji' },
  { id: 'documents', title: 'My Documents', icon: 'file-document-outline', route: 'MyDocuments', keywords: 'upload ic passport permit' },
  { id: 'claims', title: 'My Claims', icon: 'receipt-text-outline', route: 'Claims', keywords: 'expense receipt reimburse' },
  { id: 'new-claim', title: 'New Claim', icon: 'receipt-text-plus-outline', route: 'CreateClaim', keywords: 'expense receipt reimburse' },
  { id: 'attendance', title: 'My Attendance', icon: 'clock-check-outline', route: 'Attendance', keywords: 'work card hours late' },
  { id: 'punch', title: 'Punch', icon: 'fingerprint', route: 'AttendanceCheckIn', keywords: 'check in clock in out' },
  { id: 'punch-requests', title: 'Punch Requests', icon: 'clock-alert-outline', route: 'PunchRequests', keywords: 'forgot missed punch' },
  { id: 'training', title: 'My Training', icon: 'school-outline', route: 'MyTraining', keywords: 'course certificate' },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { user } = usePayrollAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const linked = !!user?.employeeId;
  const access = useApproverAccess();
  const { isDepartmentApprover } = useDepartmentApprover();
  // Seeing the team's clock-ins needs an attendance right, and the server must also let this
  // person in (it still wants an employee record); the hook answers both.
  const teamToday = useTeamTodayOpen();

  const sections: Section[] = useMemo(() => {
    // Only what this person's rights will actually open; anything else would 403. The role-name
    // guess is not good enough here, so nothing is offered until the rights have arrived.
    const ready = access.ready;
    const approvals: Service[] = [];
    if (ready && access.requests) {
      approvals.push({ id: 'a-requests', title: 'Request Approval', icon: 'text-box-check-outline', route: 'Requests', keywords: 'approve hr' });
    }
    // A department approver is still an employee, with Leave Approval added.
    if ((ready && access.leave) || isDepartmentApprover) {
      approvals.push({ id: 'a-leave', title: 'Leave Approval', icon: 'calendar-check-outline', route: 'Leaves', keywords: 'approve hr mc' });
    }
    if (ready && access.claims) {
      approvals.push({ id: 'a-claims', title: 'Claim Approval', icon: 'receipt-text-check-outline', route: 'ClaimsApproval', keywords: 'approve hr expense' });
    }
    // Loading and failed are said out loud instead of leaving a gap where Approvals will be. Only
    // for somebody who is probably HR (not an employee here, or the role guess says owner): a plain
    // employee has no approvals to wait for, and a placeholder that then vanishes only jumps.
    const maybeApprover = !linked || access.any;
    const approvalsState: SectionState | undefined =
      ready || !maybeApprover ? undefined : access.failed ? 'failed' : 'loading';

    // Setting up what people can ask for is not approving, so it is its own section rather than a
    // second row of the Approvals card.
    const setup: Service[] = [];
    if (ready && access.requestTypes) {
      setup.push({ id: 'request-types', title: 'Request Types', icon: 'format-list-bulleted-type', route: 'RequestTypes', keywords: 'setup manage' });
    }
    if (ready && access.claims) {
      setup.push({ id: 'claim-types', title: 'Claim Types', icon: 'receipt-text-edit-outline', route: 'ClaimTypes', keywords: 'setup manage limit expense' });
    }
    if (ready && access.employeePortal) {
      setup.push({ id: 'invite', title: 'Invite Employees', icon: 'qrcode', route: 'InviteEmployees', keywords: 'join code qr new staff hire' });
    }

    // The team's attendance: who is in today (and where, on the map Team Today opens), and the
    // forgotten-punch requests waiting on HR.
    const team: Service[] = [];
    if (teamToday) {
      team.push({ id: 'team-today', title: 'Team Today', icon: 'account-clock-outline', route: 'EmployeeList', keywords: 'employee staff attendance clock in absent late map who is in' });
    }
    if (ready && access.punchApprovals) {
      team.push({ id: 'punch-approval', title: 'Punch Approval', icon: 'clock-edit-outline', route: 'PunchApproval', keywords: 'forgot punch missed clock in out request attendance' });
    }

    const account: Service[] = [
      { id: 'settings', title: 'Settings', icon: 'cog-outline', route: 'AccountSettings', keywords: 'profile password sign out logout account' },
      { id: 'companies', title: 'Companies', icon: 'office-building-outline', route: 'TenantHub', keywords: 'company switch join tenant' },
      { id: 'notifications', title: 'Notifications', icon: 'bell-outline', route: 'Notifications', keywords: 'alerts inbox' },
      { id: 'help', title: 'Help', icon: 'help-circle-outline', route: 'Help', keywords: 'support contact faq' },
    ];
    if (linked) {
      account.push({ id: 'activity', title: 'Recent Activity', icon: 'history', route: 'Activity', keywords: 'history' });
    }

    const all: Section[] = [
      { key: 'approvals', title: 'Approvals', items: approvals, state: approvalsState },
      { key: 'setup', title: 'Setup', items: setup },
      { key: 'team', title: 'Team', items: team },
      { key: 'mine', title: 'My work', items: linked ? MY_WORK : [] },
      { key: 'account', title: 'Account', items: account },
    ];
    return all.filter((s) => s.items.length > 0 || s.state !== undefined);
  }, [
    access.ready,
    access.failed,
    access.any,
    access.requests,
    access.leave,
    access.claims,
    access.requestTypes,
    access.employeePortal,
    access.punchApprovals,
    teamToday,
    isDepartmentApprover,
    linked,
  ]);

  // Decided from the whole list, with three for the Approvals still on their way, so the layout
  // does not change when the rights land or while somebody types.
  const asRows =
    sections.reduce((n, s) => n + s.items.length + (s.state ? 3 : 0), 0) <= MAX_ROWS;

  const query = searchQuery.trim().toLowerCase();
  const visible: Section[] = query
    ? sections
        .map((s) => ({
          ...s,
          // A search is for something that is there; the placeholder and the retry are not.
          state: undefined,
          items: s.items.filter((i) => `${i.title} ${i.keywords ?? ''}`.toLowerCase().includes(query)),
        }))
        .filter((s) => s.items.length > 0)
    : sections;

  // Four to a row, or three on the narrowest phones, sized from the window so a row always fits:
  // page padding, the card's own padding, and its 1pt border on each side.
  const cols = width < 340 ? 3 : 4;
  const itemWidth = Math.floor((width - 16 * 2 - 8 * 2 - 2) / cols);

  const open = (service: Service) => (navigation.navigate as (screen: string) => void)(service.route);

  const renderItems = (items: Service[]) =>
    asRows ? (
      <View style={styles.card}>
        {items.map((service, index) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
            onPress={() => open(service)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={service.title}
          >
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons name={service.icon} size={20} color={TILE.tint} />
            </View>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {service.title}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
          </TouchableOpacity>
        ))}
      </View>
    ) : (
      <View style={[styles.card, styles.grid]}>
        {items.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            icon={service.icon}
            tint={TILE.tint}
            bg={TILE.bg}
            width={itemWidth}
            onPress={() => open(service)}
          />
        ))}
      </View>
    );

  // Three grey shapes where the approval tiles will be, the same size, so nothing jumps when the
  // rights arrive.
  const placeholder = asRows ? (
    <View style={styles.card} accessibilityLabel="Loading your approvals">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.row, i > 0 && styles.rowDivider]}>
          <View style={[styles.rowIcon, styles.ghost]} />
          <View style={[styles.ghostBar, styles.ghostBarWide]} />
        </View>
      ))}
    </View>
  ) : (
    <View style={[styles.card, styles.grid]} accessibilityLabel="Loading your approvals">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.ghostTile, { width: itemWidth }]}>
          <View style={[styles.ghostBox, styles.ghost]} />
          <View style={styles.ghostBar} />
        </View>
      ))}
    </View>
  );

  // Without the rights the approvals cannot be offered, and an empty gap would say there are none.
  const failedRow = (
    <View style={[styles.card, styles.failedRow]}>
      <Text style={styles.failedText}>Could not load your approvals</Text>
      <TouchableOpacity onPress={access.retry} style={styles.failedAction} accessibilityRole="button">
        <Text style={styles.failedActionText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All services</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchContainer, focused && styles.searchContainerFocused]}>
            <MaterialCommunityIcons name="magnify" size={20} color={focused ? C.blue : C.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search, e.g. payslip, leave, punch"
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search services"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={C.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {visible.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="file-search-outline" size={30} color={TILE.tint} />
              </View>
              <Text style={styles.emptyStateText}>Nothing matches “{searchQuery.trim()}”</Text>
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.emptyAction} accessibilityRole="button">
                <Text style={styles.emptyActionText}>Show all services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visible.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.length > 0 ? renderItems(section.items) : null}
                {section.state === 'loading' && section.items.length === 0 ? placeholder : null}
                {section.state === 'failed' ? (
                  <View style={section.items.length > 0 ? styles.stacked : null}>{failedRow}</View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 8,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  placeholder: { width: 44 },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    height: 44,
  },
  searchContainerFocused: { borderColor: C.blue },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },
  clearButton: { width: 32, height: 44, justifyContent: 'center', alignItems: 'flex-end' },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 },

  section: { marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginLeft: 4, marginBottom: 6 },
  // The white card every work screen uses: radius 16, hairline border, a shadow you barely see.
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingVertical: 4 },
  stacked: { marginTop: 10 },

  // Rows for a short list: 54pt tall, comfortably over the 44pt a thumb needs.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: TILE.bg, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },

  ghost: { backgroundColor: '#EEF2F7' },
  ghostTile: { alignItems: 'center', paddingVertical: 8, minHeight: 92 },
  ghostBox: { width: 46, height: 46, borderRadius: 14 },
  ghostBar: { height: 10, width: 48, borderRadius: 5, backgroundColor: '#EEF2F7', marginTop: 10 },
  ghostBarWide: { width: 128, marginTop: 0 },

  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 54, paddingLeft: 14, paddingRight: 4 },
  failedText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  failedAction: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  failedActionText: { fontSize: 14, fontWeight: '600', color: C.blue },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyStateText: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptyAction: { marginTop: 12, minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.blue, justifyContent: 'center' },
  emptyActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

export default SearchScreen;
