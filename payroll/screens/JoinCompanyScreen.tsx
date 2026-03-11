/**
 * Join Company Screen
 * Search for companies and submit a join request (Phase 4)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import companyService, { CompanySearchResult } from '../api/services/companyService';

interface CompanyResult {
  id: string;
  name: string;
  logoUrl?: string | null;
  employeeCount?: number;
}

export const JoinCompanyScreen: React.FC = () => {
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [joinMessage, setJoinMessage] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await companyService.search(text);
        // Map CompanySearchResult to CompanyResult
        const mapped: CompanyResult[] = (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          logoUrl: c.logoUrl,
        }));
        setResults(mapped);
        setHasSearched(true);
      } catch (err: any) {
        Alert.alert('Search Error', err.message || 'Failed to search companies.');
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleRequestToJoin = (company: CompanyResult) => {
    setSelectedCompany(company);
    setJoinMessage('');
    setShowConfirmModal(true);
  };

  const handleConfirmJoinRequest = async () => {
    if (!selectedCompany) return;

    setSubmitting(true);
    try {
      const result = await companyService.submitJoinRequest(selectedCompany.id, joinMessage.trim() || undefined);
      setShowConfirmModal(false);
      (navigation.navigate as (name: string, params?: object) => void)('JoinRequestPending', {
        requestId: result.id,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit join request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCompanyItem = ({ item }: { item: CompanyResult }) => (
    <View style={styles.companyCard}>
      <View style={styles.companyLogoPlaceholder}>
        <MaterialCommunityIcons name="office-building" size={28} color="#4285F4" />
      </View>
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.name}</Text>
        {item.employeeCount !== undefined && (
          <Text style={styles.companyMeta}>
            {item.employeeCount} employee{item.employeeCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.joinRequestButton}
        onPress={() => handleRequestToJoin(item)}
      >
        <Text style={styles.joinRequestButtonText}>Request to Join</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    if (searching) return null;
    if (!hasSearched) return null;

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="magnify-close" size={64} color="#CCC" />
        <Text style={styles.emptyStateTitle}>No companies found</Text>
        <Text style={styles.emptyStateText}>Try a different search.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Join a Company</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search companies..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Loading Indicator */}
          {searching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4285F4" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {/* Results List */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderCompanyItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
          />
        </View>
      </SafeAreaView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Request</Text>
            <Text style={styles.modalDescription}>
              Send a request to join{' '}
              <Text style={styles.modalCompanyName}>{selectedCompany?.name}</Text>?
            </Text>

            <Text style={styles.modalLabel}>Message (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Introduce yourself or add a note..."
              value={joinMessage}
              onChangeText={setJoinMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, submitting && styles.modalConfirmDisabled]}
                onPress={handleConfirmJoinRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4285F4',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    height: 56,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  companyLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4285F410',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 12,
    color: '#999',
  },
  joinRequestButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinRequestButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#BBB',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalCompanyName: {
    fontWeight: '700',
    color: '#000',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default JoinCompanyScreen;
