/**
 * Claim Details Screen
 * View detailed information about a claim
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { Claim } from '../components/claims';

export const ClaimDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const claim = (route.params as { claim: Claim })?.claim;

  if (!claim) {
    return (
      <View style={styles.container}>
        <Text>Claim not found</Text>
      </View>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Not Submitted':
        return '#999';
      case 'Reviewing':
        return '#4285F4';
      case 'Approved':
        return '#34A853';
      case 'Rejected':
        return '#EA4335';
      case 'Paid':
        return '#FBBC04';
      default:
        return '#999';
    }
  };

  const handleEdit = () => {
    if (claim.status === 'Not Submitted') {
      Alert.alert('Edit Claim', 'Edit functionality coming soon');
    } else {
      Alert.alert('Cannot Edit', 'You can only edit claims that have not been submitted');
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
            Alert.alert('Success', 'Claim deleted successfully');
          },
        },
      ]
    );
  };

  const handleDownloadReceipt = () => {
    Alert.alert('Download', 'Receipt download functionality coming soon');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Claim Details</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <MaterialCommunityIcons name="delete-outline" size={24} color="#EA4335" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(claim.status) }]}>
          <MaterialCommunityIcons
            name={
              claim.status === 'Approved'
                ? 'check-circle'
                : claim.status === 'Rejected'
                ? 'close-circle'
                : claim.status === 'Paid'
                ? 'cash-check'
                : 'clock-outline'
            }
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.statusBannerText}>{claim.status}</Text>
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
              <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
              <Text style={styles.detailLabel}>Location</Text>
            </View>
            <Text style={styles.detailValue}>{claim.location}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconLabel}>
              <MaterialCommunityIcons name="calendar-start" size={20} color="#666" />
              <Text style={styles.detailLabel}>Start Date</Text>
            </View>
            <Text style={styles.detailValue}>{claim.startDate}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconLabel}>
              <MaterialCommunityIcons name="calendar-end" size={20} color="#666" />
              <Text style={styles.detailLabel}>End Date</Text>
            </View>
            <Text style={styles.detailValue}>{claim.endDate}</Text>
          </View>

          {claim.submittedDate && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.iconLabel}>
                  <MaterialCommunityIcons name="calendar-check" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Submitted Date</Text>
                </View>
                <Text style={styles.detailValue}>{claim.submittedDate}</Text>
              </View>
            </>
          )}

          {claim.reviewedDate && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.iconLabel}>
                  <MaterialCommunityIcons name="account-check" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Reviewed Date</Text>
                </View>
                <Text style={styles.detailValue}>{claim.reviewedDate}</Text>
              </View>
            </>
          )}

          {claim.reviewedBy && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.iconLabel}>
                  <MaterialCommunityIcons name="account-tie" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Reviewed By</Text>
                </View>
                <Text style={styles.detailValue}>{claim.reviewedBy}</Text>
              </View>
            </>
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
        {claim.status === 'Rejected' && claim.rejectionReason && (
          <View style={[styles.card, styles.rejectionCard]}>
            <View style={styles.rejectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#EA4335" />
              <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            </View>
            <Text style={styles.rejectionReason}>{claim.rejectionReason}</Text>
          </View>
        )}

        {/* Receipts */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          {claim.receipts && claim.receipts.length > 0 ? (
            <View style={styles.receiptsList}>
              {claim.receipts.map((receipt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.receiptItem}
                  onPress={handleDownloadReceipt}
                >
                  <MaterialCommunityIcons name="file-document" size={24} color="#4285F4" />
                  <Text style={styles.receiptName}>Receipt {index + 1}</Text>
                  <MaterialCommunityIcons name="download" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyReceipts}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
              <Text style={styles.emptyReceiptsText}>No receipts attached</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {claim.status === 'Not Submitted' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <MaterialCommunityIcons name="pencil" size={20} color="#4285F4" />
              <Text style={styles.editButtonText}>Edit Claim</Text>
            </TouchableOpacity>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 20 }} />
      </ScrollView>
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  claimType: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EA4335',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    paddingVertical: 12,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  rejectionCard: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EA4335',
  },
  rejectionReason: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  receiptsList: {
    gap: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    gap: 12,
  },
  receiptName: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  emptyReceipts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyReceiptsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  actionButtons: {
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
});

export default ClaimDetailsScreen;
