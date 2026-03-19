/**
 * Request Types Management Screen (Owner/HR)
 * CRUD for request types using web API /api/request-types
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import requestService, { RequestTypeDetail, CreateRequestTypePayload } from '../api/services/requestService';

export const RequestTypesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [types, setTypes] = useState<RequestTypeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<RequestTypeDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const fetchTypes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await requestService.getRequestTypes();
      setTypes(data);
    } catch (err) {
      console.error('Failed to load request types:', err);
      Alert.alert('Error', 'Failed to load request types');
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
    setCategory('');
    setShowModal(true);
  };

  const openEditModal = (item: RequestTypeDetail) => {
    setEditingType(item);
    setShortCode(item.shortCode);
    setDescription(item.description || '');
    setCategory(item.category || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!shortCode.trim()) {
      Alert.alert('Validation', 'Short code is required');
      return;
    }
    setSaving(true);
    try {
      if (editingType) {
        await requestService.updateRequestType(editingType.id, {
          shortCode: shortCode.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
        });
        Alert.alert('Success', 'Request type updated');
      } else {
        await requestService.createRequestType({
          shortCode: shortCode.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          status: 'ACTIVE',
        });
        Alert.alert('Success', 'Request type created');
      }
      setShowModal(false);
      fetchTypes();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save request type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: RequestTypeDetail) => {
    Alert.alert(
      'Delete Request Type',
      `Are you sure you want to delete "${item.description || item.shortCode}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestService.deleteRequestType(item.id);
              Alert.alert('Success', 'Request type deleted');
              fetchTypes();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RequestTypeDetail }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardCode}>{item.shortCode}</Text>
          {item.description && (
            <Text style={styles.cardDesc}>{item.description}</Text>
          )}
          {item.category && (
            <Text style={styles.cardCategory}>{item.category}</Text>
          )}
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.statusText, { color: item.status === 'Active' ? '#4CAF50' : '#FF9800' }]}>
              {item.status}
            </Text>
          </View>
          {item.isDefault && (
            <View style={[styles.statusBadge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.statusText, { color: '#1976D2' }]}>Default</Text>
            </View>
          )}
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
          <Text style={styles.headerTitle}>Request Types</Text>
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
              <MaterialCommunityIcons name="file-plus-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No request types yet</Text>
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
              <Text style={styles.modalTitle}>{editingType ? 'Edit Request Type' : 'New Request Type'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Short Code *</Text>
            <TextInput
              style={styles.textInput}
              value={shortCode}
              onChangeText={setShortCode}
              placeholder="e.g. LEAVE_EXT"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Leave Extension Request"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.textInput}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. HR, General"
              placeholderTextColor="#999"
            />

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
  statusText: { fontSize: 11, fontWeight: '600' },
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  textInput: {
    backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, fontSize: 15, color: '#000',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelModalButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelModalText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, backgroundColor: '#4285F4', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

export default RequestTypesScreen;
