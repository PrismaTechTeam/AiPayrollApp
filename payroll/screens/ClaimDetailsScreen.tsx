/**
 * Claim Details Screen
 * View detailed information about a claim (uses real data from API)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { File, Directory, Paths } from 'expo-file-system/next';
import { shareAsync } from 'expo-sharing';
import type { Claim } from '../components/claims';
import { STATUS_COLORS, STATUS_LABELS, STATUSES } from '../constants/statuses';
import claimService from '../api/services/claimService';

export const ClaimDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { claim, isOwner = false } = (route.params as { claim: Claim; isOwner?: boolean }) || {};

  if (!claim) {
    return (
      <View style={styles.container}>
        <Text>Claim not found</Text>
      </View>
    );
  }

  const statusColors = STATUS_COLORS[claim.status as keyof typeof STATUS_COLORS];
  const statusLabel = STATUS_LABELS[claim.status as keyof typeof STATUS_LABELS] || claim.status;

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case STATUSES.APPROVED: return 'check-circle';
      case STATUSES.REJECTED: return 'close-circle';
      case STATUSES.CANCELLED: return 'cancel';
      case STATUSES.DRAFT: return 'pencil-outline';
      default: return 'clock-outline';
    }
  };

  const getStatusBannerColor = (status: string): string => {
    switch (status) {
      case STATUSES.DRAFT: return '#999';
      case STATUSES.PENDING: return '#4285F4';
      case STATUSES.APPROVED: return '#34A853';
      case STATUSES.REJECTED: return '#EA4335';
      case STATUSES.CANCELLED: return '#546E7A';
      default: return '#999';
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const handleEdit = () => {
    if (claim.status === STATUSES.DRAFT) {
      Alert.alert('Edit Claim', 'Edit functionality coming soon');
    } else {
      Alert.alert('Cannot Edit', 'You can only edit draft claims');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Claim',
      'Are you sure you want to delete this claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
            Alert.alert('Info', 'Claim deletion coming soon');
          },
        },
      ]
    );
  };

  const [downloading, setDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = () => {
    Alert.alert('Approve Claim', 'Are you sure you want to approve this claim?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await claimService.approveClaim(claim.id);
            Alert.alert('Success', 'Claim approved successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            console.error('Failed to approve claim:', error);
            Alert.alert('Error', 'Failed to approve claim. Please try again.');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for rejection.');
      return;
    }
    setShowRejectModal(false);
    setIsProcessing(true);
    try {
      await claimService.rejectClaim(claim.id, rejectionReason.trim());
      Alert.alert('Success', 'Claim rejected successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to reject claim:', error);
      Alert.alert('Error', 'Failed to reject claim. Please try again.');
    } finally {
      setIsProcessing(false);
      setRejectionReason('');
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      const { url, fileName } = isOwner
        ? await claimService.getReceiptUrlAsOwner(claim.id)
        : await claimService.getReceiptUrl(claim.id);

      const destination = new Directory(Paths.cache, 'receipts');
      if (!destination.exists) {
        destination.create();
      }

      // Remove existing file with same name to avoid "Destination already exists" error
      const expectedFile = new File(destination, fileName);
      if (expectedFile.exists) {
        expectedFile.delete();
      }

      const downloadedFile = await File.downloadFileAsync(url, destination);

      if (!downloadedFile.exists) {
        Alert.alert('Error', 'Failed to download receipt');
        return;
      }

      await shareAsync(downloadedFile.uri, {
        dialogTitle: 'Save Receipt',
      });
    } catch (error: any) {
      console.error('Failed to download receipt:', error);
      const message = error?.response?.data?.message || 'Failed to download receipt. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Claim Details</Text>
          {!isOwner ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <MaterialCommunityIcons name="delete-outline" size={24} color="#EA4335" />
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteButton} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusBannerColor(claim.status) }]}>
          <MaterialCommunityIcons name={getStatusIcon(claim.status) as any} size={24} color="#FFFFFF" />
          <Text style={styles.statusBannerText}>{statusLabel}</Text>
        </View>

        {/* Claim Type & Amount */}
        <View style={styles.card}>
          <Text style={styles.claimType}>{claim.type}</Text>
          <Text style={styles.amount}>${claim.amount.toFixed(2)}</Text>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.iconLabel}>
              <MaterialCommunityIcons name="calendar" size={20} color="#666" />
              <Text style={styles.detailLabel}>Transaction Date</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(claim.transDate)}</Text>
          </View>

          <View style={styles.divider} />

          {claim.receiptNo && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.iconLabel}>
                  <MaterialCommunityIcons name="receipt" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Receipt No</Text>
                </View>
                <Text style={styles.detailValue}>{claim.receiptNo}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {claim.createdAt && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.iconLabel}>
                  <MaterialCommunityIcons name="calendar-check" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Submitted Date</Text>
                </View>
                <Text style={styles.detailValue}>{formatDate(claim.createdAt)}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {claim.approvedAt && (
            <View style={styles.detailRow}>
              <View style={styles.iconLabel}>
                <MaterialCommunityIcons name="account-check" size={20} color="#666" />
                <Text style={styles.detailLabel}>Reviewed Date</Text>
              </View>
              <Text style={styles.detailValue}>{formatDate(claim.approvedAt)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {claim.description && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{claim.description}</Text>
          </View>
        )}

        {/* Rejection Reason */}
        {claim.status === STATUSES.REJECTED && claim.rejectionReason && (
          <View style={[styles.card, styles.rejectionCard]}>
            <View style={styles.rejectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#EA4335" />
              <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            </View>
            <Text style={styles.rejectionReason}>{claim.rejectionReason}</Text>
          </View>
        )}

        {/* Attachment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          {claim.attachmentFileName ? (
            <TouchableOpacity
              style={styles.receiptItem}
              onPress={handleDownloadReceipt}
              disabled={downloading}
            >
              <MaterialCommunityIcons name="file-document" size={24} color="#4285F4" />
              <Text style={styles.receiptName} numberOfLines={1}>{claim.attachmentFileName}</Text>
              {downloading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <MaterialCommunityIcons name="download" size={20} color="#666" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyReceipts}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
              <Text style={styles.emptyReceiptsText}>No receipts attached</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {claim.status === STATUSES.DRAFT && !isOwner && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <MaterialCommunityIcons name="pencil" size={20} color="#4285F4" />
              <Text style={styles.editButtonText}>Edit Claim</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Approve/Reject Buttons for Owner */}
        {claim.status === STATUSES.PENDING && isOwner && (
          <View style={styles.approveRejectContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setShowRejectModal(true)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 20 }} />
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Claim</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this claim.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectButton}
                onPress={handleRejectConfirm}
              >
                <Text style={styles.modalRejectText}>Reject</Text>
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
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  deleteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, marginBottom: 20, gap: 12,
  },
  statusBannerText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16 },
  claimType: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 8 },
  amount: { fontSize: 32, fontWeight: '700', color: '#EA4335' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  detailRow: { paddingVertical: 12 },
  iconLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  detailLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#000', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  description: { fontSize: 15, lineHeight: 24, color: '#333' },
  rejectionCard: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EA4335' },
  rejectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rejectionTitle: { fontSize: 18, fontWeight: '700', color: '#EA4335' },
  rejectionReason: { fontSize: 15, lineHeight: 24, color: '#333' },
  receiptItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8, gap: 12 },
  receiptName: { flex: 1, fontSize: 15, color: '#000', fontWeight: '500' },
  emptyReceipts: { alignItems: 'center', paddingVertical: 40 },
  emptyReceiptsText: { fontSize: 14, color: '#999', marginTop: 12 },
  actionButtons: { marginBottom: 16 },
  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 2, borderColor: '#4285F4',
  },
  editButtonText: { fontSize: 16, fontWeight: '600', color: '#4285F4' },
  approveRejectContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#FF5252' },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, borderWidth: 1,
    borderColor: '#E0E0E0', fontSize: 16, color: '#000', minHeight: 100, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F5F5F5' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  modalRejectButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FF5252' },
  modalRejectText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});

export default ClaimDetailsScreen;
