/**
 * My Payslip Screen (Employee View)
 * Displays employee's own payslip directly
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { BottomNavBar } from '../components/BottomNavBar';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { mockRequestedPayslips } from '../data/mockPayslips';

export const MyPayslipScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = usePayrollAuth();
  const [loading, setLoading] = useState(true);
  const [myPayslip, setMyPayslip] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching employee's payslip
    // TODO: Replace with actual API call filtered by user ID
    const loadMyPayslip = async () => {
      setLoading(true);
      try {
        // For now, get the first payslip and customize it for the current user
        const payslip = mockRequestedPayslips[0];
        const customizedPayslip = {
          ...payslip,
          name: user?.name || 'Employee',
          // In real app, this would fetch from: GET /api/payslips/my-payslip
        };
        setMyPayslip(customizedPayslip);
      } catch (error) {
        console.error('Error loading payslip:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMyPayslip();
  }, [user]);

  const handleViewDetails = () => {
    if (myPayslip) {
      navigation.navigate('PayslipDetails' as never, { payslip: myPayslip } as never);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Payslip</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading your payslip...</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  if (!myPayslip) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Payslip</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>No payslip available</Text>
          <Text style={styles.emptySubtext}>Your payslip will appear here once processed</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Payslip</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {/* Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Payslip Card */}
        <View style={styles.payslipCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-document" size={24} color="#4285F4" />
            <Text style={styles.cardTitle}>Current Payslip</Text>
          </View>

          {/* Employee Info */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Employee Name:</Text>
            <Text style={styles.value}>{myPayslip.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Period:</Text>
            <Text style={styles.value}>{myPayslip.dateRange}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.typeValue}>{myPayslip.type}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Issued:</Text>
            <Text style={styles.value}>{myPayslip.daysAgo}</Text>
          </View>

          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, styles.statusRequested]}>
              <Text style={styles.statusText}>
                {myPayslip.status === 'requested' ? 'Pending' : 
                 myPayslip.status === 'completed' ? 'Completed' : 'Cancelled'}
              </Text>
            </View>
          </View>

          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.viewDetailsText}>View Full Details</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#4285F4" />
          </TouchableOpacity>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoCard}>
            <MaterialCommunityIcons name="calendar" size={24} color="#4285F4" />
            <Text style={styles.quickInfoLabel}>Pay Date</Text>
            <Text style={styles.quickInfoValue}>27 Aug, 2021</Text>
          </View>

          <View style={styles.quickInfoCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FFB300" />
            <Text style={styles.quickInfoLabel}>Status</Text>
            <Text style={styles.quickInfoValue}>Pending</Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <MaterialCommunityIcons name="information" size={20} color="#666" />
          <Text style={styles.helpText}>
            Your payslip will be processed and available for download once approved by management.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeAreaTop: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  payslipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  typeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },
  statusContainer: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusRequested: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
    marginRight: 8,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default MyPayslipScreen;
