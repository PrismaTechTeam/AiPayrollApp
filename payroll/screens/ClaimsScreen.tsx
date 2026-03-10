/**
 * Claims Screen (Employee View)
 * Display employee's submitted claims
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Header, ClaimCard, FilterTabs } from '../components/claims';
import type { Claim, ClaimStatus } from '../components/claims';

// Mock data
const MOCK_CLAIMS: Claim[] = [
  {
    id: '1',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Business Trip',
    location: 'Street, 4883 Pretty View Lane. City, NEW YORK.',
    startDate: '27 June',
    endDate: '25 July, 2021',
    amount: 1200.00,
    status: 'Reviewing',
    description: 'Business trip to New York for client meetings',
    submittedDate: '26 June, 2021',
  },
  {
    id: '2',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Business Conference',
    location: 'Street, 4883 Pretty View Lane. City, NEW YORK.',
    startDate: '27 June',
    endDate: '25 July, 2021',
    amount: 1200.00,
    status: 'Not Submitted',
    description: 'Attendance at annual tech conference',
  },
  {
    id: '3',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Business Conference',
    location: 'Street, 4883 Pretty View Lane. City, NEW YORK.',
    startDate: '27 June',
    endDate: '25 July, 2021',
    amount: 1200.00,
    status: 'Not Submitted',
    description: 'Workshop participation',
  },
  {
    id: '4',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Business Trip',
    location: 'Street, 4883 Pretty View Lane. City, NEW YORK.',
    startDate: '27 June',
    endDate: '25 July, 2021',
    amount: 1200.00,
    status: 'Reviewing',
    description: 'Regional office visit',
    submittedDate: '20 June, 2021',
  },
  {
    id: '5',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Client Meeting',
    location: 'Downtown Office, Los Angeles, CA',
    startDate: '10 May',
    endDate: '12 May, 2021',
    amount: 850.00,
    status: 'Approved',
    description: 'Client presentation and negotiation',
    submittedDate: '09 May, 2021',
    reviewedDate: '15 May, 2021',
    reviewedBy: 'Manager',
  },
  {
    id: '6',
    employeeId: 'E001',
    employeeName: 'John Doe',
    type: 'Training Workshop',
    location: 'Training Center, Boston, MA',
    startDate: '01 April',
    endDate: '03 April, 2021',
    amount: 650.00,
    status: 'Paid',
    description: 'Professional development workshop',
    submittedDate: '31 March, 2021',
    reviewedDate: '05 April, 2021',
    reviewedBy: 'Manager',
  },
];

export const ClaimsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState<ClaimStatus | 'All'>('All');

  const filters: Array<ClaimStatus | 'All'> = [
    'All',
    'Not Submitted',
    'Reviewing',
    'Approved',
    'Rejected',
    'Paid',
  ];

  const filteredClaims = MOCK_CLAIMS.filter((claim) => {
    if (selectedFilter === 'All') return true;
    return claim.status === selectedFilter;
  });

  const handleClaimPress = (claim: Claim) => {
    (navigation as any).navigate('ClaimDetails', { claim });
  };

  const handleDeleteClaim = (claimId: string) => {
    Alert.alert(
      'Delete Claim',
      'Are you sure you want to delete this claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Delete logic here
            Alert.alert('Success', 'Claim deleted successfully');
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>No claims found</Text>
      <Text style={styles.emptyStateSubtext}>
        {selectedFilter === 'All'
          ? 'Create your first claim using the + button'
          : `No claims with status "${selectedFilter}"`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Claims"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      <FilterTabs
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        filters={filters}
      />

      <FlatList
        data={filteredClaims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClaimCard
            claim={item}
            onPress={() => handleClaimPress(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredClaims.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClaim' as never)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default ClaimsScreen;
