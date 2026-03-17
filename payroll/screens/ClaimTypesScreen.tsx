/**
 * Claim Types Management Screen (Owner/HR)
 * CRUD for claim types using web API /api/Claim
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import claimService, { ClaimTypeDetail, CreateClaimTypePayload } from '../api/services/claimService';

export const ClaimTypesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [types, setTypes] = useState<ClaimTypeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ClaimTypeDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [claimCategory, setClaimCategory] = useState('');
  const [yearlyLimit, setYearlyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [requireReceipt, setRequireReceipt] = useState(false);

  const fetchTypes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await claimService.getClaimTypes();
      setTypes(data);
    } catch (err) {
      console.error('Failed to load claim types:', err);
      Alert.alert('Error', 'Failed to load claim types');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreateModal = () => {
    setEditingType(null);
    setShortCode('');
    setDescription('');
    setClaimCategory('');
    setYearlyLimit('');
    setMonthlyLimit('');
    setRequireReceipt(false);
    setShowModal(true);
  };

  const openEditModal = (item: ClaimTypeDetail) => {
    setEditingType(item);
    setShortCode(item.shortCode);
    setDescription(item.description || '');
    setClaimCategory(item.claimCategory || '');
    setYearlyLimit(item.defaultYearlyLimit?.toString() || '');
    setMonthlyLimit(item.defaultMonthlyLimit?.toString() || '');
    setRequireReceipt(item.requireReceipt);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!shortCode.trim()) {
      Alert.alert('Validation', 'Short code is required');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateClaimTypePayload = {
        shortCode: shortCode.trim(),
        description: description.trim() || undefined,
        claimCategory: claimCategory.trim() || undefined,
        defaultYearlyLimit: yearlyLimit ? parseFloat(yearlyLimit) : undefined,
        defaultMonthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
        requireReceipt,
      };

      if (editingType) {
        await claimService.updateClaimType(editingType.id, payload);
        Alert.alert('Success', 'Claim type updated');
      } else {
        await claimService.createClaimType({ ...payload, status: 'Active' });
        Alert.alert('Success', 'Claim type created');
      }
      setShowModal(false);
      fetchTypes();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save claim type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ClaimTypeDetail) => {
    Alert.alert(
      'Delete Claim Type',
      `Are you sure you want to delete "${item.description || item.shortCode}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await claimService.deleteClaimType(item.id);
              Alert.alert('Success', 'Claim type deleted');
              fetchTypes();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (val: number | null) => {
    if (val == null) return '-';
    return `$${val.toLocaleString()}`;
  };

  const renderItem = ({ item }: { item: ClaimTypeDetail }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardCode}>{item.shortCode}</Text>
          {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          {item.claimCategory && <Text style={styles.cardCategory}>{item.claimCategory}</Text>}
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.statusBadgeText, { color: item.status === 'Active' ? '#4CAF50' : '#FF9800' }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.limitsRow}>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Yearly Limit</Text>
          <Text style={styles.limitValue}>{formatCurrency(item.defaultYearlyLimit)}</Text>
        </View>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Monthly Limit</Text>
          <Text style={styles.limitValue}>{formatCurrency(item.defaultMonthlyLimit)}</Text>
        </View>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Receipt</Text>
          <Text style={[styles.limitValue, { color: item.requireReceipt ? '#4CAF50' : '#999' }]}>
            {item.requireReceipt ? 'Required' : 'No'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#4285F4" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <MaterialCommunityIcons name="delete-outline" size={18} color="#FF5252" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Claim Types</Text>
          <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
            <MaterialCommunityIcons name="plus" size={24} color="#4285F4" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : (
        <FlatList
          data={types}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, types.length === 0 && styles.emptyListContent]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt-text-plus-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No claim types yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create one</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchTypes(true)} colors={['#4285F4']} tintColor="#4285F4" />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingType ? 'Edit Claim Type' : 'New Claim Type'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Short Code *</Text>
            <TextInput
              style={styles.textInput}
              value={shortCode}
              onChangeText={setShortCode}
              placeholder="e.g. MEDICAL"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Medical Expenses"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.textInput}
              value={claimCategory}
              onChangeText={setClaimCategory}
              placeholder="e.g. Healthcare, Travel"
              placeholderTextColor="#999"
            />

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Yearly Limit</Text>
                <TextInput
                  style={styles.textInput}
                  value={yearlyLimit}
                  onChangeText={setYearlyLimit}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Monthly Limit</Text>
                <TextInput
                  style={styles.textInput}
                  value={monthlyLimit}
                  onChangeText={setMonthlyLimit}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Require Receipt</Text>
              <Switch
                value={requireReceipt}
                onValueChange={setRequireReceipt}
                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                thumbColor={requireReceipt ? '#4CAF50' : '#BDBDBD'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardCode: { fontSize: 16, fontWeight: '700', color: '#000' },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  cardCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  limitsRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  limitItem: { flex: 1, alignItems: 'center' },
  limitLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  limitValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardActions: {
    flexDirection: 'row', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 12,
  },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#E3F2FD', gap: 4 },
  editText: { fontSize: 14, fontWeight: '600', color: '#4285F4' },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFEBEE', gap: 4 },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#FF5252' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  textInput: {
    backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, fontSize: 15, color: '#000',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelModalButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelModalText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, backgroundColor: '#4285F4', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

export default ClaimTypesScreen;
