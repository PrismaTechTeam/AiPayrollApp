/**
 * Request Details Screen
 * Displays detailed information about a specific request
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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../components/requests';
import { BottomNavBar } from '../components/BottomNavBar';
import requestService, { EmployeeRequest } from '../api/services/requestService';
import { useTheme } from '../context/ThemeContext';

type RequestDetailsRouteParams = {
  RequestDetails: {
    request: EmployeeRequest;
    canApprove?: boolean;
  };
};

type RequestDetailsRouteProp = RouteProp<RequestDetailsRouteParams, 'RequestDetails'>;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return '#FF9800';
    case 'APPROVED':
      return '#4CAF50';
    case 'REJECTED':
      return '#F44336';
    case 'CANCELLED':
      return '#9E9E9E';
    default:
      return '#9E9E9E';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
};

export const RequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<RequestDetailsRouteProp>();
  const { request, canApprove = false } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const statusColor = getStatusColor(request.status);

  const handleApprove = () => {
    Alert.alert('Approve Request', 'Are you sure you want to approve this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await requestService.approveRequest(request.id);
            Alert.alert('Success', 'Request approved successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            console.error('Failed to approve request:', error);
            Alert.alert('Error', 'Failed to approve request. Please try again.');
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
      await requestService.rejectRequest(request.id, rejectionReason.trim());
      Alert.alert('Success', 'Request rejected successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to reject request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setIsProcessing(false);
      setRejectionReason('');
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await requestService.cancelApplication(request.id);
            Alert.alert('Success', 'Request cancelled successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            console.error('Failed to cancel request:', error);
            Alert.alert('Error', 'Failed to cancel request. Please try again.');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Request Details"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      {/* Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '20' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: statusColor },
              ]}
            >
              {getStatusLabel(request.status)}
            </Text>
          </View>
        </View>

        {/* Request Card */}
        <View style={styles.detailsCard}>
          {/* Avatar and Name */}
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {(request.employeeName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {request.employeeName || 'Unknown Employee'}
              </Text>
              <Text style={styles.daysAgo}>{getTimeAgo(request.createdAt)}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Request Type */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={20}
                color={colors.icon}
              />
              <Text style={styles.detailLabel}>Request Type</Text>
            </View>
            <Text style={styles.detailValue}>{request.requestType}</Text>
          </View>

          {/* Start Date */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialCommunityIcons
                name="calendar-range"
                size={20}
                color={colors.icon}
              />
              <Text style={styles.detailLabel}>Start Date</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(request.startDate)}</Text>
          </View>

          {/* Request ID */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialCommunityIcons name="identifier" size={20} color={colors.icon} />
              <Text style={styles.detailLabel}>Request ID</Text>
            </View>
            <Text style={styles.detailValue}>{request.id}</Text>
          </View>

          {/* Employee Code */}
          {request.employeeCode && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <MaterialCommunityIcons name="badge-account-outline" size={20} color={colors.icon} />
                <Text style={styles.detailLabel}>Employee Code</Text>
              </View>
              <Text style={styles.detailValue}>{request.employeeCode}</Text>
            </View>
          )}

          {/* Notes */}
          {request.notes && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <MaterialCommunityIcons name="note-text-outline" size={20} color={colors.icon} />
                <Text style={styles.detailLabel}>Notes</Text>
              </View>
              <Text style={styles.detailValue}>{request.notes}</Text>
            </View>
          )}

          {/* Rejection Reason */}
          {request.status === 'REJECTED' && request.rejectionReason && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F44336" />
                <Text style={[styles.detailLabel, { color: '#F44336' }]}>Rejection Reason</Text>
              </View>
              <Text style={[styles.detailValue, { color: '#F44336' }]}>
                {request.rejectionReason}
              </Text>
            </View>
          )}

          {/* Submitted Date */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.icon} />
              <Text style={styles.detailLabel}>Submitted</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
          </View>
        </View>

        {/* Action Buttons for PENDING requests (owner: approve/reject) */}
        {request.status === 'PENDING' && canApprove && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectModal(true)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel button for PENDING requests (employee only, not owner) */}
        {request.status === 'PENDING' && !canApprove && (
          <View style={styles.cancelContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Cancel Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this request.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholderTextColor={colors.textTertiary}
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

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statusContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  daysAgo: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 28,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelContainer: {
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: '#FF5252',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalRejectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF5252',
  },
  modalRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
