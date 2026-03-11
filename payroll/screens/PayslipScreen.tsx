import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/payslips';
import { BottomNavBar } from '../components/BottomNavBar';
import payslipService, { PayslipListItem } from '../api/services/payslipService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface PayslipScreenProps {
  navigation?: any;
}

export const PayslipScreen: React.FC<PayslipScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [payslips, setPayslips] = useState<PayslipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const result = await payslipService.getList({ year: selectedYear, pageSize: 50 });
      setPayslips(result.items || []);
    } catch (err: any) {
      console.error('Failed to load payslips:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleViewDetails = (payslip: PayslipListItem) => {
    navigation?.navigate('PayslipDetails', { payrollRunId: payslip.payrollRunId, payslip });
  };

  const renderPayslipItem = ({ item }: { item: PayslipListItem }) => (
    <TouchableOpacity style={styles.payslipCard} onPress={() => handleViewDetails(item)} activeOpacity={0.7}>
      <View style={styles.payslipHeader}>
        <Text style={styles.payslipPeriod}>
          {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#E8F5E9' : '#E3F2FD' }]}>
          <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#2E7D32' : '#1565C0' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.processedDate}>Processed: {formatDate(item.processedDate)}</Text>
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Gross</Text>
          <Text style={styles.amountValue}>{formatCurrency(item.grossPay)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountLabel}>Net Pay</Text>
          <Text style={[styles.amountValue, { color: '#34A853' }]}>{formatCurrency(item.netPay)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 3; y--) years.push(y);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Payslip Management"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      {/* Year Filter */}
      <View style={styles.yearFilter}>
        {years.map(y => (
          <TouchableOpacity
            key={y}
            style={[styles.yearButton, selectedYear === y && styles.yearButtonActive]}
            onPress={() => setSelectedYear(y)}
          >
            <Text style={[styles.yearText, selectedYear === y && styles.yearTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
          </View>
        ) : payslips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No payslips for {selectedYear}</Text>
          </View>
        ) : (
          <FlatList
            data={payslips}
            keyExtractor={(item) => item.payrollRunId}
            renderItem={renderPayslipItem}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  yearFilter: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  yearButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  yearButtonActive: { backgroundColor: '#4285F4' },
  yearText: { fontSize: 14, fontWeight: '600', color: '#666' },
  yearTextActive: { color: '#FFFFFF' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  payslipCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  payslipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  payslipPeriod: { fontSize: 16, fontWeight: '700', color: '#000' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  processedDate: { fontSize: 12, color: '#999', marginBottom: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { fontSize: 12, color: '#666' },
  amountValue: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 2 },
});

export default PayslipScreen;
