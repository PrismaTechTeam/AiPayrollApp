/**
 * Claims Approval Screen (Manager View)
 * Approve or reject employee claims
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Header, ClaimCard, FilterTabs } from '../components/claims';
import type { Claim, ClaimStatus } from '../components/claims';

// Mock data with multiple employees
const MOCK_CLAIMS: Claim[] = [
  {
    id: '1',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Business Trip',
    location: 'Street, 4883 Pretty View Lane. City, NEW YORK.',
    startDate: '27 June',
    endDate: '25 July, 2021',
    amount: 1200.00,
    status: 'Reviewing',
    description: 'Business trip to New York for client meetings',
    submittedDate: '26 June, 2021',
  },
  {
    id: '2',
    employeeId: 'E002',
    employeeName: 'Jane Smith',
    type: 'Business Conference',
    location: 'Convention Center, San Francisco, CA',
    startDate: '15 July',
    endDate: '18 July, 2021',
    amount: 1850.00,
    status: 'Reviewing',
    description: 'Annual tech conference attendance',
    submittedDate: '14 July, 2021',
  },
  {
    id: '3',
    employeeId: 'E003',
    employeeName: 'Mike Johnson',
    type: 'Client Meeting',
    location: 'Downtown Office, Los Angeles, CA',
    startDate: '10 June',
    endDate: '12 June, 2021',
    amount: 650.00,
    status: 'Reviewing',
    description: 'Client presentation and contract negotiation',
    submittedDate: '09 June, 2021',
  },
  {
    id: '4',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Training Workshop',
    location: 'Training Center, Boston, MA',
    startDate: '01 May',
    endDate: '03 May, 2021',
    amount: 450.00,
    status: 'Approved',
    description: 'Professional development workshop',
    submittedDate: '30 April, 2021',
    reviewedDate: '05 May, 2021',
    reviewedBy: 'Manager',
  },
  {
    id: '5',
    employeeId: 'E004',
    employeeName: 'Sarah Williams',
    type: 'Equipment Purchase',
    location: 'Office Supply Store, Chicago, IL',
    startDate: '20 June',
    endDate: '20 June, 2021',
    amount: 350.00,
    status: 'Rejected',
    description: 'Laptop accessories purchase',
    submittedDate: '20 June, 2021',
    reviewedDate: '22 June, 2021',
    reviewedBy: 'Manager',
    rejectionReason: 'Please use company vendor for equipment purchases',
  },
  {
    id: '6',
    employeeId: 'E002',
    employeeName: 'Jane Smith',
    type: 'Transportation',
    location: 'Airport Parking, Seattle, WA',
    startDate: '05 June',
    endDate: '07 June, 2021',
    amount: 120.00,
    status: 'Paid',
    description: 'Parking fees during business trip',
    submittedDate: '04 June, 2021',
    reviewedDate: '08 June, 2021',
    reviewedBy: 'Manager',
  },
];

export const ClaimsApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState<ClaimStatus | 'All'>('Reviewing');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filters: Array<ClaimStatus | 'All'> = [
    'All',
    'Reviewing',
    'Approved',
    'Rejected',
    'Paid',
  ];

  const filteredClaims = MOCK_CLAIMS.filter((claim) => {
    if (selectedFilter === 'All') return true;
    return claim.status === selectedFilter;
  });

  const handleClaimPress = (claim: Claim) => {
    (navigation as any).navigate('ClaimDetails', { claim });
  };

  const handleApproveClaim = (claim: Claim) => {
    Alert.alert(
      'Approve Claim',
      `Approve ${claim.type} claim for ${claim.employeeName} (${claim.amount.toFixed(2)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            // Approve logic here
            Alert.alert('Success', 'Claim approved successfully');
          },
        },
      ]
    );
  };

  const handleRejectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowRejectModal(true);
  };

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setShowRejectModal(false);
    // Reject logic here
    Alert.alert('Success', 'Claim rejected successfully');
    setRejectionReason('');
    setSelectedClaim(null);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No claims found</Text>
      <Text style={styles.emptyStateSubtext}>
        {selectedFilter === 'All'
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
        filters={filters}
      />

      <FlatList
        data={filteredClaims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClaimCard
            claim={item}
            onPress={() => handleClaimPress(item)}
            onApprove={item.status === 'Reviewing' ? () => handleApproveClaim(item) : undefined}
            onReject={item.status === 'Reviewing' ? () => handleRejectClaim(item) : undefined}
            showEmployeeName={true}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredClaims.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

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
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedClaim && (
              <View style={styles.claimInfo}>
                <Text style={styles.claimInfoText}>
                  <Text style={styles.claimInfoLabel}>Employee: </Text>
                  {selectedClaim.employeeName}
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
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={submitRejection}
              >
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  claimInfo: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  claimInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  claimInfoLabel: {
    fontWeight: '600',
    color: '#666',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
    height: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EA4335',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ClaimsApprovalScreen;
