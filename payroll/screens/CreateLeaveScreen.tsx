/**
 * Create Leave Request Screen
 * Form for employees to submit new leave applications
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Casual Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Unpaid Leave',
];

export const CreateLeaveScreen: React.FC = () => {
  const navigation = useNavigation();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [additionalNote, setAdditionalNote] = useState('');
  const [showLeaveTypePicker, setShowLeaveTypePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      // If end date is before start date, reset it
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const validateForm = (): boolean => {
    if (!leaveType) {
      Alert.alert('Validation Error', 'Please select a leave type');
      return false;
    }
    if (!startDate) {
      Alert.alert('Validation Error', 'Please select a start date');
      return false;
    }
    if (!endDate) {
      Alert.alert('Validation Error', 'Please select an end date');
      return false;
    }
    if (endDate < startDate) {
      Alert.alert('Validation Error', 'End date cannot be before start date');
      return false;
    }
    return true;
  };

  const calculateLeaveDays = (): number => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      const leaveRequest = {
        leaveType,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        additionalNote,
        days: calculateLeaveDays(),
        status: 'requested',
        submittedAt: new Date().toISOString(),
      };

      console.log('Submitting leave request:', leaveRequest);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        'Your leave request has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit leave request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a Leave Plan</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {/* Form Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Leave Type Dropdown */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Leave Type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLeaveTypePicker(!showLeaveTypePicker)}
          >
            <Text style={[styles.dropdownText, !leaveType && styles.placeholder]}>
              {leaveType || 'Select Leave Type'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Leave Type Picker */}
          {showLeaveTypePicker && (
            <View style={styles.pickerContainer}>
              {LEAVE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.pickerItem}
                  onPress={() => {
                    setLeaveType(type);
                    setShowLeaveTypePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{type}</Text>
                  {leaveType === type && (
                    <MaterialCommunityIcons name="check" size={20} color="#4285F4" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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

        {/* End Date */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={[styles.dateText, !endDate && styles.placeholder]}>
              {endDate ? formatDate(endDate) : 'Select End Date'}
            </Text>
            <MaterialCommunityIcons name="calendar" size={24} color="#4285F4" />
          </TouchableOpacity>
        </View>

        {/* Leave Days Summary */}
        {startDate && endDate && (
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="information" size={20} color="#4285F4" />
            <Text style={styles.summaryText}>
              Total Leave Days: <Text style={styles.summaryDays}>{calculateLeaveDays()}</Text>
            </Text>
          </View>
        )}

        {/* Additional Note */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Additional Note</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter any additional information..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={additionalNote}
            onChangeText={setAdditionalNote}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={startDate || new Date()}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  summaryDays: {
    fontWeight: '700',
    color: '#4285F4',
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#000',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#4285F4',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
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

export default CreateLeaveScreen;
