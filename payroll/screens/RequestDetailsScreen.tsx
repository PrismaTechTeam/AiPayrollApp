/**
 * Request Details Screen
 * Displays detailed information about a specific request
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../components/requests';
import { BottomNavBar } from '../components/BottomNavBar';
import { Request } from '../types/request.types';

type RequestDetailsRouteParams = {
  RequestDetails: {
    request: Request;
  };
};

type RequestDetailsRouteProp = RouteProp<RequestDetailsRouteParams, 'RequestDetails'>;

export const RequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RequestDetailsRouteProp>();
  const { request } = route.params;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'requested':
        return '#FF9800'; // Orange
      case 'active':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'requested':
        return 'Pending Approval';
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
                { backgroundColor: getStatusColor(request.status) + '20' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(request.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(request.status) },
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
                {request.avatarUrl ? (
                  <View style={[styles.avatar, styles.avatarImage]} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>
                      {request.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{request.name}</Text>
                <Text style={styles.daysAgo}>{request.daysAgo}</Text>
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
                  color="#666"
                />
                <Text style={styles.detailLabel}>Request Type</Text>
              </View>
              <Text style={styles.detailValue}>{request.type}</Text>
            </View>

            {/* Date Range */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <MaterialCommunityIcons
                  name="calendar-range"
                  size={20}
                  color="#666"
                />
                <Text style={styles.detailLabel}>Date Range</Text>
              </View>
              <Text style={styles.detailValue}>{request.dateRange}</Text>
            </View>

            {/* Request ID */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <MaterialCommunityIcons name="identifier" size={20} color="#666" />
                <Text style={styles.detailLabel}>Request ID</Text>
              </View>
              <Text style={styles.detailValue}>{request.id}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {request.status === 'requested' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => {
                  console.log('Reject request:', request.id);
                  // TODO: Implement reject logic
                  navigation.goBack();
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => {
                  console.log('Approve request:', request.id);
                  // TODO: Implement approve logic
                  navigation.goBack();
                }}
              >
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}

          {request.status === 'active' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  console.log('Cancel request:', request.id);
                  // TODO: Implement cancel logic
                  navigation.goBack();
                }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {request.status === 'cancelled' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.restoreButton]}
                onPress={() => {
                  console.log('Restore request:', request.id);
                  // TODO: Implement restore logic
                  navigation.goBack();
                }}
              >
                <MaterialCommunityIcons name="restore" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Restore Request</Text>
              </TouchableOpacity>
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for bottom nav bar
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
    backgroundColor: '#FFFFFF',
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
  avatarImage: {
    backgroundColor: '#4285F4',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#666',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  daysAgo: {
    fontSize: 14,
    color: '#999',
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
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 28,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF5252',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  restoreButton: {
    backgroundColor: '#4285F4',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

