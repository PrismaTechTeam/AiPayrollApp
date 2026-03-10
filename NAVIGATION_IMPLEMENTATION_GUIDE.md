# Navigation Implementation Guide
## Auth-Based & Role-Based Routing (No Backend Required!)

---

## 🎯 Answer: **NO, you don't need backend connection!**

Auth-based and role-based routing is **purely client-side logic** that depends on:
1. ✅ `isAuthenticated` (from your auth context)
2. ✅ `currentRole` (from your auth context)
3. ✅ `user` object (already in your context)

You already have all of this in `PayrollAuthContext`! You just need to restructure your navigator.

---

## 📊 Current vs. Target Architecture

### **Current Payroll App Structure (Simple)**

```typescript
// App.tsx - Current
<NavigationContainer>
  <Stack.Navigator initialRouteName={user ? 'PayrollHome' : 'Login'}>
    {!user ? (
      <Stack.Screen name="Login" component={LoginScreen} />
    ) : (
      <>
        <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
        <Stack.Screen name="Requests" component={RequestsScreen} />
        {/* ... ALL screens always registered ... */}
      </>
    )}
  </Stack.Navigator>
</NavigationContainer>
```

**Issues:**
- ❌ All screens registered even if not authenticated
- ❌ No loading state while checking auth
- ❌ No role-based navigator separation
- ❌ Direct stack navigation (no nested navigators)

---

### **LetlinkMobileApp Structure (Professional)**

```
┌─────────────────────────────────────────────────────┐
│                  AppNavigator.tsx                    │
│         (Root - Decides which stack to show)        │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │  isLoading?         │
        │  → LoadingScreen    │
        └──────────┬──────────┘
                   │
        ┌──────────┴────────────────┐
        │  isAuthenticated?         │
        └────┬──────────────────┬───┘
             NO                 YES
             │                   │
    ┌────────┴─────────┐  ┌─────┴──────────────────┐
    │  AuthNavigator   │  │  isNewUser?            │
    │  (Login/Register)│  └───┬─────────────────┬──┘
    └──────────────────┘      YES              NO
                              │                │
                    ┌─────────┴──────┐  ┌──────┴────────┐
                    │ OnboardingNav  │  │  isAdmin?     │
                    │ (Setup Profile)│  └──┬────────┬───┘
                    └────────────────┘    YES      NO
                                          │        │
                                ┌─────────┴──┐  ┌──┴──────────┐
                                │ AdminNav   │  │ MainNav     │
                                │ (Admin UI) │  │ (User UI)   │
                                └────────────┘  └─────────────┘
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Loading state during auth check
- ✅ Role-based navigators
- ✅ Nested navigation (tabs + stack)
- ✅ Clean, maintainable code

---

## 🚀 Implementation Steps

### **Step 1: Create Navigator Structure**

Create these new files:

```
payroll/navigation/
├── AppNavigator.tsx          # Root navigator (auth routing)
├── stacks/
│   ├── AuthStack.tsx         # Login, Register (Guest only)
│   ├── EmployeeStack.tsx     # Employee-specific screens
│   └── ManagerStack.tsx      # Manager-specific screens
└── guards/
    ├── AuthGuard.tsx         # Protect authenticated screens
    └── RoleGuard.tsx         # Protect role-specific screens
```

---

### **Step 2: Implement AppNavigator (Root)**

```typescript
// payroll/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

// Import navigators
import AuthStack from './stacks/AuthStack';
import EmployeeStack from './stacks/EmployeeStack';
import ManagerStack from './stacks/ManagerStack';

