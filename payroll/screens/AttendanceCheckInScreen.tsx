/**
 * Attendance Check-In Screen
 * Allows employees to check in/out using biometric authentication
 * Now integrated with real API via attendanceService
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import attendanceService from '../api/services/attendanceService';

interface AttendanceCheckInScreenProps {
  navigation?: any;
}

const AttendanceCheckInScreen: React.FC<AttendanceCheckInScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasFaceID, setHasFaceID] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    checkBiometricAvailability();
    checkCurrentPunchType();

    return () => clearInterval(timer);
  }, []);

  const checkCurrentPunchType = async () => {
    try {
      const today = await attendanceService.getToday();
      // If already clocked in but not out, next punch should be OUT
      if (today.clockIn && !today.clockOut) {
        setPunchType('OUT');
      } else {
        setPunchType('IN');
      }
    } catch {
      // Default to IN if we can't determine
      setPunchType('IN');
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricAvailable(compatible && enrolled);

      const types = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });

      setHasFaceID(types.includes('face'));
      setHasFingerprint(types.includes('fingerprint'));
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const getLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number; isMock: boolean }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { latitude: 0, longitude: 0, accuracy: 0, isMock: false };
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 0,
        isMock: (loc as any).mocked || false,
      };
    } catch {
      return { latitude: 0, longitude: 0, accuracy: 0, isMock: false };
    }
  };

  const handleClockPunch = async (biometricVerified: boolean) => {
    try {
      const location = await getLocation();

      const result = await attendanceService.clock({
        punchType,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        biometricVerified,
        isMockLocation: location.isMock,
      });

      const action = punchType === 'IN' ? 'Checked In' : 'Checked Out';
      Alert.alert(
        `${action} Successfully`,
        `You have successfully ${action.toLowerCase()} at ${formatTime(currentTime)}`,
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to record attendance. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const handleBiometricAuth = async (type: 'face' | 'fingerprint') => {
    if (!biometricAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }

    setIsAuthenticating(true);

    try {
      const promptMessage = type === 'face'
        ? Platform.OS === 'ios' ? 'Use Face ID to verify your identity' : 'Use Face Unlock to verify your identity'
        : 'Use Fingerprint to verify your identity';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await handleClockPunch(true);
      } else {
        if (result.error !== 'app_cancel' && result.error !== 'user_fallback') {
          Alert.alert('Authentication Failed', 'Unable to verify your identity. Please try again.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Authentication error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        {/* Punch Type Indicator */}
        <View style={[styles.punchTypeIndicator, { backgroundColor: punchType === 'IN' ? '#E8F5E9' : '#FFEBEE' }]}>
          <MaterialCommunityIcons
            name={punchType === 'IN' ? 'login' : 'logout'}
            size={20}
            color={punchType === 'IN' ? '#2E7D32' : '#C62828'}
          />
          <Text style={[styles.punchTypeText, { color: punchType === 'IN' ? '#2E7D32' : '#C62828' }]}>
            {punchType === 'IN' ? 'Clock In' : 'Clock Out'}
          </Text>
        </View>

        {/* Biometric Icons */}
        <View style={styles.biometricContainer}>
          {hasFaceID && hasFingerprint ? (
            <View style={styles.dualBiometricContainer}>
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={() => handleBiometricAuth('face')}
                disabled={isAuthenticating}
                activeOpacity={0.7}
              >
                <View style={[styles.biometricCircle, isAuthenticating && styles.biometricCircleDisabled]}>
                  <MaterialCommunityIcons name="face-recognition" size={80} color={isAuthenticating ? "#B0BEC5" : "#4285F4"} />
                </View>
                <Text style={styles.biometricLabel}>Face ID</Text>
              </TouchableOpacity>
              <Text style={styles.orText}>or</Text>
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={() => handleBiometricAuth('fingerprint')}
                disabled={isAuthenticating}
                activeOpacity={0.7}
              >
                <View style={[styles.biometricCircle, isAuthenticating && styles.biometricCircleDisabled]}>
                  <MaterialCommunityIcons name="fingerprint" size={80} color={isAuthenticating ? "#B0BEC5" : "#4285F4"} />
                </View>
                <Text style={styles.biometricLabel}>Fingerprint</Text>
              </TouchableOpacity>
            </View>
          ) : hasFaceID ? (
            <TouchableOpacity
              style={styles.singleBiometricContainer}
              onPress={() => handleBiometricAuth('face')}
              disabled={isAuthenticating}
              activeOpacity={0.7}
            >
              <View style={[styles.largeBiometricCircle, isAuthenticating && styles.biometricCircleDisabled]}>
                <MaterialCommunityIcons name="face-recognition" size={120} color={isAuthenticating ? "#B0BEC5" : "#4285F4"} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.singleBiometricContainer}
              onPress={() => handleBiometricAuth('fingerprint')}
              disabled={isAuthenticating}
              activeOpacity={0.7}
            >
              <View style={[styles.largeBiometricCircle, isAuthenticating && styles.biometricCircleDisabled]}>
                <MaterialCommunityIcons name="fingerprint" size={120} color={isAuthenticating ? "#B0BEC5" : "#4285F4"} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.instructionText}>
          {isAuthenticating ? 'Authenticating...' : `Tap to ${punchType === 'IN' ? 'clock in' : 'clock out'}`}
        </Text>

        <Text style={styles.timeDisplay}>{formatTime(currentTime)}</Text>

        {!biometricAvailable && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9800" />
            <Text style={styles.warningText}>
              Biometric authentication not available on this device
            </Text>
          </View>
        )}
      </View>
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
  placeholder: { width: 40 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  punchTypeIndicator: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, gap: 8, marginBottom: 30,
  },
  punchTypeText: { fontSize: 16, fontWeight: '700' },
  biometricContainer: { marginBottom: 40 },
  singleBiometricContainer: { alignItems: 'center' },
  dualBiometricContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  biometricOption: { alignItems: 'center' },
  biometricCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#4285F4',
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4285F4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  biometricCircleDisabled: { borderColor: '#B0BEC5', opacity: 0.6 },
  largeBiometricCircle: {
    width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: '#4285F4',
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4285F4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  biometricLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 12 },
  orText: { fontSize: 16, fontWeight: '600', color: '#999' },
  instructionText: { fontSize: 16, color: '#999', marginBottom: 8, textAlign: 'center' },
  timeDisplay: { fontSize: 48, fontWeight: '700', color: '#4285F4', marginBottom: 40 },
  warningContainer: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 20,
    paddingVertical: 12, backgroundColor: '#FFF3E0', borderRadius: 8, maxWidth: '90%',
  },
  warningText: { fontSize: 13, color: '#FF9800', marginLeft: 8, flex: 1, textAlign: 'center' },
});

export default AttendanceCheckInScreen;
