/**
 * Payslip Details Screen (Payment Details)
 * Displays detailed information about a specific payslip with payment action
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../components/payslips';
import { BottomNavBar } from '../components/BottomNavBar';
import { Payslip } from '../types/payslip.types';

type PayslipDetailsRouteParams = {
  PayslipDetails: {
    payslip: Payslip;
  };
};

type PayslipDetailsRouteProp = RouteProp<PayslipDetailsRouteParams, 'PayslipDetails'>;

export const PayslipDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PayslipDetailsRouteProp>();
  const { payslip } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Payment Details"
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
        {/* Main Payment Card */}
        <View style={styles.paymentCard}>
          {/* Recipient/Transaction Details Section */}
          <View style={styles.transactionSection}>
            {/* Left: Avatar */}
            <View style={styles.avatarContainer}>
              {payslip.avatarUrl ? (
                <View style={[styles.avatar, styles.avatarImage]} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {payslip.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Middle: Name, Date Range, Type */}
            <View style={styles.middleSection}>
              <Text style={styles.recipientName}>{payslip.name}</Text>
              <Text style={styles.dateRange}>{payslip.dateRange}</Text>
              <Text style={styles.paymentType}>{payslip.type}</Text>
            </View>

            {/* Right: Date and Amount */}
            <View style={styles.rightSection}>
              <Text style={styles.date}>{payslip.date}</Text>
              <View style={styles.amountContainer}>
                <MaterialCommunityIcons name="paperclip" size={16} color="#4285F4" />
                <Text style={styles.amount}>{payslip.amount}</Text>
              </View>
            </View>
          </View>

          {/* Support Document Section */}
          <View style={styles.documentSection}>
            <Text style={styles.documentHeading}>Support Document</Text>
            <View style={styles.documentPlaceholder}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#999" />
              <Text style={styles.documentPlaceholderText}>Document Preview</Text>
            </View>
          </View>
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
    backgroundColor: '#F5F5F5', // Light gray background
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
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  transactionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: '#4285F4',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  paymentType: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336', // Red color for amount
  },
  documentSection: {
    marginBottom: 24,
  },
  documentHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  documentPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  documentPlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
