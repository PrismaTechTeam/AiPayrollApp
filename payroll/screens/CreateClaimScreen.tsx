/**
 * Create Claim Screen
 * Employee submits new claim using real API with receipt attachment support
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import claimService, { ClaimType, ClaimBalance } from '../api/services/claimService';
import { useTheme } from '../context/ThemeContext';

export const CreateClaimScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

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
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [balances, setBalances] = useState<ClaimBalance[]>([]);

  useEffect(() => {
    loadClaimTypes();
    loadBalances();
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

  const loadBalances = async () => {
    try {
      const data = await claimService.getBalance();
      setBalances(data);
    } catch (err: any) {
      console.error('Failed to load claim balances:', err);
    }
  };

  const getSelectedBalance = (): ClaimBalance | undefined => {
    if (!selectedType) return undefined;
    return balances.find(b => b.claimTypeId === selectedType.id);
  };

  const getProgressColor = (used: number, limit: number): string => {
    if (limit <= 0) return '#4285F4';
    const pct = used / limit;
    if (pct >= 1) return '#EA4335';
    if (pct >= 0.8) return '#FBBC04';
    return '#34A853';
  };

  const formatCurrency = (val: number): string => {
    return val.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handlePickImage = () => {
    Alert.alert('Upload Receipt', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setAttachment(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Gallery access is needed to select photos');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setAttachment(result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      Alert.alert('Validation Error', `Amount exceeds the maximum limit of RM ${selectedType.maxAmount.toFixed(2)}`);
      return false;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a description (min 10 characters)');
      return false;
    }
    if (selectedType.requireReceipt && !attachment) {
      Alert.alert('Validation Error', 'Receipt is required for this claim type. Please upload a receipt.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check claim limits
    const bal = getSelectedBalance();
    if (bal) {
      const claimAmount = parseFloat(amount);
      if (bal.monthlyLimit > 0 && claimAmount > bal.monthlyRemaining) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Monthly Limit Warning',
            `This claim of RM ${formatCurrency(claimAmount)} exceeds your monthly remaining balance of RM ${formatCurrency(bal.monthlyRemaining)}. Submit anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Submit', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
      } else if (bal.yearlyLimit > 0 && claimAmount > bal.yearlyRemaining) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Yearly Limit Warning',
            `This claim of RM ${formatCurrency(claimAmount)} exceeds your yearly remaining balance of RM ${formatCurrency(bal.yearlyRemaining)}. Submit anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Submit', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('claimTypeId', selectedType!.id);
        formData.append('transDate', transDate.toISOString());
        formData.append('amount', parseFloat(amount).toString());
        formData.append('description', description.trim());
        if (receiptNo.trim()) {
          formData.append('receiptNo', receiptNo.trim());
        }

        const uri = attachment.uri;
        const fileName = attachment.fileName || `receipt_${Date.now()}.jpg`;
        formData.append('receipt', {
          uri,
          name: fileName,
          type: attachment.mimeType || 'image/jpeg',
        } as any);

        await claimService.createApplicationWithAttachment(formData);
      } else {
        await claimService.createApplication({
          claimTypeId: selectedType!.id,
          transDate: transDate.toISOString(),
          amount: parseFloat(amount),
          description: description.trim(),
          receiptNo: receiptNo.trim() || undefined,
        });
      }

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

  const handleSaveDraft = async () => {
    if (!selectedType) {
      Alert.alert('Validation Error', 'Please select a claim type');
      return;
    }
    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('claimTypeId', selectedType.id);
        formData.append('transDate', transDate.toISOString());
        formData.append('amount', parseFloat(amount).toString());
        formData.append('description', description.trim());
        formData.append('isDraft', 'true');
        if (receiptNo.trim()) {
          formData.append('receiptNo', receiptNo.trim());
        }
        const uri = attachment.uri;
        const fileName = attachment.fileName || `receipt_${Date.now()}.jpg`;
        formData.append('receipt', {
          uri,
          name: fileName,
          type: attachment.mimeType || 'image/jpeg',
        } as any);
        await claimService.createApplicationWithAttachment(formData);
      } else {
        await claimService.createApplication({
          claimTypeId: selectedType.id,
          transDate: transDate.toISOString(),
          amount: parseFloat(amount),
          description: description.trim(),
          receiptNo: receiptNo.trim() || undefined,
          isDraft: true,
        });
      }

      Alert.alert(
        'Success',
        'Claim saved as draft!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save draft. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
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
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
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
                  color={colors.icon}
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
                          <Text style={styles.dropdownItemHint}>Max: RM {type.maxAmount.toFixed(2)}</Text>
                        )}
                      </View>
                      {selectedType?.id === type.id && (
                        <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Balance Card */}
        {selectedType && (() => {
          const bal = getSelectedBalance();
          if (!bal) return null;
          const hasYearly = bal.yearlyLimit > 0;
          const hasMonthly = bal.monthlyLimit > 0;
          if (!hasYearly && !hasMonthly) return null;
          const ytdUsed = bal.ytdClaimed + bal.ytdPending;
          const mtdUsed = bal.mtdClaimed + bal.mtdPending;
          const yearlyPct = hasYearly ? Math.min(ytdUsed / bal.yearlyLimit, 1) : 0;
          const monthlyPct = hasMonthly ? Math.min(mtdUsed / bal.monthlyLimit, 1) : 0;
          const hasPending = bal.ytdPending > 0 || bal.mtdPending > 0;
          return (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>{bal.claimTypeName}</Text>
              {hasMonthly && (
                <View style={styles.balanceRow}>
                  <View style={styles.balanceLabelRow}>
                    <Text style={styles.balanceLabel}>Monthly</Text>
                    <Text style={styles.balanceValue}>
                      RM {formatCurrency(mtdUsed)} / RM {formatCurrency(bal.monthlyLimit)}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: `${monthlyPct * 100}%`,
                      backgroundColor: getProgressColor(mtdUsed, bal.monthlyLimit),
                    }]} />
                  </View>
                  <Text style={styles.balanceRemaining}>
                    Remaining: RM {formatCurrency(bal.monthlyRemaining)}
                  </Text>
                </View>
              )}
              {hasYearly && (
                <View style={styles.balanceRow}>
                  <View style={styles.balanceLabelRow}>
                    <Text style={styles.balanceLabel}>Yearly</Text>
                    <Text style={styles.balanceValue}>
                      RM {formatCurrency(ytdUsed)} / RM {formatCurrency(bal.yearlyLimit)}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: `${yearlyPct * 100}%`,
                      backgroundColor: getProgressColor(ytdUsed, bal.yearlyLimit),
                    }]} />
                  </View>
                  <Text style={styles.balanceRemaining}>
                    Remaining: RM {formatCurrency(bal.yearlyRemaining)}
                  </Text>
                </View>
              )}
              {hasPending && (
                <View style={styles.balancePendingRow}>
                  <MaterialCommunityIcons name="information-outline" size={14} color={colors.icon} />
                  <Text style={styles.balancePendingText}>
                    Includes RM {formatCurrency(Math.max(bal.ytdPending, bal.mtdPending))} pending approval
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Amount (RM) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>RM</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={colors.textTertiary}
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
            <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
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
            placeholderTextColor={colors.textTertiary}
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
            placeholderTextColor={colors.textTertiary}
                  placeholder="Enter claim description and additional details"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Minimum 10 characters</Text>
        </View>

        {/* Receipt Upload Section */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Receipt {selectedType?.requireReceipt ? <Text style={styles.required}>*</Text> : '(Optional)'}
          </Text>

          {attachment ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setAttachment(null)}
              >
                <MaterialCommunityIcons name="close-circle" size={28} color="#EA4335" />
              </TouchableOpacity>
              <Text style={styles.fileName} numberOfLines={1}>
                {attachment.fileName || 'receipt.jpg'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <MaterialCommunityIcons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Receipt</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>Supported: JPG, PNG, PDF (max 10MB)</Text>
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
              <ActivityIndicator size="small" color="#FFFFFF" />
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
  container: { flex: 1, backgroundColor: colors.background },
  safeAreaTop: { backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  section: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 },
  required: { color: '#EA4335' },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textArea: { height: 100, paddingTop: 16 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  dropdownText: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textTertiary },
  dropdownMenu: { backgroundColor: colors.surface, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border, maxHeight: 300 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownItemText: { fontSize: 15, color: colors.text },
  dropdownItemHint: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  dateText: { fontSize: 15, color: colors.text, flex: 1 },
  hint: { fontSize: 13, color: colors.textTertiary, marginTop: 6 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight + '30', borderRadius: 12, padding: 16, gap: 12, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
  uploadButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  previewContainer: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  previewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'contain' },
  removeButton: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.surface, borderRadius: 14 },
  fileName: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  draftButton: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  draftButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  submitButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  balanceCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  balanceTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  balanceRow: { marginBottom: 12 },
  balanceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  balanceValue: { fontSize: 13, color: colors.text },
  progressBarBg: { height: 8, backgroundColor: '#E8E8E8', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },
  balanceRemaining: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  balancePendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  balancePendingText: { fontSize: 12, color: colors.textSecondary },
});

export default CreateClaimScreen;
