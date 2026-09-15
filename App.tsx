import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './payroll/navigation/types';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { PayrollAuthProvider, usePayrollAuth } from './payroll/context/PayrollAuthContext';
import { NotificationProvider } from './payroll/components/NotificationProvider';
import { DialogProvider } from './payroll/components/ui/AppDialog';

// Auth screens
import LoginScreen from './payroll/screens/LoginScreen';
import { RegisterScreen } from './payroll/screens/RegisterScreen';
import { EmailVerificationScreen } from './payroll/screens/EmailVerificationScreen';
import ForgotPasswordScreen from './payroll/screens/ForgotPasswordScreen';

// Join tenant flow screens
import { UserHomeScreen } from './payroll/screens/UserHomeScreen';
import { JoinTenantScreen } from './payroll/screens/JoinTenantScreen';
import { JoinRequestPendingScreen } from './payroll/screens/JoinRequestPendingScreen';
import { AccountSettingsScreen } from './payroll/screens/AccountSettingsScreen';
import { AccountProfileScreen } from './payroll/screens/AccountProfileScreen';
import { AccountPasswordScreen } from './payroll/screens/AccountPasswordScreen';
import { AccountTwoFactorScreen } from './payroll/screens/AccountTwoFactorScreen';
import { AccountDevicesScreen } from './payroll/screens/AccountDevicesScreen';
import { MyJoinRequestsScreen } from './payroll/screens/MyJoinRequestsScreen';
import { ActivityScreen } from './payroll/screens/ActivityScreen';
import { TenantHubScreen } from './payroll/screens/TenantHubScreen';

// Main app screens
import { PayrollHomeScreen } from './payroll/screens/PayrollHomeScreen';
import { RequestsScreen } from './payroll/screens/RequestsScreen';
import { RequestDetailsScreen } from './payroll/screens/RequestDetailsScreen';
import { CreateRequestScreen } from './payroll/screens/CreateRequestScreen';
import { LeavesScreen } from './payroll/screens/LeavesScreen';
import { LeaveDetailsScreen } from './payroll/screens/LeaveDetailsScreen';
import { CreateLeaveScreen } from './payroll/screens/CreateLeaveScreen';
import { PayslipDetailsScreen } from './payroll/screens/PayslipDetailsScreen';
import { MyPayslipScreen } from './payroll/screens/MyPayslipScreen';
import MyAttendanceScreen from './payroll/screens/MyAttendanceScreen';
import AttendanceDetailsScreen from './payroll/screens/AttendanceDetailsScreen';
import AttendanceCheckInScreen from './payroll/screens/AttendanceCheckInScreen';
import { PunchRequestsScreen } from './payroll/screens/PunchRequestsScreen';
import { CreatePunchRequestScreen } from './payroll/screens/CreatePunchRequestScreen';
import EmployeeListScreen from './payroll/screens/EmployeeListScreen';
import EmployeeMapScreen from './payroll/screens/EmployeeMapScreen';
import { HelpScreen } from './payroll/screens/HelpScreen';
import { NotificationsScreen } from './payroll/screens/NotificationsScreen';
import { PrivacyPolicyScreen } from './payroll/screens/PrivacyPolicyScreen';
import { AboutScreen } from './payroll/screens/AboutScreen';
import { ClaimsScreen } from './payroll/screens/ClaimsScreen';
import { CreateClaimScreen } from './payroll/screens/CreateClaimScreen';
import { ClaimDetailsScreen } from './payroll/screens/ClaimDetailsScreen';
import { ClaimsApprovalScreen } from './payroll/screens/ClaimsApprovalScreen';
import { MyRequestsScreen } from './payroll/screens/MyRequestsScreen';
import { MyLeavesScreen } from './payroll/screens/MyLeavesScreen';
import { MyDocumentsScreen } from './payroll/screens/MyDocumentsScreen';
import { MyTrainingScreen } from './payroll/screens/MyTrainingScreen';
import { LeaveHistoryScreen } from './payroll/screens/LeaveHistoryScreen';
import { LeaveTypeScreen } from './payroll/screens/LeaveTypeScreen';
import { SearchScreen } from './payroll/screens/SearchScreen';
import { RequestTypesScreen } from './payroll/screens/RequestTypesScreen';
import { ClaimTypesScreen } from './payroll/screens/ClaimTypesScreen';

// Typed, so a route name that does not exist is a build error rather than a
// runtime no-op. Three screens sat registered and unreachable until this landed.
const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['payrollapp://'],
  config: {
    screens: {
      EmailVerification: 'verify-email',
      PayrollHome: 'home',
    },
  },
};

/**
 * Auth Wrapper Component
 * Routes users based on auth status:
 * - unauthenticated → Login/Register
 * - no_company → NoCompany/JoinCompany flow
 * - pending_approval → JoinRequestPending
 * - authenticated → Full app
 */
