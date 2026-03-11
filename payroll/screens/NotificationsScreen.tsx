/**
 * Notifications Screen
 * Displays user notifications from API with real-time push notification support.
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
import notificationService, { NotificationItem } from '../api/services/notificationService';

// Parse notification message to determine type for icon/color
function inferNotificationType(message: string): 'leave' | 'claim' | 'payslip' | 'attendance' | 'general' {
  const lower = message.toLowerCase();
  if (lower.includes('leave')) return 'leave';
  if (lower.includes('claim')) return 'claim';
  if (lower.includes('payslip') || lower.includes('salary')) return 'payslip';
  if (lower.includes('attendance') || lower.includes('clock') || lower.includes('check in')) return 'attendance';
  return 'general';
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'leave': return 'calendar-clock';
    case 'claim': return 'receipt';
    case 'payslip': return 'file-document-outline';
    case 'attendance': return 'clock-check-outline';
    default: return 'bell-outline';
  }
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'leave': return '#FF9800';
    case 'claim': return '#4CAF50';
    case 'payslip': return '#2196F3';
    case 'attendance': return '#9C27B0';
    default: return '#666666';
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await notificationService.getList({ page: 1, pageSize: 50 });
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      Alert.alert('Error', 'Failed to mark all as read');
    }
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
          onPress: async () => {
            try {
              await notificationService.clearAll();
              setNotifications([]);
              setUnreadCount(0);
            } catch (err) {
              console.error('Failed to clear notifications:', err);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const type = inferNotificationType(item.message);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.notificationCardUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadIndicator} />}

        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(type) + '20' },
          ]}
        >
          <MaterialCommunityIcons
            name={getNotificationIcon(type) as any}
            size={24}
            color={getNotificationColor(type)}
          />
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotificationItem}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={80} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No Notifications</Text>
              <Text style={styles.emptyStateText}>
                You're all caught up! Check back later for new notifications.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchNotifications();
          }}
        />
      )}
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
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  badge: {
    backgroundColor: '#FF5252', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  actionsBar: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20,
    paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#4285F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 20 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  notificationCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative',
  },
  notificationCardUnread: { backgroundColor: '#F0F8FF', borderLeftWidth: 3, borderLeftColor: '#4285F4' },
  unreadIndicator: {
    position: 'absolute', top: 16, right: 16, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#4285F4',
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  notificationContent: { flex: 1, marginRight: 8 },
  notificationMessage: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 6 },
  notificationTime: { fontSize: 12, color: '#999' },
});

export default NotificationsScreen;