// Loading screen
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading, currentRole } = usePayrollAuth();
  
  console.log('🧭 [AppNavigator] Auth State:', {
    isAuthenticated: !!user,
    currentRole,
    isLoading,
  });

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine which navigator to show
  const isAuthenticated = !!user;
  const isManager = currentRole === USER_ROLES.MANAGER;
  
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? (isManager ? 'Manager' : 'Employee') : 'Auth'}
      >
        {!isAuthenticated ? (
          // Not authenticated - Show Auth Stack (Login)
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : isManager ? (
          // Authenticated as Manager - Show Manager Stack
          <Stack.Screen name="Manager" component={ManagerStack} />
        ) : (
          // Authenticated as Employee - Show Employee Stack
          <Stack.Screen name="Employee" component={EmployeeStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Key Points:**
- ✅ Checks `isLoading` first (shows loading screen)
- ✅ Checks `isAuthenticated` (shows Auth or App stacks)
- ✅ Checks `currentRole` (shows Employee or Manager stack)
- ✅ No backend needed - uses context values!

---

### **Step 3: Implement AuthStack (Guest Only)**

```typescript
// payroll/navigation/stacks/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen'; // If you have one

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Add more auth screens if needed */}
      {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
      {/* <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> */}
    </Stack.Navigator>
  );
}
```

**Purpose:** Only accessible when user is NOT authenticated.

---

### **Step 4: Implement EmployeeStack**

```typescript
// payroll/navigation/stacks/EmployeeStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Employee-specific screens
import PayrollHomeScreen from '../../screens/PayrollHomeScreen';
import CreateLeaveScreen from '../../screens/CreateLeaveScreen';
import CreateRequestScreen from '../../screens/CreateRequestScreen';
import CreateClaimScreen from '../../screens/CreateClaimScreen';
import MyPayslipScreen from '../../screens/MyPayslipScreen';
import ClaimsScreen from '../../screens/ClaimsScreen';
import ClaimDetailsScreen from '../../screens/ClaimDetailsScreen';

// Shared screens
import AttendanceScreen from '../../screens/AttendanceScreen';
import TodaysAttendanceScreen from '../../screens/TodaysAttendanceScreen';
import AttendanceDetailsScreen from '../../screens/AttendanceDetailsScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import HelpScreen from '../../screens/HelpScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import ChangePasswordScreen from '../../screens/ChangePasswordScreen';
import NotificationsScreen from '../../screens/NotificationsScreen';
import ThemeScreen from '../../screens/ThemeScreen';
import LanguageScreen from '../../screens/LanguageScreen';
import PrivacyPolicyScreen from '../../screens/PrivacyPolicyScreen';
import AboutScreen from '../../screens/AboutScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PayrollHome"
    >
      {/* Main Home */}
      <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
      
      {/* Employee Features - CREATE/SUBMIT */}
      <Stack.Screen name="CreateLeave" component={CreateLeaveScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      <Stack.Screen name="CreateClaim" component={CreateClaimScreen} />
      
      {/* Employee Views */}
      <Stack.Screen name="MyPayslip" component={MyPayslipScreen} />
      <Stack.Screen name="Claims" component={ClaimsScreen} />
      <Stack.Screen name="ClaimDetails" component={ClaimDetailsScreen} />
      
      {/* Shared Screens */}
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="TodaysAttendance" component={TodaysAttendanceScreen} />
      <Stack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
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
    </Stack.Navigator>
  );
}
```

**Purpose:** Only accessible when user is authenticated as Employee.

---

### **Step 5: Implement ManagerStack**

```typescript
// payroll/navigation/stacks/ManagerStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Manager-specific screens
import PayrollHomeScreen from '../../screens/PayrollHomeScreen';
import LeavesScreen from '../../screens/LeavesScreen';
import LeaveDetailsScreen from '../../screens/LeaveDetailsScreen';
import RequestsScreen from '../../screens/RequestsScreen';
import RequestDetailsScreen from '../../screens/RequestDetailsScreen';
import PayslipScreen from '../../screens/PayslipScreen';
import PayslipDetailsScreen from '../../screens/PayslipDetailsScreen';
import ClaimsApprovalScreen from '../../screens/ClaimsApprovalScreen';
import ClaimDetailsScreen from '../../screens/ClaimDetailsScreen';

// Shared screens
import AttendanceScreen from '../../screens/AttendanceScreen';
import TodaysAttendanceScreen from '../../screens/TodaysAttendanceScreen';
import AttendanceDetailsScreen from '../../screens/AttendanceDetailsScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import HelpScreen from '../../screens/HelpScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import ChangePasswordScreen from '../../screens/ChangePasswordScreen';
import NotificationsScreen from '../../screens/NotificationsScreen';
import ThemeScreen from '../../screens/ThemeScreen';
import LanguageScreen from '../../screens/LanguageScreen';
import PrivacyPolicyScreen from '../../screens/PrivacyPolicyScreen';
import AboutScreen from '../../screens/AboutScreen';

const Stack = createNativeStackNavigator();

export default function ManagerStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="PayrollHome"
    >
      {/* Main Home */}
      <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
      
      {/* Manager Features - APPROVAL/MANAGEMENT */}
      <Stack.Screen name="Leaves" component={LeavesScreen} />
      <Stack.Screen name="LeaveDetails" component={LeaveDetailsScreen} />
      <Stack.Screen name="Requests" component={RequestsScreen} />
      <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
      <Stack.Screen name="Payslip" component={PayslipScreen} />
      <Stack.Screen name="PayslipDetails" component={PayslipDetailsScreen} />
      <Stack.Screen name="ClaimsApproval" component={ClaimsApprovalScreen} />
      <Stack.Screen name="ClaimDetails" component={ClaimDetailsScreen} />
      
      {/* Shared Screens */}
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="TodaysAttendance" component={TodaysAttendanceScreen} />
      <Stack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
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
    </Stack.Navigator>
  );
}
```

**Purpose:** Only accessible when user is authenticated as Manager.

---

### **Step 6: Create LoadingScreen**

```typescript
// payroll/screens/LoadingScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285F4" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default LoadingScreen;
```

---

### **Step 7: Update App.tsx to Use New Navigator**

```typescript
// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PayrollAuthProvider } from './payroll/context/PayrollAuthContext';
import { ThemeProvider } from './payroll/context/ThemeContext';
import { LanguageProvider } from './payroll/context/LanguageContext';
import AppNavigator from './payroll/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PayrollAuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppNavigator />
          </LanguageProvider>
        </ThemeProvider>
      </PayrollAuthProvider>
    </SafeAreaProvider>
  );
}
```

**That's it!** Much cleaner!

---

## 🎯 How Role Switching Works

When user switches role, the entire navigator tree re-renders:

```typescript
// In RoleSwitcher.tsx
const handleSelectRole = async (role: UserRole) => {
  try {
    await switchRole(role.value); // Updates context
    
    // Navigator automatically switches stack because currentRole changed!
    // Manager → ManagerStack
    // Employee → EmployeeStack
    
    onClose();
  } catch (error) {
    Alert.alert('Error', 'Failed to switch role');
  }
};
```

**Key Point:** Add `key={currentRole}` to force re-render:

```typescript
// AppNavigator.tsx
<Stack.Navigator
  key={currentRole} // Force re-render when role changes
  screenOptions={{ headerShown: false }}
>
  {/* ... */}
</Stack.Navigator>
```

---

## 🔒 Optional: Add Auth Guards (Extra Security)

### **AuthGuard.tsx** - Protect Authenticated Screens

```typescript
// payroll/navigation/guards/AuthGuard.tsx
import React, { useEffect } from 'react';
import { usePayrollAuth } from '../../context/PayrollAuthContext';
import LoadingScreen from '../../screens/LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const { user, isLoading } = usePayrollAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If auth required but user not authenticated, show loading
  // (AppNavigator will handle navigation to login)
  if (requireAuth && !user) {
    return <LoadingScreen message="Please login..." />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default AuthGuard;
```

### **RoleGuard.tsx** - Protect Role-Specific Screens

```typescript
// payroll/navigation/guards/RoleGuard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../../context/PayrollAuthContext';
import { USER_ROLES } from '../../constants/userRoles';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { currentRole } = usePayrollAuth();
  const navigation = useNavigation();

  const hasAccess = allowedRoles.includes(currentRole || '');

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.message}>
          You don't have permission to view this screen.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RoleGuard;
```

### **Usage Example:**

```typescript
// Inside a screen component
import { RoleGuard } from '../navigation/guards/RoleGuard';
import { USER_ROLES } from '../constants/userRoles';

const ManagerOnlyFeature = () => {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.MANAGER]}>
      <Text>This is only visible to managers!</Text>
    </RoleGuard>
  );
};
```

---

## 📊 Benefits of New Structure

### **Before (Current):**
```typescript
<Stack.Navigator>
  {!user ? (
    <Stack.Screen name="Login" />
  ) : (
    <>
      <Stack.Screen name="Screen1" />
      <Stack.Screen name="Screen2" />
      {/* 30+ screens always registered */}
    </>
  )}
</Stack.Navigator>
```

**Issues:**
- ❌ All screens in memory
- ❌ No role separation
- ❌ No loading state
- ❌ Hard to maintain

### **After (New):**
```typescript
<AppNavigator>
  {isLoading && <LoadingScreen />}
  {!user && <AuthStack />}
  {user && isManager && <ManagerStack />}
  {user && !isManager && <EmployeeStack />}
</AppNavigator>
```

**Benefits:**
- ✅ Only active stack in memory
- ✅ Clear role separation
- ✅ Proper loading state
- ✅ Easy to maintain
- ✅ Follows React Navigation best practices

---

## 🔄 Migration Steps

### **1. Create New Structure (Week 1, Day 1-2)**

```bash
# Create folders
mkdir -p payroll/navigation/stacks
mkdir -p payroll/navigation/guards

# Create files
touch payroll/navigation/AppNavigator.tsx
touch payroll/navigation/stacks/AuthStack.tsx
touch payroll/navigation/stacks/EmployeeStack.tsx
touch payroll/navigation/stacks/ManagerStack.tsx
touch payroll/navigation/guards/AuthGuard.tsx
touch payroll/navigation/guards/RoleGuard.tsx
touch payroll/screens/LoadingScreen.tsx
```

### **2. Implement Files (Day 2-3)**

Copy the code examples above into each file.

### **3. Update App.tsx (Day 3)**

Replace the entire Stack.Navigator with the new AppNavigator.

### **4. Test (Day 4)**

Test all flows:
- ✅ Not logged in → Shows login
- ✅ Login as Employee → Shows EmployeeStack
- ✅ Login as Manager → Shows ManagerStack
- ✅ Switch role → Stack changes
- ✅ Logout → Back to login

### **5. Add Guards (Optional, Day 5)**

Add AuthGuard and RoleGuard for extra protection.

---

## 💡 FAQs

### **Q: Do I need backend for this?**
**A:** NO! This is pure client-side navigation based on your auth context.

### **Q: Will this work with my current auth?**
**A:** YES! You already have everything needed in PayrollAuthContext.

### **Q: What about deep linking?**
**A:** This structure supports deep linking. Add linking config later.

### **Q: Can I still access all screens?**
**A:** YES! Shared screens are in both stacks. Role-specific screens are separated.

### **Q: What happens when switching roles?**
**A:** The entire navigator re-renders (use `key` prop) and shows the appropriate stack.

### **Q: Is this production-ready?**
**A:** YES! This is the same pattern used in LetlinkMobileApp (production app).

---

## 📝 Summary

### **What You Need:**
- ✅ AppNavigator (root router)
- ✅ AuthStack (login only)
- ✅ EmployeeStack (employee screens)
- ✅ ManagerStack (manager screens)
- ✅ LoadingScreen (while checking auth)
- ✅ (Optional) AuthGuard & RoleGuard

### **What You DON'T Need:**
- ❌ Backend connection
- ❌ API calls
- ❌ JWT tokens
- ❌ Database

### **Time to Implement:**
- 📅 **2-3 days** for basic structure
- 📅 **1-2 days** for guards (optional)
- 📅 **1 day** for testing

### **Total: 3-5 days**

---

## 🚀 Start Today!

```bash
# Step 1: Create structure
mkdir -p payroll/navigation/stacks payroll/navigation/guards

# Step 2: Create first file
code payroll/navigation/AppNavigator.tsx

# Step 3: Copy code from this guide

# Step 4: Test!
```

---

*Last Updated: January 2026*
*Status: Ready to Implement - No Backend Required!*