function AuthenticatedApp() {
  const { user, isLoading, authStatus } = usePayrollAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  if (isLoading) {
    // Same light page as every other screen. This was the last saturated #4285F4 block of the old
    // design, and it flashed on every cold start.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6F8FF' }}>
        <ActivityIndicator size="large" color="#2F6BFF" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B', marginTop: 14 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <NotificationProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {authStatus === 'unauthenticated' ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          </>
        ) : authStatus === 'no_company' ? (
          // User home — no tenant joined yet
          <>
            <Stack.Screen name="UserHome" component={UserHomeScreen} />
            <Stack.Screen name="JoinTenant" component={JoinTenantScreen} />
            <Stack.Screen name="JoinRequestPending" component={JoinRequestPendingScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
            <Stack.Screen name="AccountPassword" component={AccountPasswordScreen} />
            <Stack.Screen name="AccountTwoFactor" component={AccountTwoFactorScreen} />
            <Stack.Screen name="AccountDevices" component={AccountDevicesScreen} />
            <Stack.Screen name="MyJoinRequests" component={MyJoinRequestsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        ) : authStatus === 'pending_approval' ? (
          // Waiting for HR approval
          <>
            <Stack.Screen name="JoinRequestPending" component={JoinRequestPendingScreen} />
            <Stack.Screen name="UserHome" component={UserHomeScreen} />
            <Stack.Screen name="JoinTenant" component={JoinTenantScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
            <Stack.Screen name="AccountPassword" component={AccountPasswordScreen} />
            <Stack.Screen name="AccountTwoFactor" component={AccountTwoFactorScreen} />
            <Stack.Screen name="AccountDevices" component={AccountDevicesScreen} />
            <Stack.Screen name="MyJoinRequests" component={MyJoinRequestsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        ) : (
          // Full app — authenticated with linked employee
          // TenantHub is the entry point; user selects a tenant → PayrollHome
          <>
            <Stack.Screen name="TenantHub" component={TenantHubScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
            <Stack.Screen name="AccountPassword" component={AccountPasswordScreen} />
            <Stack.Screen name="AccountTwoFactor" component={AccountTwoFactorScreen} />
            <Stack.Screen name="AccountDevices" component={AccountDevicesScreen} />
            <Stack.Screen name="MyJoinRequests" component={MyJoinRequestsScreen} />
            <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
            <Stack.Screen name="Activity" component={ActivityScreen} />
            <Stack.Screen name="JoinTenant" component={JoinTenantScreen} />
            <Stack.Screen name="JoinRequestPending" component={JoinRequestPendingScreen} />
            <Stack.Screen name="Requests" component={RequestsScreen} />
            <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="Leaves" component={LeavesScreen} />
            <Stack.Screen name="LeaveDetails" component={LeaveDetailsScreen} />
            <Stack.Screen name="CreateLeave" component={CreateLeaveScreen} />
            <Stack.Screen name="MyPayslip" component={MyPayslipScreen} />
            <Stack.Screen name="PayslipDetails" component={PayslipDetailsScreen} />
            <Stack.Screen name="Attendance" component={MyAttendanceScreen} />
            <Stack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
            <Stack.Screen name="AttendanceCheckIn" component={AttendanceCheckInScreen} />
            {/* Reached from My Attendance: missed punches the employee asked HR to add. */}
            <Stack.Screen name="PunchRequests" component={PunchRequestsScreen} />
            <Stack.Screen name="CreatePunchRequest" component={CreatePunchRequestScreen} />
            <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
            <Stack.Screen name="EmployeeMap" component={EmployeeMapScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Claims" component={ClaimsScreen} />
            <Stack.Screen name="CreateClaim" component={CreateClaimScreen} />
            <Stack.Screen name="ClaimDetails" component={ClaimDetailsScreen} />
            <Stack.Screen name="ClaimsApproval" component={ClaimsApprovalScreen} />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
            <Stack.Screen name="MyLeaves" component={MyLeavesScreen} />
            <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
            <Stack.Screen name="MyTraining" component={MyTrainingScreen} />
            {/* Reached from My Leaves: the full year of applications, and one leave type's usage. */}
            <Stack.Screen name="LeaveHistory" component={LeaveHistoryScreen} />
            <Stack.Screen name="LeaveType" component={LeaveTypeScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="RequestTypes" component={RequestTypesScreen} />
            <Stack.Screen name="ClaimTypes" component={ClaimTypesScreen} />
          </>
        )}
      </Stack.Navigator>
      </NotificationProvider>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    console.log('[App.tsx] App mounted', {
      slug: Constants.expoConfig?.slug,
      scheme: Constants.expoConfig?.scheme,
    });
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <DialogProvider>
        <PayrollAuthProvider>
          <AuthenticatedApp />
        </PayrollAuthProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
