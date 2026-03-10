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
import { USER_ROLES } from '../constants/userRoles';

interface Service {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
}

const managerServices: Service[] = [
  {
    id: '1',
    title: 'Request Approval',
    icon: 'email-outline',
    color: '#4CAF50',
    route: 'Requests',
  },
  {
    id: '2',
    title: 'Leave Approval',
    icon: 'calendar-clock',
    color: '#FF5722',
    route: 'Leaves',
  },
  {
    id: '3',
    title: 'Payslip Management',
    icon: 'file-document-multiple',
    color: '#FFB300',
    route: 'Payslip',
  },
  {
    id: '4',
    title: 'Attendance',
    icon: 'clock-outline',
    color: '#2196F3',
    route: 'Attendance',
  },
  {
    id: '5',
    title: 'Claims Approval',
    icon: 'receipt-text',
    color: '#00897B',
    route: 'ClaimsApproval',
  },
  {
    id: '6',
    title: 'Employee Map',
    icon: 'map-marker-radius',
    color: '#00BCD4',
    route: 'EmployeeList',
  },
];

const employeeServices: Service[] = [
  {
    id: '1',
    title: 'Request Application',
    icon: 'email-plus-outline',
    color: '#2196F3',
    route: 'CreateRequest',
  },
  {
    id: '2',
    title: 'Leave Application',
    icon: 'calendar-plus',
    color: '#9C27B0',
    route: 'CreateLeave',
  },
  {
    id: '3',
    title: 'My Payslip',
    icon: 'file-document',
    color: '#FFB300',
    route: 'MyPayslip',
  },
  {
    id: '4',
    title: 'Check-In',
    icon: 'fingerprint',
    color: '#00BCD4',
    route: 'AttendanceCheckIn',
  },
  {
    id: '5',
    title: 'Claims',
    icon: 'receipt',
    color: '#00897B',
    route: 'Claims',
  },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentRole } = usePayrollAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = currentRole === USER_ROLES.MANAGER;
  const services = isManager ? managerServices : employeeServices;
  const screenTitle = isManager ? 'Search Services' : 'Search Categories';

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServicePress = (route: string) => {
    navigation.navigate(route as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={24}
            color="#9E9E9E"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {searchQuery.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify"
                size={64}
                color="#E0E0E0"
              />
              <Text style={styles.emptyStateText}>
                {isManager ? 'Search for services above' : 'Search for categories above'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {isManager ? 'Type to find the service you need' : 'Type to find the category you need'}
              </Text>
            </View>
          ) : filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify"
                size={64}
                color="#E0E0E0"
              />
              <Text style={styles.emptyStateText}>No results found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching with different keywords
              </Text>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>
                {filteredServices.length} {filteredServices.length === 1 
                  ? (isManager ? 'service' : 'category') 
                  : (isManager ? 'services' : 'categories')} found
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.servicesScroll}
              >
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    title={service.title}
                    icon={service.icon}
                    color={service.color}
                    onPress={() => handleServicePress(service.route)}
                  />
                ))}
              </ScrollView>
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
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  servicesScroll: {
    paddingRight: 20,
  },
});
