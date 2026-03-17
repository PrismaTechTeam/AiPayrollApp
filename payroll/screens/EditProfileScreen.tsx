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
import { useTheme } from '../context/ThemeContext';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
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

  const getRoleColor = (role: string) => {
    const lower = role.toLowerCase();
    return (lower.includes('admin') || lower.includes('owner') || lower.includes('hr'))
      ? '#FF5722' : '#4285F4';
  };
  const getRoleIcon = (role: string) => {
    const lower = role.toLowerCase();
    return (lower.includes('admin') || lower.includes('owner') || lower.includes('hr'))
      ? 'shield-account' : 'account';
  };

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
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
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textTertiary} />
              <Text style={styles.readOnlyText}>{fullName || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.textTertiary} />
              <Text style={styles.readOnlyText}>{email || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="office-building-outline" size={20} color={colors.textTertiary} />
              <Text style={styles.readOnlyText}>{department || '-'}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Position</Text>
            <View style={[styles.inputContainer, styles.readOnly]}>
              <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.textTertiary} />
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
              <MaterialCommunityIcons name="phone-outline" size={20} color={colors.icon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={colors.textTertiary}
                  placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="cellphone" size={20} color={colors.icon} />
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                placeholderTextColor={colors.textTertiary}
                  placeholder="Enter mobile number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.icon} style={{ marginTop: 4 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholderTextColor={colors.textTertiary}
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
                  placeholderTextColor={colors.textTertiary}
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
                  placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
  container: { flex: 1, backgroundColor: colors.background },
  safeAreaTop: { backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: colors.surface, marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  formSection: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  readOnly: { backgroundColor: '#FAFAFA', borderColor: colors.borderLight },
  readOnlyText: { flex: 1, fontSize: 16, color: colors.textSecondary, marginLeft: 12 },
  input: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 12, padding: 0 },
  textAreaContainer: { alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, marginHorizontal: 20, paddingVertical: 16,
    borderRadius: 12, gap: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default EditProfileScreen;
