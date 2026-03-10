/**
 * Attendance Check-In Screen
 * Allows employees to check in/out using biometric authentication
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

interface AttendanceCheckInScreenProps {
  navigation?: any;
}

const AttendanceCheckInScreen: React.FC<AttendanceCheckInScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [hasFaceID, setHasFaceID] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check biometric availability
    checkBiometricAvailability();

    return () => clearInterval(timer);
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      console.log('🔐 Biometric Check:', {
        compatible,
        enrolled,
        supportedTypes,
        platform: Platform.OS,
      });
      
      setBiometricAvailable(compatible && enrolled);
      
      // Check which biometric types are available
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
      
      setBiometricTypes(types);
      
      // On iOS, Face ID is preferred if available
      // On Android, both might be available but system chooses
      const hasFace = types.includes('face');
      const hasFinger = types.includes('fingerprint');
      
      setHasFaceID(hasFace);
      setHasFingerprint(hasFinger);
      
      console.log('✅ Available biometric types:', types);
      console.log('✅ Has Face ID:', hasFace);
      console.log('✅ Has Fingerprint:', hasFinger);
      console.log('✅ Platform:', Platform.OS);
      console.log('✅ Biometric Available:', compatible && enrolled);
      
      // Log warning if both are available (system will choose)
      if (hasFace && hasFinger) {
        console.log('⚠️ Both Face ID and Fingerprint available - system will choose which to use');
      }
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const handleFaceIDAuth = async () => {
    console.log('🔐 handleFaceIDAuth called');
    console.log('🔐 Platform:', Platform.OS);
    
    if (!biometricAvailable || !hasFaceID) {
      console.log('❌ Face ID not available');
      Alert.alert(
        'Face ID Not Available',
        'Face ID is not available on this device or not set up.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      console.log('🔐 Starting Face ID authentication...');
      console.log('🔐 Has Face ID:', hasFaceID);
      console.log('🔐 Has Fingerprint:', hasFingerprint);
      console.log('🔐 Available types:', biometricTypes);
      
      // On Android, the system may choose Fingerprint even if Face ID is available
      // Unfortunately, expo-local-authentication doesn't support forcing a specific biometric type
      // Set prompt message based on platform:
      // - iOS: "Use Face ID to verify your identity"
      // - Android: "Use Face Unlock to verify your identity"
      const authOptions: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage: Platform.OS === 'ios' 
          ? 'Use Face ID to verify your identity'  // iOS message
          : 'Use Face Unlock to verify your identity', // Android message (when Platform.OS === 'android')
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      };

      // Note: On Android, if both Face ID and Fingerprint are available,
      // the system will choose which one to use based on device settings.
      // We cannot force Face ID specifically with expo-local-authentication.
      const result = await LocalAuthentication.authenticateAsync(authOptions);

      console.log('🔐 Face ID authentication result:', result);
      console.log('⚠️ Note: On Android, system may use Fingerprint even when Face ID icon is tapped');

      // Check if the wrong biometric was used (this is a workaround)
      // Note: The API doesn't tell us which biometric was actually used,
      // but on iOS, if Face ID is available, it should be used
      if (result.success) {
        console.log('✅ Face ID authentication successful');
        Alert.alert(
          'Check-In Successful',
          `You have successfully checked in at ${formatTime(currentTime)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation?.goBack(),
            },
          ]
        );
      } else {
        console.log('❌ Face ID authentication failed:', result.error);
        if (result.error !== 'app_cancel' && result.error !== 'user_fallback') {
          Alert.alert(
            'Authentication Failed',
            'Unable to verify your identity. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Face ID authentication error:', error);
      Alert.alert(
        'Error',
        `An error occurred during Face ID authentication: ${error?.message || 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleFingerprintAuth = async () => {
    console.log('🔐 handleFingerprintAuth called');
    
    if (!biometricAvailable || !hasFingerprint) {
      console.log('❌ Fingerprint not available');
      Alert.alert(
        'Fingerprint Not Available',
        'Fingerprint authentication is not available on this device or not set up.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      console.log('🔐 Starting Fingerprint authentication...');
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Use Fingerprint to verify your identity',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      console.log('🔐 Fingerprint authentication result:', result);

      if (result.success) {
        console.log('✅ Fingerprint authentication successful');
        Alert.alert(
          'Check-In Successful',
          `You have successfully checked in at ${formatTime(currentTime)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation?.goBack(),
            },
          ]
        );
      } else {
        console.log('❌ Fingerprint authentication failed:', result.error);
        if (result.error !== 'app_cancel' && result.error !== 'user_fallback') {
          Alert.alert(
            'Authentication Failed',
            'Unable to verify your identity. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Fingerprint authentication error:', error);
      Alert.alert(
        'Error',
        `An error occurred during fingerprint authentication: ${error?.message || 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attandance</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Biometric Icons */}
        <View style={styles.biometricContainer}>
          {hasFaceID && hasFingerprint ? (
            // Show both options - both clickable
            <View style={styles.dualBiometricContainer}>
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={handleFaceIDAuth}
                disabled={isAuthenticating}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.biometricCircle,
                  isAuthenticating && styles.biometricCircleDisabled
                ]}>
                  <MaterialCommunityIcons
                    name="face-recognition"
                    size={80}
                    color={isAuthenticating ? "#B0BEC5" : "#4285F4"}
                  />
                </View>
                <Text style={styles.biometricLabel}>Face ID</Text>
              </TouchableOpacity>
              <Text style={styles.orText}>or</Text>
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={handleFingerprintAuth}
                disabled={isAuthenticating}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.biometricCircle,
                  isAuthenticating && styles.biometricCircleDisabled
                ]}>
                  <MaterialCommunityIcons
                    name="fingerprint"
                    size={80}
                    color={isAuthenticating ? "#B0BEC5" : "#4285F4"}
                  />
                </View>
                <Text style={styles.biometricLabel}>Fingerprint</Text>
              </TouchableOpacity>
            </View>
          ) : hasFaceID ? (
            // Show only face ID - clickable
            <TouchableOpacity
              style={styles.singleBiometricContainer}
              onPress={handleFaceIDAuth}
              disabled={isAuthenticating}
              activeOpacity={0.7}
            >
              <View style={[
                styles.largeBiometricCircle,
                isAuthenticating && styles.biometricCircleDisabled
              ]}>
                <MaterialCommunityIcons
                  name="face-recognition"
                  size={120}
                  color={isAuthenticating ? "#B0BEC5" : "#4285F4"}
                />
              </View>
            </TouchableOpacity>
          ) : (
            // Show only fingerprint (default) - clickable
            <TouchableOpacity
              style={styles.singleBiometricContainer}
              onPress={handleFingerprintAuth}
              disabled={isAuthenticating}
              activeOpacity={0.7}
            >
              <View style={[
                styles.largeBiometricCircle,
                isAuthenticating && styles.biometricCircleDisabled
              ]}>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={120}
                  color={isAuthenticating ? "#B0BEC5" : "#4285F4"}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Instruction Text */}
        <Text style={styles.instructionText}>
          {isAuthenticating
            ? 'Authenticating...'
            : hasFaceID && hasFingerprint
            ? Platform.OS === 'ios'
              ? 'Tap Face ID to verify (Face ID preferred on iOS)'
              : 'Tap Face ID or Fingerprint to verify'
            : hasFaceID
            ? 'Tap to use Face ID'
            : 'Tap to use Fingerprint'}
        </Text>
        
        {/* Note about biometric selection on Android */}
        {hasFaceID && hasFingerprint && Platform.OS === 'android' && (
          <Text style={styles.noteText}>
            Note: On Android, the system may use Fingerprint even when Face ID icon is tapped
          </Text>
        )}

        {/* Current Time Display */}
        <Text style={styles.timeDisplay}>{formatTime(currentTime)}</Text>

        {/* Biometric Status */}
        {!biometricAvailable && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color="#FF9800"
            />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  biometricContainer: {
    marginBottom: 40,
  },
  singleBiometricContainer: {
    alignItems: 'center',
  },
  dualBiometricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  biometricOption: {
    alignItems: 'center',
  },
  biometricCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#4285F4',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricCircleDisabled: {
    borderColor: '#B0BEC5',
    opacity: 0.6,
  },
  largeBiometricCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#4285F4',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  orText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  instructionText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 40,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    maxWidth: '90%',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});

export default AttendanceCheckInScreen;
