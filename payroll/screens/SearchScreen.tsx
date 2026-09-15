/**
 * Search — the "View All" list of services.
 *
 * Visual language matches the account pages: the pale #F6F8FF page, an
 * arrow-left header in ink, and one rounded card holding the search field. The
 * grid itself is ServiceCard, which already shares the Home screen's tiles.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { ServiceCard } from '../components/ServiceCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useDialog } from '../components/ui/AppDialog';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';

interface Service {
  id: string;
  title: string;
  icon: string;
  /** Icon and chevron colour. Paired with `bg` from the Home screen's palette. */
  tint: string;
  /** The pale wash behind the card. */
  bg: string;
  route: string;
  /** No screen behind it yet. Tapping says so instead of navigating nowhere. */
  comingSoon?: boolean;
}

const ownerServices: Service[] = [
  {
    id: '1',
    title: 'Request Approval',
    icon: 'email-outline',
    tint: '#2F6BFF',
    bg: '#E8F0FE',
    route: 'Requests',
  },
  {
    id: '2',
    title: 'Leave Approval',
    icon: 'calendar-clock',
    tint: '#7C3AED',
    bg: '#F1EAFE',
    route: 'Leaves',
  },
  {
    id: '4',
    title: 'Claims Approval',
    icon: 'receipt-text',
    tint: '#D97706',
    bg: '#FFF4E5',
    route: 'ClaimsApproval',
  },
  {
    id: '5',
    title: 'Request Types',
    icon: 'format-list-bulleted-type',
    tint: '#16A34A',
    bg: '#E7F7EE',
    route: 'RequestTypes',
  },
  {
    id: '6',
    title: 'Claim Types',
    icon: 'receipt-text-plus',
    tint: '#DC2626',
    bg: '#FDECEC',
    route: 'ClaimTypes',
  },
  {
    id: '8',
    title: 'My Training',
    icon: 'school-outline',
    tint: '#0D9488',
    bg: '#E4F6F4',
    route: 'MyTraining',
  },
];

const employeeServices: Service[] = [
  {
    id: '1',
    title: 'Request Application',
    icon: 'email-plus-outline',
    tint: '#2F6BFF',
    bg: '#E8F0FE',
    route: 'CreateRequest',
  },
  {
    id: '2',
    title: 'Leave Application',
    icon: 'calendar-plus',
    tint: '#7C3AED',
    bg: '#F1EAFE',
    route: 'CreateLeave',
  },
  {
    id: '3',
    title: 'My Payslip',
    icon: 'file-document',
    tint: '#D97706',
    bg: '#FFF4E5',
    route: 'MyPayslip',
  },
  {
    id: '4',
    title: 'Check-In',
    icon: 'fingerprint',
    tint: '#0891B2',
    bg: '#E0F5F8',
    route: 'AttendanceCheckIn',
  },
  {
    id: '5',
    title: 'Claims',
    icon: 'receipt',
    tint: '#16A34A',
    bg: '#E7F7EE',
    route: 'Claims',
  },
  {
    id: '6',
    title: 'My Training',
    icon: 'school-outline',
    tint: '#0D9488',
    bg: '#E4F6F4',
    route: 'MyTraining',
  },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const access = useApproverAccess();
  const isOwner = access.any;
  // Only the sections this person's rights will actually open; anything else would 403.
  const allowedRoute: Record<string, boolean> = {
    Requests: access.requests,
    Leaves: access.leave,
    ClaimsApproval: access.claims,
    ClaimTypes: access.claims,
    RequestTypes: access.requestTypes,
  };
  const services = isOwner
    ? ownerServices.filter((s) => allowedRoute[s.route] ?? true)
    : employeeServices;
  const screenTitle = isOwner ? 'Search Services' : 'Search Categories';

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServicePress = (service: Service) => {
    if (service.comingSoon) {
      void dialog.notify({
        title: `${service.title} is on its way`,
        message: 'This section is not available in the app yet.',
        tone: 'info',
      });
      return;
    }
    navigation.navigate(service.route as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FF" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchContainer, focused && styles.searchContainerFocused]}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={focused ? C.blue : C.muted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services..."
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus={false}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={19} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* No "type to begin" state. This screen is what View All opens, and a View
              All that shows nothing until you type is not a list -- it hides the very
              items it exists to reveal. The search box narrows the list; it is not the
              way in. */}
          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="file-search-outline"
                  size={38}
                  color={C.blue}
                />
              </View>
              <Text style={styles.emptyStateText}>No results found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching with different keywords
              </Text>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>
                {searchQuery.length === 0
                  ? (isOwner ? 'All services' : 'All categories')
                  : `${filteredServices.length} ${filteredServices.length === 1
                      ? (isOwner ? 'service' : 'category')
                      : (isOwner ? 'services' : 'categories')} found`}
              </Text>
              {/* Wraps rather than scrolling sideways: with the whole list showing by
                  default, a single horizontal row leaves most of it off-screen. */}
              <View style={styles.servicesGrid}>
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    title={service.title}
                    icon={service.icon}
                    tint={service.tint}
                    bg={service.bg}
                    onPress={() => handleServicePress(service)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
  },
  placeholder: {
    width: 44,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchContainerFocused: {
    borderColor: C.blue,
  },
  searchIcon: {
    marginRight: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    padding: 0,
  },
  clearButton: {
    paddingLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
  },
  emptyStateSubtext: {
    fontSize: 13.5,
    color: C.body,
    marginTop: 6,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 2,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 14,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
