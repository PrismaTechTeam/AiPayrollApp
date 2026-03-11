/**
 * Payslip Details Screen
 * Displays full payslip breakdown from API
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../components/payslips';
import { BottomNavBar } from '../components/BottomNavBar';
import payslipService, { PayslipDetail } from '../api/services/payslipService';

type PayslipDetailsRouteParams = {
  PayslipDetails: {
    payrollRunId?: string;
    payslip?: any;
  };
};

type PayslipDetailsRouteProp = RouteProp<PayslipDetailsRouteParams, 'PayslipDetails'>;

export const PayslipDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PayslipDetailsRouteProp>();
  const { payrollRunId, payslip: legacyPayslip } = route.params || {};

  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    const id = payrollRunId || legacyPayslip?.payrollRunId;
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await payslipService.getDetail(id);
      setDetail(data);
    } catch (err: any) {
      console.error('Failed to load payslip detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const handleDownloadPdf = () => {
    Alert.alert('Info', 'PDF download will be available in a future update');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <Header title="Payment Details" onBackPress={() => navigation.goBack()} showBackButton={true} />
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
        <BottomNavBar />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <Header title="Payment Details" onBackPress={() => navigation.goBack()} showBackButton={true} />
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#999' }}>Payslip not found</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  const incomeItems = [
    { label: 'Basic Wages', amount: detail.wages },
    { label: 'Allowance', amount: detail.allowance },
    { label: 'Overtime', amount: detail.overtime },
    { label: 'Commission', amount: detail.commission },
    { label: 'Bonus', amount: detail.bonus },
    { label: 'Claims', amount: detail.claims },
    { label: 'Others', amount: detail.others },
  ].filter(item => item.amount > 0);

  const deductionItems = [
    { label: 'Deduction', amount: detail.deduction },
    { label: 'Loan', amount: detail.loan },
    { label: 'Advance Deduction', amount: detail.advanceDeduct },
    { label: 'Unpaid Leave', amount: detail.unpaidLeave },
  ].filter(item => item.amount > 0);

  const statutoryItems = [
    { label: 'EPF (Employee)', amount: detail.employeeEpf },
    { label: 'SOCSO (Employee)', amount: detail.employeeSocso },
    { label: 'EIS (Employee)', amount: detail.employeeEis },
    { label: 'PCB / Tax', amount: detail.pcb },
    { label: 'Zakat', amount: detail.zakat },
  ].filter(item => item.amount > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header title="Payslip Details" onBackPress={() => navigation.goBack()} showBackButton={true} />
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Employee Info */}
        <View style={styles.card}>
          <Text style={styles.employeeName}>{detail.employeeName}</Text>
          <Text style={styles.employeeCode}>{detail.employeeCode}</Text>
          <Text style={styles.period}>
            {formatDate(detail.periodStart)} - {formatDate(detail.periodEnd)}
          </Text>
        </View>

        {/* Net Pay Highlight */}
        <View style={styles.netPayCard}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayAmount}>{formatCurrency(detail.netPay)}</Text>
        </View>

        {/* Income */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Income</Text>
          {incomeItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.lineLabel}>{item.label}</Text>
              <Text style={styles.lineAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross Pay</Text>
            <Text style={styles.totalAmount}>{formatCurrency(detail.grossPay)}</Text>
          </View>
        </View>

        {/* Deductions */}
        {deductionItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            {deductionItems.map((item, i) => (
              <View key={i} style={styles.lineItem}>
                <Text style={styles.lineLabel}>{item.label}</Text>
                <Text style={[styles.lineAmount, { color: '#EA4335' }]}>-{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Statutory Deductions */}
        {statutoryItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Statutory Deductions</Text>
            {statutoryItems.map((item, i) => (
              <View key={i} style={styles.lineItem}>
                <Text style={styles.lineLabel}>{item.label}</Text>
                <Text style={[styles.lineAmount, { color: '#EA4335' }]}>-{formatCurrency(item.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={[styles.totalAmount, { color: '#EA4335' }]}>-{formatCurrency(detail.grossDeductions)}</Text>
            </View>
          </View>
        )}

        {/* Download PDF */}
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPdf}>
          <MaterialCommunityIcons name="download" size={20} color="#4285F4" />
          <Text style={styles.downloadText}>Download PDF</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16 },
  employeeName: { fontSize: 20, fontWeight: '700', color: '#000' },
  employeeCode: { fontSize: 14, color: '#666', marginTop: 2 },
  period: { fontSize: 14, color: '#4285F4', fontWeight: '600', marginTop: 8 },
  netPayCard: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 20, marginBottom: 16,
    alignItems: 'center',
  },
  netPayLabel: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  netPayAmount: { fontSize: 36, fontWeight: '700', color: '#2E7D32', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  lineLabel: { fontSize: 14, color: '#666' },
  lineAmount: { fontSize: 14, fontWeight: '600', color: '#000' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: '#E0E0E0', marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#000' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#000' },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#4285F4', marginBottom: 16,
  },
  downloadText: { fontSize: 16, fontWeight: '600', color: '#4285F4' },
});
