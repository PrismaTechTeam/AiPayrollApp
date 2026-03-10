import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface LeaveApplicationCardProps {
  name: string;
  date: string;
  type: string;
  avatar?: string;
}

export const LeaveApplicationCard: React.FC<LeaveApplicationCardProps> = ({
  name,
  date,
  type,
  avatar,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
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
    backgroundColor: '#E0E0E0',
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
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  approveText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
});

