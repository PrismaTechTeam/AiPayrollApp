import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PayrollAuthProvider, usePayrollAuth } from './payroll/context/PayrollAuthContext';
import { ThemeProvider } from './payroll/context/ThemeContext';
import { LanguageProvider } from './payroll/context/LanguageContext';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  parseNotificationData,
} from './payroll/services/pushNotificationHandler';

// Auth screens
import LoginScreen from './payroll/screens/LoginScreen';
import { RegisterScreen } from './payroll/screens/RegisterScreen';
import { EmailVerificationScreen } from './payroll/screens/EmailVerificationScreen';
import ForgotPasswordScreen from './payroll/screens/ForgotPasswordScreen';

// Join tenant flow screens
import { UserHomeScreen } from './payroll/screens/UserHomeScreen';
import { JoinTenantScreen } from './payroll/screens/JoinTenantScreen';
import { JoinRequestPendingScreen } from './payroll/screens/JoinRequestPendingScreen';
import { TenantHubScreen } from './payroll/screens/TenantHubScreen';

// Main app screens
import { PayrollHomeScreen } from './payroll/screens/PayrollHomeScreen';
import { RequestsScreen } from './payroll/screens/RequestsScreen';
import { RequestDetailsScreen } from './payroll/screens/RequestDetailsScreen';
import { CreateRequestScreen } from './payroll/screens/CreateRequestScreen';
import { LeavesScreen } from './payroll/screens/LeavesScreen';
import { LeaveDetailsScreen } from './payroll/screens/LeaveDetailsScreen';
import { CreateLeaveScreen } from './payroll/screens/CreateLeaveScreen';
import { PayslipScreen } from './payroll/screens/PayslipScreen';
import { PayslipDetailsScreen } from './payroll/screens/PayslipDetailsScreen';
import { MyPayslipScreen } from './payroll/screens/MyPayslipScreen';
import AttendanceScreen from './payroll/screens/AttendanceScreen';
import AttendanceDetailsScreen from './payroll/screens/AttendanceDetailsScreen';
import { TodaysAttendanceScreen } from './payroll/screens/TodaysAttendanceScreen';
import AttendanceCheckInScreen from './payroll/screens/AttendanceCheckInScreen';
import EmployeeListScreen from './payroll/screens/EmployeeListScreen';
import EmployeeMapScreen from './payroll/screens/EmployeeMapScreen';
import ProfileScreen from './payroll/screens/ProfileScreen';
import { SettingsScreen } from './payroll/screens/SettingsScreen';
import { HelpScreen } from './payroll/screens/HelpScreen';
import { EditProfileScreen } from './payroll/screens/EditProfileScreen';
import { ChangePasswordScreen } from './payroll/screens/ChangePasswordScreen';
import { NotificationsScreen } from './payroll/screens/NotificationsScreen';
import { ThemeScreen } from './payroll/screens/ThemeScreen';
import { LanguageScreen } from './payroll/screens/LanguageScreen';
import { PrivacyPolicyScreen } from './payroll/screens/PrivacyPolicyScreen';
import { AboutScreen } from './payroll/screens/AboutScreen';
import { ClaimsScreen } from './payroll/screens/ClaimsScreen';
import { CreateClaimScreen } from './payroll/screens/CreateClaimScreen';
import { ClaimDetailsScreen } from './payroll/screens/ClaimDetailsScreen';
import { ClaimsApprovalScreen } from './payroll/screens/ClaimsApprovalScreen';
import { MyRequestsScreen } from './payroll/screens/MyRequestsScreen';
import { MyLeavesScreen } from './payroll/screens/MyLeavesScreen';
import { SearchScreen } from './payroll/screens/SearchScreen';
import { RequestTypesScreen } from './payroll/screens/RequestTypesScreen';
import { ClaimTypesScreen } from './payroll/screens/ClaimTypesScreen';

const Stack = createNativeStackNavigator();

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

  // Set up push notification listeners
  useEffect(() => {
    // Handle notification received while app is in foreground
    const receivedSub = addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received in foreground:', notification.request.content.title);
    });

    // Handle notification tap (opens specific screen)
    const responseSub = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const { screen, params } = parseNotificationData(data);
      if (screen && navigationRef.current) {
        navigationRef.current.navigate(screen, params);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4285F4' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
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
          </>
        ) : authStatus === 'pending_approval' ? (
          // Waiting for HR approval
          <>
            <Stack.Screen name="JoinRequestPending" component={JoinRequestPendingScreen} />
            <Stack.Screen name="UserHome" component={UserHomeScreen} />
            <Stack.Screen name="JoinTenant" component={JoinTenantScreen} />
          </>
        ) : (
          // Full app — authenticated with linked employee
          // TenantHub is the entry point; user selects a tenant → PayrollHome
          <>
            <Stack.Screen name="TenantHub" component={TenantHubScreen} />
            <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
            <Stack.Screen name="JoinTenant" component={JoinTenantScreen} />
            <Stack.Screen name="JoinRequestPending" component={JoinRequestPendingScreen} />
            <Stack.Screen name="Requests" component={RequestsScreen} />
            <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="Leaves" component={LeavesScreen} />
            <Stack.Screen name="LeaveDetails" component={LeaveDetailsScreen} />
            <Stack.Screen name="CreateLeave" component={CreateLeaveScreen} />
            <Stack.Screen name="Payslip" component={PayslipScreen} />
            <Stack.Screen name="MyPayslip" component={MyPayslipScreen} />
            <Stack.Screen name="PayslipDetails" component={PayslipDetailsScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="TodaysAttendance" component={TodaysAttendanceScreen} />
            <Stack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
            <Stack.Screen name="AttendanceCheckIn" component={AttendanceCheckInScreen} />
            <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
            <Stack.Screen name="EmployeeMap" component={EmployeeMapScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Theme" component={ThemeScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Claims" component={ClaimsScreen} />
            <Stack.Screen name="CreateClaim" component={CreateClaimScreen} />
            <Stack.Screen name="ClaimDetails" component={ClaimDetailsScreen} />
            <Stack.Screen name="ClaimsApproval" component={ClaimsApprovalScreen} />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
            <Stack.Screen name="MyLeaves" component={MyLeavesScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="RequestTypes" component={RequestTypesScreen} />
            <Stack.Screen name="ClaimTypes" component={ClaimTypesScreen} />
          </>
        )}
      </Stack.Navigator>
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
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <PayrollAuthProvider>
            <AuthenticatedApp />
          </PayrollAuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
