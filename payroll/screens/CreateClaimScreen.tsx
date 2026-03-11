/**
 * Create Claim Screen
 * Employee submits new claim using real API
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import claimService, { ClaimType } from '../api/services/claimService';

export const CreateClaimScreen: React.FC = () => {
  const navigation = useNavigation();

  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [selectedType, setSelectedType] = useState<ClaimType | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [transDate, setTransDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptNo, setReceiptNo] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    loadClaimTypes();
  }, []);

  const loadClaimTypes = async () => {
    try {
      const types = await claimService.getTypes();
      setClaimTypes(types);
    } catch (err: any) {
      console.error('Failed to load claim types:', err);
      Alert.alert('Error', 'Failed to load claim types');
    } finally {
      setLoadingTypes(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const validateForm = (): boolean => {
    if (!selectedType) {
      Alert.alert('Validation Error', 'Please select a claim type');
      return false;
    }
    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return false;
    }
    if (selectedType.maxAmount && parseFloat(amount) > selectedType.maxAmount) {
      Alert.alert('Validation Error', `Amount exceeds the maximum limit of $${selectedType.maxAmount.toFixed(2)}`);
      return false;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a description (min 10 characters)');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await claimService.createApplication({
        claimTypeId: selectedType!.id,
        transDate: transDate.toISOString(),
        amount: parseFloat(amount),
        description: description.trim(),
        receiptNo: receiptNo.trim() || undefined,
      });

      Alert.alert(
        'Success',
        'Claim submitted successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.message
        || error.response?.data?.errors?.[0]
        || 'Failed to submit claim. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    Alert.alert('Info', 'Draft saving is not yet available');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Claim</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Claim Type */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Claim Type <Text style={styles.required}>*</Text>
          </Text>
          {loadingTypes ? (
            <ActivityIndicator size="small" color="#4285F4" style={{ padding: 16 }} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text style={[styles.dropdownText, !selectedType && styles.placeholder]}>
                  {selectedType?.name || 'Select claim type'}
                </Text>
                <MaterialCommunityIcons
                  name={showTypeDropdown ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {claimTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedType(type);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <View>
                        <Text style={styles.dropdownItemText}>{type.name}</Text>
                        {type.maxAmount && (
                          <Text style={styles.dropdownItemHint}>Max: ${type.maxAmount.toFixed(2)}</Text>
                        )}
                      </View>
                      {selectedType?.id === type.id && (
                        <MaterialCommunityIcons name="check" size={20} color="#4285F4" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Amount ($) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Transaction Date */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Transaction Date <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color="#4285F4" />
            <Text style={styles.dateText}>{formatDate(transDate)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={transDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setTransDate(selectedDate);
            }}
          />
        )}

        {/* Receipt Number */}
        <View style={styles.section}>
          <Text style={styles.label}>Receipt Number</Text>
          <TextInput
            style={styles.input}
            value={receiptNo}
            onChangeText={setReceiptNo}
            placeholder="Enter receipt number (optional)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter claim description and additional details"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Minimum 10 characters</Text>
        </View>

        {/* Receipts Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Receipts (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <MaterialCommunityIcons name="camera-outline" size={24} color="#4285F4" />
            <Text style={styles.uploadButtonText}>Upload Receipt</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>File upload will be available in a future update</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Text style={styles.draftButtonText}>Save as Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Claim</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  section: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 8 },
  required: { color: '#EA4335' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 15, color: '#000', borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 100, paddingTop: 16 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  dropdownText: { fontSize: 15, color: '#000' },
  placeholder: { color: '#999' },
  dropdownMenu: { backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#E0E0E0', maxHeight: 300 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 15, color: '#000' },
  dropdownItemHint: { fontSize: 12, color: '#999', marginTop: 2 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: '#000', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 15, color: '#000', paddingVertical: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  dateText: { fontSize: 15, color: '#000', flex: 1 },
  hint: { fontSize: 13, color: '#999', marginTop: 6 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F0FE', borderRadius: 12, padding: 16, gap: 12, borderWidth: 2, borderColor: '#4285F4', borderStyle: 'dashed' },
  uploadButtonText: { fontSize: 15, fontWeight: '600', color: '#4285F4' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  draftButton: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4285F4' },
  draftButtonText: { fontSize: 16, fontWeight: '600', color: '#4285F4' },
  submitButton: { flex: 1, backgroundColor: '#4285F4', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

export default CreateClaimScreen;
