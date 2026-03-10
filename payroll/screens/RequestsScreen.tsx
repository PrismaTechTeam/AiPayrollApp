import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header, FilterTabs, RequestList } from '../components/requests';
import { BottomNavBar } from '../components/BottomNavBar';
import { getRequestsByStatus } from '../data/mockRequests';
import { RequestStatus } from '../types/request.types';

interface RequestsScreenProps {
  navigation?: any;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [activeTab, setActiveTab] = useState<RequestStatus>('requested');

  // Get requests based on active tab
  const requests = getRequestsByStatus(activeTab);

  const handleApprove = (requestId: string) => {
    console.log('Approve request:', requestId);
    // TODO: Add your approve logic here
    // Example: Call API to approve request
  };

  const handleReject = (requestId: string) => {
    console.log('Reject request:', requestId);
    // TODO: Add your reject logic here
    // Example: Call API to reject request
  };

  const handleCancel = (requestId: string) => {
    console.log('Cancel active request:', requestId);
    // TODO: Add your cancel logic here
    // Example: Call API to cancel an active request
  };

  const handleRestore = (requestId: string) => {
    console.log('Restore cancelled request:', requestId);
    // TODO: Add your restore logic here
    // Example: Call API to restore a cancelled request
  };

  const handleViewDetails = (request: any) => {
    console.log('📱 [RequestsScreen] handleViewDetails called for request:', request.id);
    console.log('📱 [RequestsScreen] Navigation object:', !!navigation);
    console.log('📱 [RequestsScreen] Request object:', request);
    
    try {
      // Navigate to request details screen with full request object
      navigation?.navigate('RequestDetails', { request });
      console.log('✅ [RequestsScreen] Navigation called successfully');
    } catch (error) {
      console.error('❌ [RequestsScreen] Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area - Manager Only: Request Approval */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Request Approval"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>
      
      {/* Content Area */}
      <View style={styles.content}>
        {/* Filter Tabs Component */}
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Request List Component - Manager can approve/reject/restore */}
        <View style={styles.listContainer}>
          <RequestList
            requests={requests}
            onPress={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={undefined}
            onRestore={handleRestore}
          />
        </View>
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeScreen="requests" />
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

export default RequestsScreen;

