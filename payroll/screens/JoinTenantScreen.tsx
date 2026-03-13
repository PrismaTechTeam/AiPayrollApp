/**
 * Join Tenant Screen
 * Allows users to join a tenant/company via QR code scanning or invitation link/code.
 * Two tabs: "Scan QR" and "Join via Link"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import companyService from '../api/services/companyService';

type TabType = 'scanQR' | 'joinViaLink';

interface QRPayload {
  tenantId: string;
  inviteCode?: string;
  companyName?: string;
}

/**
 * Parse QR data from either JSON or URL format.
 * Supported formats:
 *   - JSON: {"tenantId": "uuid", "inviteCode": "ABC123"}
 *   - URL:  payrollapp://join?tenantId=xxx&code=xxx
 *   - URL:  https://...?tenantId=xxx&code=xxx
 */
function parseQRData(data: string): QRPayload | null {
  // Try JSON first
  try {
    const parsed = JSON.parse(data);
    if (parsed && parsed.tenantId) {
      return {
        tenantId: parsed.tenantId,
        inviteCode: parsed.inviteCode || parsed.code,
        companyName: parsed.companyName || parsed.tenantName,
      };
    }
  } catch {
    // Not JSON, try URL parsing
  }

  // Try URL parsing
  try {
    const url = new URL(data);
    const tenantId = url.searchParams.get('tenantId');
    if (tenantId) {
      return {
        tenantId,
        inviteCode: url.searchParams.get('code') || url.searchParams.get('inviteCode') || undefined,
        companyName: url.searchParams.get('companyName') || undefined,
      };
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

/**
 * Parse a link or code input from the "Join via Link" tab.
 * If it looks like a URL, extract tenantId/code params.
 * Otherwise treat it as a raw invitation code.
 */
function parseLinkOrCode(input: string): { type: 'url'; tenantId: string; code?: string } | { type: 'code'; code: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it's a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('payrollapp://')) {
    try {
      const url = new URL(trimmed);
      const tenantId = url.searchParams.get('tenantId');
      if (tenantId) {
        return {
          type: 'url',
          tenantId,
          code: url.searchParams.get('code') || url.searchParams.get('inviteCode') || undefined,
        };
      }
    } catch {
      // Invalid URL format
    }
  }

  // Treat as raw invitation code
  return { type: 'code', code: trimmed };
}

export const JoinTenantScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('scanQR');

  // QR Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  // Join via Link state
  const [linkInput, setLinkInput] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Reset scanned state when switching back to QR tab
  useEffect(() => {
    if (activeTab === 'scanQR') {
      setScanned(false);
    }
  }, [activeTab]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || scanSubmitting) return;
      setScanned(true);

      console.log('[JoinTenant] QR raw data:', data);
      const payload = parseQRData(data);
      if (!payload) {
        console.log('[JoinTenant] QR parse failed — invalid or unsupported format');
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid join information. Please try a different code.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }],
        );
        return;
      }
      console.log('[JoinTenant] QR parsed payload:', payload);

      setScanSubmitting(true);

      try {
        const message = 'Joined via QR scan';
        console.log('[JoinTenant] Sending join request:', { tenantId: payload.tenantId, message });
        const joinRequest = await companyService.submitJoinRequest(
          payload.tenantId,
          message,
        );
        navigation.navigate('JoinRequestPending' as never, {
          companyId: payload.tenantId,
          companyName: payload.companyName || joinRequest.tenantName || 'Company',
        } as never);
      } catch (err: any) {
        const message = err?.response?.data?.message ?? err?.message ?? 'Failed to submit join request. Please try again.';
        Alert.alert(
          'Join Failed',
          message,
          [{ text: 'Scan Again', onPress: () => setScanned(false) }],
        );
      } finally {
        setScanSubmitting(false);
      }
    },
    [scanned, scanSubmitting, navigation],
  );

  const handleJoinViaLink = async () => {
    const parsed = parseLinkOrCode(linkInput);
    if (!parsed) {
      Alert.alert('Invalid Input', 'Please enter an invitation code or link.');
      return;
    }

    setLinkSubmitting(true);
    try {
      if (parsed.type === 'url') {
        // Direct join via tenantId from URL
        const joinRequest = await companyService.submitJoinRequest(
          parsed.tenantId,
          parsed.code ? `Joined via invitation link (code: ${parsed.code})` : 'Joined via invitation link',
        );
        navigation.navigate('JoinRequestPending' as never, {
          companyId: parsed.tenantId,
          companyName: joinRequest.tenantName || 'Company',
        } as never);
      } else {
        // Raw code: submit to backend code resolution endpoint
        const joinRequest = await companyService.joinViaCode(parsed.code);
        navigation.navigate('JoinRequestPending' as never, {
          companyId: joinRequest.tenantId,
          companyName: joinRequest.tenantName || 'Company',
        } as never);
      }
    } catch (err: any) {
      Alert.alert(
        'Join Failed',
        err.message || 'Invalid code or failed to submit join request. Please try again.',
      );
    } finally {
      setLinkSubmitting(false);
    }
  };

  const renderScanQRTab = () => {
    if (!permission) {
      // Permissions still loading
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centeredContent}>
          <View style={styles.permissionIconContainer}>
            <MaterialCommunityIcons name="camera-off" size={64} color="#CCC" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan QR codes, please grant camera permission.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (scanSubmitting) {
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.submittingText}>Submitting join request...</Text>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
          {/* Scanner overlay */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              {/* Corner decorations */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>
        </View>

        <Text style={styles.scanInstructions}>
          Point your camera at a company QR code to join
        </Text>

        {scanned && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => setScanned(false)}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#4285F4" />
            <Text style={styles.rescanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderJoinViaLinkTab = () => (
    <View style={styles.linkContainer}>
      <View style={styles.linkIconContainer}>
        <MaterialCommunityIcons name="link-variant" size={48} color="#4285F4" />
      </View>

      <Text style={styles.linkTitle}>Enter Invitation Code or Link</Text>
      <Text style={styles.linkDescription}>
        Paste the invitation code or link shared by your company admin.
      </Text>

      <View style={styles.linkInputContainer}>
        <MaterialCommunityIcons name="code-tags" size={20} color="#999" />
        <TextInput
          style={styles.linkInput}
          placeholder="Enter invitation code or link"
          placeholderTextColor="#BBB"
          value={linkInput}
          onChangeText={setLinkInput}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!linkSubmitting}
        />
        {linkInput.length > 0 && !linkSubmitting && (
          <TouchableOpacity onPress={() => setLinkInput('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.joinButton,
          (!linkInput.trim() || linkSubmitting) && styles.joinButtonDisabled,
        ]}
        onPress={handleJoinViaLink}
        disabled={!linkInput.trim() || linkSubmitting}
      >
        {linkSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="login" size={20} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.helperContainer}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#999" />
        <Text style={styles.helperText}>
          Your HR admin can provide you with an invitation code or link.
          You can also ask them for a QR code to scan.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Join Tenant</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'scanQR' && styles.tabActive]}
              onPress={() => setActiveTab('scanQR')}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color={activeTab === 'scanQR' ? '#FFFFFF' : '#555'}
              />
              <Text
                style={[styles.tabText, activeTab === 'scanQR' && styles.tabTextActive]}
              >
                Scan QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'joinViaLink' && styles.tabActive]}
              onPress={() => setActiveTab('joinViaLink')}
            >
              <MaterialCommunityIcons
                name="link-variant"
                size={18}
                color={activeTab === 'joinViaLink' ? '#FFFFFF' : '#555'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'joinViaLink' && styles.tabTextActive,
                ]}
              >
                Join via Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'scanQR' ? renderScanQRTab() : renderJoinViaLinkTab()}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4285F4',
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#4285F4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },

  // Scan QR Tab
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submittingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
  },
  scannerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cameraWrapper: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4285F4',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  scanInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4285F4',
    gap: 6,
  },
  rescanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },

  // Join via Link Tab
  linkContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  linkIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4285F410',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  linkDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    width: '100%',
    marginBottom: 16,
  },
  linkInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    marginLeft: 12,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 4,
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    lineHeight: 20,
  },
});

export default JoinTenantScreen;
