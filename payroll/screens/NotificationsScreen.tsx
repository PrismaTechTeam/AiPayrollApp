/**
 * Notifications Screen
 * Displays all user notifications
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

interface Notification {
  id: string;
  type: 'leave' | 'request' | 'payslip' | 'attendance' | 'general';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

// Mock notifications data
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'leave',
    title: 'Leave Request Approved',
    message: 'Your leave request for 27 Aug - 28 Aug has been approved by your manager.',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'request',
    title: 'New Request Submitted',
    message: 'John Smith has submitted a new business trip request for your approval.',
    time: '5 hours ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'payslip',
    title: 'Payslip Available',
    message: 'Your payslip for August 2024 is now available. Tap to view details.',
    time: '1 day ago',
    isRead: true,
  },
  {
    id: '4',
    type: 'attendance',
    title: 'Attendance Reminder',
    message: 'Don\'t forget to check in for today. Your shift starts at 9:00 AM.',
    time: '2 days ago',
    isRead: true,
  },
  {
    id: '5',
    type: 'general',
    title: 'System Update',
    message: 'The payroll system will undergo maintenance on Sunday, 2:00 AM - 4:00 AM.',
    time: '3 days ago',
    isRead: true,
  },
];

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return 'calendar-clock';
      case 'request':
        return 'email-outline';
      case 'payslip':
        return 'file-document-outline';
      case 'attendance':
        return 'clock-check-outline';
      case 'general':
        return 'bell-outline';
      default:
        return 'bell-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'leave':
        return '#FF9800'; // Orange
      case 'request':
        return '#4CAF50'; // Green
      case 'payslip':
        return '#2196F3'; // Blue
      case 'attendance':
        return '#9C27B0'; // Purple
      case 'general':
        return '#666666'; // Gray
      default:
        return '#666666';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.id === notification.id ? { ...notif, isRead: true } : notif
      )
    );

    // Navigate based on notification type
    // In a real app, you would navigate to the relevant screen
    Alert.alert(notification.title, notification.message);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => setNotifications([]),
        },
      ]
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Actions Bar */}
      {notifications.length > 0 && (
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllAsRead}>
            <MaterialCommunityIcons name="check-all" size={18} color="#4285F4" />
            <Text style={styles.actionButtonText}>Mark all as read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#FF5252" />
            <Text style={[styles.actionButtonText, { color: '#FF5252' }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {notifications.length === 0 ? (
          // Empty State
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-off-outline" size={80} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Check back later for new notifications.
            </Text>
          </View>
        ) : (
          // Notifications List
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              {/* Unread Indicator */}
              {!notification.isRead && <View style={styles.unreadIndicator} />}

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getNotificationColor(notification.type) + '20' },
                ]}
              >
                <MaterialCommunityIcons
                  name={getNotificationIcon(notification.type)}
                  size={24}
                  color={getNotificationColor(notification.type)}
                />
              </View>

              {/* Content */}
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>

              {/* Chevron */}
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
            </TouchableOpacity>
          ))
        )}
        </ScrollView>
      </SafeAreaView>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#4285F4',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default NotificationsScreen;
