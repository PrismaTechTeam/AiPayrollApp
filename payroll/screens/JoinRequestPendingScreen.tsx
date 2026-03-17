/**
 * Join Request Pending Screen
 * Shown after submitting a join request, auto-polls status (Phase 4)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import companyService, { JoinRequest } from '../api/services/companyService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useTheme } from '../context/ThemeContext';

type JoinRequestPendingParams = {
  JoinRequestPending: {
    requestId?: string;
    companyId: string;
    companyName: string;
  };
};

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const JoinRequestPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<JoinRequestPendingParams, 'JoinRequestPending'>>();
  const { requestId, companyId, companyName } = route.params || { companyId: '', companyName: 'the company' };
  const { refreshAuthState } = usePayrollAuth();

  const [status, setStatus] = useState<RequestStatus>('PENDING');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState(false);

  // Pulse animation for the icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    if (status !== 'PENDING') return;

    const checkStatus = async () => {
      try {
        const requests = await companyService.getJoinRequests();
        // Find the request matching this company
        const req = requests.find((r) => r.tenantId === companyId) || requests[0];
        if (req) {
          setStatus(req.status as RequestStatus);
          if (req.rejectionReason) {
            setRejectionReason(req.rejectionReason);
          }
          if (req.status === 'APPROVED') {
            // Refresh auth state to detect the new company assignment
            await refreshAuthState();
          }
        }
      } catch {
        // Silently fail on poll - will retry next interval
      }
    };

    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [companyId, status]);

  // Auto-navigate on approval
  useEffect(() => {
    if (status === 'APPROVED') {
      const timer = setTimeout(() => {
        // Navigate to main app - the auth context should detect the company assignment
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigation]);

  const goToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'UserHome' as never }],
    });
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your request to join ${companyName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              let idToCancel: string | null = requestId ?? null;
              if (!idToCancel) {
                const requests = await companyService.getJoinRequests();
                const req: JoinRequest | undefined =
                  (companyId ? requests.find((r) => String(r.tenantId) === String(companyId)) : undefined) ??
                  (companyName ? requests.find((r) => r.tenantName === companyName) : undefined) ??
                  requests.find((r) => r.status === 'PENDING') ??
                  requests[0];
                idToCancel = req ? String(req.id) : null;
              } else {
                idToCancel = String(idToCancel);
              }
              if (idToCancel) {
                await companyService.cancelJoinRequest(idToCancel);
                goToHome();
              } else {
                Alert.alert('Error', 'No pending request found to cancel.');
              }
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to cancel request.';
              Alert.alert('Error', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadgeStyle = () => {
    switch (status) {
      case 'APPROVED':
        return { backgroundColor: '#4CAF5020', borderColor: '#4CAF50' };
      case 'REJECTED':
        return { backgroundColor: '#F4433620', borderColor: '#F44336' };
      default:
        return { backgroundColor: '#FF980020', borderColor: '#FF9800' };
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'APPROVED':
        return '#4CAF50';
      case 'REJECTED':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const renderStatusIcon = () => {
    if (status === 'APPROVED') {
      return <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} />;
    }
    if (status === 'REJECTED') {
      return <MaterialCommunityIcons name="close-circle" size={80} color="#F44336" />;
    }
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <MaterialCommunityIcons name="clock-outline" size={80} color="#FF9800" />
      </Animated.View>
    );
  };

  const renderStatusContent = () => {
    if (status === 'APPROVED') {
      return (
        <>
          <Text style={styles.title}>Request Approved!</Text>
          <Text style={styles.description}>
            Your request to join <Text style={styles.boldText}>{companyName}</Text> has been
            approved. You will be redirected shortly.
          </Text>
        </>
      );
    }

    if (status === 'REJECTED') {
      return (
        <>
          <Text style={styles.title}>Request Rejected</Text>
          <Text style={styles.description}>
            Your request to join <Text style={styles.boldText}>{companyName}</Text> has been
            rejected.
          </Text>
          {rejectionReason && (
            <View style={styles.rejectionReasonCard}>
              <Text style={styles.rejectionLabel}>Reason:</Text>
              <Text style={styles.rejectionText}>{rejectionReason}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goToHome}
          >
            <Text style={styles.primaryButtonText}>Try Another Company</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <Text style={styles.title}>Request Pending</Text>
        <Text style={styles.description}>
          Your request to join <Text style={styles.boldText}>{companyName}</Text> has been
          submitted. HR will review your request.
        </Text>

        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusBadgeStyle()]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={getStatusTextColor()} />
          <Text style={[styles.statusBadgeText, { color: getStatusTextColor() }]}>
            {status}
          </Text>
        </View>

        {/* Cancel Request Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRequest}
          disabled={cancelling}
        >
          <Text style={styles.cancelButtonText}>
            {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.autoRefreshHint}>Status checks automatically every 30 seconds</Text>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goToHome} accessibilityLabel="Back to home">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Join Request</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            {renderStatusIcon()}
          </View>

          {renderStatusContent()}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 32,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 32,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },
  autoRefreshHint: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 20,
    fontStyle: 'italic',
  },
  rejectionReasonCard: {
    backgroundColor: '#FFF3F0',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F44336',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default JoinRequestPendingScreen;
