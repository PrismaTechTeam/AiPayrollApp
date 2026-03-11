/**
 * Edit Profile Screen
 * Loads profile data from API and saves changes via API.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import profileService from '../api/services/profileService';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentRole } = usePayrollAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Read-only fields (from backend)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  // Editable fields
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      // The backend returns { user: {...}, employee: {...} }
      const profile = data as any;
      const user = profile.user;
      const emp = profile.employee;

      setFullName(emp?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
      setEmail(emp?.email || user?.email || '');
      setDepartment(emp?.department || '');
      setPosition(emp?.job || '');
      setPhone(emp?.phone || '');
      setMobile(emp?.mobile || user?.phoneNumber || '');
      setAddress(emp?.address || '');
      setCity(emp?.city || '');
      setState(emp?.state || '');
      setPostcode(emp?.postcode || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => role === 'Manager' ? '#FF5722' : '#4285F4';
  const getRoleIcon = (role: string) => role === 'Manager' ? 'shield-account' : 'account';

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.updateProfile({
        phone: phone || undefined,
        mobile: mobile || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        postcode: postcode || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: getRoleColor(currentRole || '') }]}>
            <MaterialCommunityIcons
              name={getRoleIcon(currentRole || '') as any}
              size={48}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* Read-only info */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#999" />
              <Text style={styles.readOnlyText}>{fullName || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#999" />
              <Text style={styles.readOnlyText}>{email || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="office-building-outline" size={20} color="#999" />
              <Text style={styles.readOnlyText}>{department || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Position</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="briefcase-outline" size={20} color="#999" />
              <Text style={styles.readOnlyText}>{position || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Editable fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="cellphone" size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter mobile number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#666" style={{ marginTop: 4 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>City</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { marginLeft: 0 }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { marginLeft: 0 }]}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postcode</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { marginLeft: 0 }]}
                value={postcode}
                onChangeText={setPostcode}
                placeholder="Postcode"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFFFFF', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  formSection: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 24, marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  readOnly: { backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' },
  readOnlyText: { flex: 1, fontSize: 16, color: '#666', marginLeft: 12 },
  input: { flex: 1, fontSize: 16, color: '#000', marginLeft: 12, padding: 0 },
  textAreaContainer: { alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4285F4', marginHorizontal: 20, paddingVertical: 16,
    borderRadius: 12, gap: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default EditProfileScreen;
