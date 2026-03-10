/**
 * Leave Details Screen
 * Displays detailed information about a specific leave application
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomNavBar } from '../components/BottomNavBar';
import { Leave } from '../types/leave.types';

type LeaveDetailsRouteParams = {
  LeaveDetails: {
    leave: Leave;
  };
};

type LeaveDetailsRouteProp = RouteProp<LeaveDetailsRouteParams, 'LeaveDetails'>;

export const LeaveDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LeaveDetailsRouteProp>();
  const { leave } = route.params;

  // Calculate leave days from date range (mock calculation)
  const leaveDays = 5; // In real app, calculate from dateRange
  const leaveAvailable = 10; // Mock data

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
        return 'Pending';
      case 'active':
        return 'Approved';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Leave',
      'Are you sure you want to reject this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            console.log('Leave rejected:', leave.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Leave',
      'Are you sure you want to approve this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            console.log('Leave approved:', leave.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {leave.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* User Info */}
            <View style={styles.userInfoSection}>
              <Text style={styles.userName}>{leave.name}</Text>
              <Text style={styles.dateRange}>{leave.dateRange}</Text>
              <Text style={styles.leaveApplication}>Leave Application</Text>
            </View>

            {/* Status and Time */}
            <View style={styles.rightSection}>
              <Text style={styles.daysAgo}>{leave.daysAgo}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(leave.status) },
                ]}
              >
                <Text style={styles.statusText}>{getStatusLabel(leave.status)}</Text>
              </View>
            </View>
          </View>

          {/* Leave Duration Display */}
          <View style={styles.durationSection}>
            <Text style={styles.daysCount}>{leaveDays} Days</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(leaveDays / leaveAvailable) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.leaveAvailable}>{leaveAvailable} Leave Available</Text>
          </View>

          {/* Reason Section */}
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason :</Text>
            <Text style={styles.reasonText}>
              Reference site about Lorem Ipsum, giving information on its origins, as well as a random Lipsum generator.
            </Text>
          </View>

          {/* Action Buttons for Pending */}
          {leave.status === 'requested' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for bottom nav bar
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#666',
  },
  userInfoSection: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  leaveApplication: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  daysAgo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  durationSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  daysCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  leaveAvailable: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  actionButtons: {
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5252',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
