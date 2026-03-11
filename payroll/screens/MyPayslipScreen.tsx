/**
 * My Payslip Screen (Employee View)
 * Displays employee's payslips from API
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { BottomNavBar } from '../components/BottomNavBar';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import payslipService, { PayslipListItem } from '../api/services/payslipService';

export const MyPayslipScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = usePayrollAuth();
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<PayslipListItem[]>([]);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const result = await payslipService.getList({ pageSize: 12 });
      setPayslips(result.items || []);
    } catch (error: any) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payslip: PayslipListItem) => {
    navigation.navigate('PayslipDetails' as never, { payrollRunId: payslip.payrollRunId, payslip } as never);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Payslips</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          {renderHeader()}
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading payslips...</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  if (payslips.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          {renderHeader()}
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>No payslips available</Text>
          <Text style={styles.emptySubtext}>Your payslips will appear here once processed</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  const latestPayslip = payslips[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        {renderHeader()}
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Latest Payslip Card */}
        <View style={styles.payslipCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-document" size={24} color="#4285F4" />
            <Text style={styles.cardTitle}>Latest Payslip</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Employee:</Text>
            <Text style={styles.value}>{user?.name || 'Employee'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Period:</Text>
            <Text style={styles.value}>
              {formatDate(latestPayslip.periodStart)} - {formatDate(latestPayslip.periodEnd)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Processed:</Text>
            <Text style={styles.value}>{formatDate(latestPayslip.processedDate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Gross Pay:</Text>
            <Text style={styles.value}>{formatCurrency(latestPayslip.grossPay)}</Text>
          </View>

          <View style={styles.netPayRow}>
            <Text style={styles.netPayLabel}>Net Pay</Text>
            <Text style={styles.netPayAmount}>{formatCurrency(latestPayslip.netPay)}</Text>
          </View>

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(latestPayslip)}
          >
            <Text style={styles.viewDetailsText}>View Full Breakdown</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#4285F4" />
          </TouchableOpacity>
        </View>

        {/* Previous Payslips */}
        {payslips.length > 1 && (
          <View>
            <Text style={styles.sectionTitle}>Previous Payslips</Text>
            {payslips.slice(1).map((ps) => (
              <TouchableOpacity
                key={ps.payrollRunId}
                style={styles.previousCard}
                onPress={() => handleViewDetails(ps)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.previousPeriod}>
                    {formatDate(ps.periodStart)} - {formatDate(ps.periodEnd)}
                  </Text>
                  <Text style={styles.previousDate}>Processed: {formatDate(ps.processedDate)}</Text>
                </View>
                <Text style={styles.previousAmount}>{formatCurrency(ps.netPay)}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  payslipCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginLeft: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: '600', color: '#000' },
  netPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  netPayLabel: { fontSize: 18, fontWeight: '700', color: '#000' },
  netPayAmount: { fontSize: 24, fontWeight: '700', color: '#34A853' },
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 12, borderRadius: 8, backgroundColor: '#E3F2FD' },
  viewDetailsText: { fontSize: 16, fontWeight: '600', color: '#4285F4', marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  previousCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8, gap: 12 },
  previousPeriod: { fontSize: 14, fontWeight: '600', color: '#000' },
  previousDate: { fontSize: 12, color: '#999', marginTop: 2 },
  previousAmount: { fontSize: 16, fontWeight: '700', color: '#000' },
});

export default MyPayslipScreen;
