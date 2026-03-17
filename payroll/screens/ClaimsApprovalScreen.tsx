/**
 * Claims Approval Screen (Owner View)
 * Approve or reject employee claims from real API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Header, ClaimCard, FilterTabs } from '../components/claims';
import type { Claim } from '../components/claims';
import claimService, { ClaimApplication } from '../api/services/claimService';
import { CLAIM_FILTERS } from '../constants/statuses';

export const ClaimsApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState<string>('PENDING');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const mapClaimFromApi = (item: ClaimApplication): Claim => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    type: item.claimTypeName || 'Claim',
    claimTypeId: item.claimTypeId,
    transDate: item.transDate,
    amount: item.amount,
    status: item.status as any,
    description: item.description || undefined,
    receiptNo: item.receiptNo || undefined,
    attachmentFileName: item.attachmentFileName,
    submittedFrom: item.submittedFrom,
    createdAt: item.createdAt,
    approvedAt: item.approvedAt,
    rejectionReason: item.rejectionReason,
  });

  const fetchClaims = useCallback(async () => {
    try {
      const result = await claimService.getAllClaims({ pageSize: 50 });
      const mapped = (result.items || []).map((item: ClaimApplication) => mapClaimFromApi(item));
      setClaims(mapped);
    } catch (err) {
      console.error('Failed to load claims for approval:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const filteredClaims = claims.filter((claim) => {
    if (selectedFilter === 'ALL') return true;
    return claim.status === selectedFilter;
  });

  const handleClaimPress = (claim: Claim) => {
    (navigation as any).navigate('ClaimDetails', { claim, isOwner: true });
  };

  const handleApproveClaim = (claim: Claim) => {
    Alert.alert(
      'Approve Claim',
      `Approve ${claim.type} claim for ${claim.employeeName || 'employee'} ($${claim.amount.toFixed(2)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await claimService.approveClaim(claim.id);
              Alert.alert('Success', 'Claim approved successfully');
              fetchClaims();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to approve claim');
            }
          },
        },
      ]
    );
  };

  const handleRejectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    if (!selectedClaim) return;

    try {
      await claimService.rejectClaim(selectedClaim.id, rejectionReason.trim());
      setShowRejectModal(false);
      Alert.alert('Success', 'Claim rejected successfully');
      setSelectedClaim(null);
      setRejectionReason('');
      fetchClaims();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reject claim');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No claims found</Text>
      <Text style={styles.emptyStateSubtext}>
        {selectedFilter === 'ALL'
          ? 'No employee claims to review'
          : `No claims with status "${selectedFilter}"`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Claims Approval"
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
          data={filteredClaims}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClaimCard
              claim={item}
              onPress={() => handleClaimPress(item)}
              onApprove={item.status === 'PENDING' ? () => handleApproveClaim(item) : undefined}
              onReject={item.status === 'PENDING' ? () => handleRejectClaim(item) : undefined}
              showEmployeeName={true}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filteredClaims.length === 0 && styles.emptyListContent,
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

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Claim</Text>
              <TouchableOpacity onPress={() => { setShowRejectModal(false); setRejectionReason(''); }}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedClaim && (
              <View style={styles.claimInfo}>
                <Text style={styles.claimInfoText}>
                  <Text style={styles.claimInfoLabel}>Employee: </Text>
                  {selectedClaim.employeeName || 'N/A'}
                </Text>
                <Text style={styles.claimInfoText}>
                  <Text style={styles.claimInfoLabel}>Type: </Text>
                  {selectedClaim.type}
                </Text>
                <Text style={styles.claimInfoText}>
                  <Text style={styles.claimInfoLabel}>Amount: </Text>
                  ${selectedClaim.amount.toFixed(2)}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Reason for Rejection *</Text>
            <TextInput
              style={styles.textInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter reason for rejecting this claim"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowRejectModal(false); setRejectionReason(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={submitRejection}>
                <Text style={styles.rejectButtonText}>Reject Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  claimInfo: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 20 },
  claimInfoText: { fontSize: 14, color: '#333', marginBottom: 6 },
  claimInfoLabel: { fontWeight: '600', color: '#666' },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 8 },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, fontSize: 15, color: '#000', height: 100, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  rejectButton: { flex: 1, backgroundColor: '#EA4335', borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

export default ClaimsApprovalScreen;
