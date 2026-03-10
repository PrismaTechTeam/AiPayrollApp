import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header, FilterTabs, LeaveList } from '../components/leaves';
import { BottomNavBar } from '../components/BottomNavBar';
import { getLeavesByStatus } from '../data/mockLeaves';
import { LeaveStatus } from '../types/leave.types';

interface LeavesScreenProps {
  navigation?: any;
}

export const LeavesScreen: React.FC<LeavesScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [activeTab, setActiveTab] = useState<LeaveStatus>('requested');

  // Get leaves based on active tab
  const leaves = getLeavesByStatus(activeTab);

  const handleApprove = (leaveId: string) => {
    console.log('Approve leave:', leaveId);
    // TODO: Add your approve logic here
    // Example: Call API to approve leave
  };

  const handleReject = (leaveId: string) => {
    console.log('Reject leave:', leaveId);
    // TODO: Add your reject logic here
    // Example: Call API to reject leave
  };

  const handleCancel = (leaveId: string) => {
    console.log('Cancel active leave:', leaveId);
    // TODO: Add your cancel logic here
    // Example: Call API to cancel an active leave
  };

  const handleRestore = (leaveId: string) => {
    console.log('Restore cancelled leave:', leaveId);
    // TODO: Add your restore logic here
    // Example: Call API to restore a cancelled leave
  };

  const handleViewDetails = (leave: any) => {
    console.log('📱 [LeavesScreen] handleViewDetails called for leave:', leave.id);
    console.log('📱 [LeavesScreen] Navigation object:', !!navigation);
    console.log('📱 [LeavesScreen] Leave object:', leave);
    
    try {
      // Navigate to leave details screen with full leave object
      navigation?.navigate('LeaveDetails', { leave });
      console.log('✅ [LeavesScreen] Navigation called successfully');
    } catch (error) {
      console.error('❌ [LeavesScreen] Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area - Manager Only: Leave Approval */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Leave Approval"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>
      
      {/* Content Area */}
      <View style={styles.content}>
        {/* Filter Tabs Component */}
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Leave List Component - Manager can approve/reject/restore */}
        <View style={styles.listContainer}>
          <LeaveList
            leaves={leaves}
            onPress={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={undefined}
            onRestore={handleRestore}
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

export default LeavesScreen;
