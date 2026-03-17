/**
 * Create Request Screen
 * Form for employees to submit new requests
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
import requestService, { RequestType } from '../api/services/requestService';
import { useTheme } from '../context/ThemeContext';

export const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [requestType, setRequestType] = useState('');
  const [requestTypeLabel, setRequestTypeLabel] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [additionalNote, setAdditionalNote] = useState('');
  const [otherRequestType, setOtherRequestType] = useState('');
  const [showRequestTypePicker, setShowRequestTypePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOtherType = requestType?.toLowerCase() === 'other';

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await requestService.getTypes();
        setRequestTypes(types);
      } catch (error) {
        console.error('Failed to fetch request types:', error);
        Alert.alert('Error', 'Failed to load request types. Please try again.');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  /** API expects DateOnly as YYYY-MM-DD; ISO string can cause 400. */
  const formatDateForApi = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const validateForm = (): boolean => {
    if (!requestType) {
      Alert.alert('Validation Error', 'Please select a request type');
      return false;
    }
    if (isOtherType && !otherRequestType.trim()) {
      Alert.alert('Validation Error', 'Please specify the request type in the "Other" field');
      return false;
    }
    if (!startDate) {
      Alert.alert('Validation Error', 'Please select a start date');
      return false;
    }
    if (!additionalNote.trim()) {
      Alert.alert('Validation Error', 'Please provide additional notes');
      return false;
    }
    return true;
  };

  const submitRequest = async (isDraft: boolean) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const notes =
        isOtherType && otherRequestType.trim()
          ? `Other: ${otherRequestType.trim()}\n\n${additionalNote.trim()}`
          : additionalNote.trim();

      await requestService.createApplication({
        requestType,
        startDate: formatDateForApi(startDate),
        notes,
        isDraft,
      });

      Alert.alert(
        'Success',
        isDraft ? 'Request saved as draft!' : 'Your request has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit request:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to submit request. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => submitRequest(false);
  const handleSaveDraft = () => submitRequest(true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Request</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {/* Form Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Request Type Dropdown */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Request Type</Text>
          {loadingTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading request types...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowRequestTypePicker(!showRequestTypePicker)}
              >
                <Text style={[styles.dropdownText, !requestType && styles.placeholder]}>
                  {requestTypeLabel || 'Select Request Type'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.icon} />
              </TouchableOpacity>

              {/* Request Type Picker */}
              {showRequestTypePicker && (
                <View style={styles.pickerContainer}>
                  {requestTypes.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={styles.pickerItem}
                      onPress={() => {
                        setRequestType(type.key);
                        setRequestTypeLabel(type.label);
                        if (type.key?.toLowerCase() !== 'other') setOtherRequestType('');
                        setShowRequestTypePicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{type.label}</Text>
                      {requestType === type.key && (
                        <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Other request type (shown only when "Other" is selected) */}
        {isOtherType && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Please specify</Text>
            <TextInput
              style={styles.otherInput}
              placeholderTextColor={colors.textTertiary}
                  placeholder="Enter the request type..."
              placeholderTextColor="#999"
              value={otherRequestType}
              onChangeText={setOtherRequestType}
            />
          </View>
        )}

        {/* Start Date */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={[styles.dateText, !startDate && styles.placeholder]}>
              {startDate ? formatDate(startDate) : 'Select Start Date'}
            </Text>
            <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Additional Note */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Additional Note</Text>
          <TextInput
            style={styles.textArea}
            placeholderTextColor={colors.textTertiary}
                  placeholder="Enter request details..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={additionalNote}
            onChangeText={setAdditionalNote}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.draftButton, isSubmitting && styles.submitButtonDisabled]}
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
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textTertiary,
  },
  otherInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  draftButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CreateRequestScreen;
