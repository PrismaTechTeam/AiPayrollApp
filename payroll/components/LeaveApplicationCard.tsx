import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface LeaveApplicationCardProps {
  name: string;
  date: string;
  type: string;
  avatar?: string;
}

const AVATAR_COLORS = ['#4285F4', '#7B1FA2', '#00897B', '#F59E0B', '#EF4444'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const LeaveApplicationCard: React.FC<LeaveApplicationCardProps> = ({
  name,
  date,
  type,
  avatar,
}) => {
  const avatarBg = getAvatarColor(name);

  return (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: avatarBg }]}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.type}>{type}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton}>
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  details: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#4285F4',
    marginVertical: 2,
  },
  type: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  actions: {
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
