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

export const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation();
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
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
              <ActivityIndicator size="small" color="#4285F4" />
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
                <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
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
                        <MaterialCommunityIcons name="check" size={20} color="#4285F4" />
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
            <MaterialCommunityIcons name="calendar" size={24} color="#4285F4" />
          </TouchableOpacity>
        </View>

        {/* Additional Note */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Additional Note</Text>
          <TextInput
            style={styles.textArea}
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
    backgroundColor: '#F5F5F5',
  },
  safeAreaTop: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
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
    color: '#000',
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    color: '#999',
  },
  otherInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#000',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#000',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#000',
    minHeight: 150,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4285F4',
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
