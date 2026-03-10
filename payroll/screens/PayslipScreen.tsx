import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header, FilterTabs, PayslipList } from '../components/payslips';
import { BottomNavBar } from '../components/BottomNavBar';
import { getPayslipsByStatus } from '../data/mockPayslips';
import { PayslipStatus } from '../types/payslip.types';

interface PayslipScreenProps {
  navigation?: any;
}

export const PayslipScreen: React.FC<PayslipScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [activeTab, setActiveTab] = useState<PayslipStatus>('requested');

  // Get payslips based on active tab
  const payslips = getPayslipsByStatus(activeTab);

  const handleApprove = (payslipId: string) => {
    console.log('Approve payslip:', payslipId);
    // TODO: Add your approve logic here
    // Example: Call API to approve payslip
  };

  const handleReject = (payslipId: string) => {
    console.log('Reject payslip:', payslipId);
    // TODO: Add your reject logic here
    // Example: Call API to reject payslip
  };

  const handleCancel = (payslipId: string) => {
    console.log('Cancel payslip:', payslipId);
    // TODO: Add your cancel logic here
    // Example: Call API to cancel a payslip
  };

  const handleViewDetails = (payslip: any) => {
    console.log('📱 [PayslipScreen] handleViewDetails called for payslip:', payslip.id);
    console.log('📱 [PayslipScreen] Navigation object:', !!navigation);
    console.log('📱 [PayslipScreen] Payslip object:', payslip);
    
    try {
      // Navigate to payslip details screen with full payslip object
      navigation?.navigate('PayslipDetails', { payslip });
      console.log('✅ [PayslipScreen] Navigation called successfully');
    } catch (error) {
      console.error('❌ [PayslipScreen] Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area - Manager Only: Payslip Management */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Payslip Management"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>
      
      {/* Content Area */}
      <View style={styles.content}>
        {/* Filter Tabs Component */}
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Payslip List Component - Manager can approve/reject */}
        <View style={styles.listContainer}>
          <PayslipList
            payslips={payslips}
            onPress={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={undefined}
          />
        </View>
      </View>

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
  content: {
    flex: 1,
    paddingBottom: 80, // Space for bottom nav bar
  },
  listContainer: {
    flex: 1,
  },
});

export default PayslipScreen;
