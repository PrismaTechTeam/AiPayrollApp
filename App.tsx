// ============================================================================
// CRITICAL DEBUG: This MUST run first - before any imports
// ============================================================================
console.log('🔥🔥🔥 APP.TSX FILE LOADED 🔥🔥🔥');
console.log('🔥🔥🔥 APP.TSX FILE LOADED 🔥🔥🔥');
console.log('🔥🔥🔥 APP.TSX FILE LOADED 🔥🔥🔥');
console.log('Time:', new Date().toISOString());

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PayrollAuthProvider } from './payroll/context/PayrollAuthContext';
import { ThemeProvider } from './payroll/context/ThemeContext';
import { LanguageProvider } from './payroll/context/LanguageContext';

console.log('✅ [App.tsx] Basic imports done');

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
import LoginScreen from './payroll/screens/LoginScreen';
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
import { SearchScreen } from './payroll/screens/SearchScreen';
import { usePayrollAuth } from './payroll/context/PayrollAuthContext';

console.log('✅ [App.tsx] PayrollHomeScreen imported:', !!PayrollHomeScreen);
console.log('✅ [App.tsx] RequestsScreen imported:', !!RequestsScreen);
console.log('✅ [App.tsx] RequestDetailsScreen imported:', !!RequestDetailsScreen);
console.log('✅ [App.tsx] LeavesScreen imported:', !!LeavesScreen);
console.log('✅ [App.tsx] LeaveDetailsScreen imported:', !!LeaveDetailsScreen);
console.log('✅ [App.tsx] PayslipScreen imported:', !!PayslipScreen);
console.log('✅ [App.tsx] PayslipDetailsScreen imported:', !!PayslipDetailsScreen);
console.log('✅ [App.tsx] AttendanceScreen imported:', !!AttendanceScreen);
console.log('✅ [App.tsx] AttendanceScreen type:', typeof AttendanceScreen);
console.log('✅ [App.tsx] AttendanceDetailsScreen imported:', !!AttendanceDetailsScreen);
console.log('✅ [App.tsx] AttendanceDetailsScreen type:', typeof AttendanceDetailsScreen);
console.log('✅ [App.tsx] LoginScreen imported:', !!LoginScreen);
console.log('✅ [App.tsx] ProfileScreen imported:', !!ProfileScreen);

const Stack = createNativeStackNavigator();

/**
 * Auth Wrapper Component
 * Handles conditional rendering based on auth state
 */
function AuthenticatedApp() {
  const { user, isLoading } = usePayrollAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4285F4' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'PayrollHome' : 'Login'}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          // Not logged in - show login screen
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Logged in - show app screens
          <>
            <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
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
            <Stack.Screen name="Search" component={SearchScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * NEW DIRECT ENTRY POINT
 * We have renamed src/app to src/app_backup to disable Expo Router.
 * This file is now the only one Expo looks at.
 */
export default function App() {
  useEffect(() => {
    // ============================================================================
    // DEBUG: Log when App component mounts to verify it's loading
    // ============================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ [App.tsx] APP COMPONENT MOUNTED');
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
      console.log('📱 [App.tsx] Current App Configuration:', {
        slug: Constants.expoConfig?.slug,
        name: Constants.expoConfig?.name,
        scheme: Constants.expoConfig?.scheme,
        owner: Constants.expoConfig?.owner,
        iosBundleId: Constants.expoConfig?.ios?.bundleIdentifier,
        androidPackage: Constants.expoConfig?.android?.package,
      });
      console.log('🔍 [App.tsx] App Ownership:', Constants.appOwnership);
      console.log('🔍 [App.tsx] Execution Environment:', Constants.executionEnvironment);
      console.log('🔍 [App.tsx] Is Device:', Constants.isDevice);
    } catch (configError) {
      console.error('❌ [App.tsx] Error reading config:', configError);
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ [App.tsx] Rendering PayrollHomeScreen...');
    console.log('═══════════════════════════════════════════════════════════════');
  }, []);

  if (!PayrollHomeScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'orange', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: 'black' }}>
          ⚠️ PayrollHomeScreen Not Found
        </Text>
        <Text style={{ fontSize: 14, color: 'black' }}>
          Check console for import errors
        </Text>
      </View>
    );
  }

  if (!AttendanceScreen) {
    console.error('❌ [App.tsx] AttendanceScreen is not imported correctly!');
  }

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

console.log('✅ [App.tsx] App component created');
console.log('🔥🔥🔥 APP.TSX COMPLETE 🔥🔥🔥');
