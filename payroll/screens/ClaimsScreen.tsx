/**
 * Claims Screen (Employee View)
 * Display employee's submitted claims from API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Header, ClaimCard, FilterTabs } from '../components/claims';
import type { Claim, ClaimStatus } from '../components/claims';
import claimService, { ClaimApplication } from '../api/services/claimService';
// CLAIM_FILTERS imported by FilterTabs component internally

export const ClaimsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters from statuses.ts used by FilterTabs default

  const fetchClaims = useCallback(async () => {
    try {
      const status = selectedFilter === 'ALL' ? undefined : selectedFilter;
      const result = await claimService.getApplications({ page: 1, pageSize: 50, status });
      const mapped: Claim[] = (result.items || []).map(mapClaimFromApi);
      setClaims(mapped);
    } catch (err: any) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    setLoading(true);
    fetchClaims();
  }, [fetchClaims]);

  const mapClaimFromApi = (item: ClaimApplication): Claim => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    type: item.claimTypeName || 'Claim',
    claimTypeId: item.claimTypeId,
    transDate: item.transDate,
    amount: item.amount,
    status: item.status as ClaimStatus,
    description: item.description || undefined,
    receiptNo: item.receiptNo || undefined,
    attachmentFileName: item.attachmentFileName,
    submittedFrom: item.submittedFrom,
    createdAt: item.createdAt,
    approvedAt: item.approvedAt,
    rejectionReason: item.rejectionReason,
  });

  const handleClaimPress = (claim: Claim) => {
    (navigation as any).navigate('ClaimDetails', { claim });
  };

  const handleDeleteClaim = (claimId: string) => {
    Alert.alert(
      'Delete Claim',
      'Are you sure you want to delete this claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Delete functionality coming soon');
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No claims found</Text>
      <Text style={styles.emptyStateSubtext}>
        {selectedFilter === 'ALL'
          ? 'Create your first claim using the + button'
          : `No claims with status "${selectedFilter}"`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Claims"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      <FilterTabs
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClaimCard
              claim={item}
              onPress={() => handleClaimPress(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            claims.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchClaims();
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClaim' as never)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 100 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
});

export default ClaimsScreen;
