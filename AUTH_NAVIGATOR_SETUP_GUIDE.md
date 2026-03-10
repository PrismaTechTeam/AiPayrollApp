# 🔐 Auth Navigator Setup: LetlinkMobileApp vs Payroll App

## 🎯 Quick Visual Comparison

```
LetlinkMobileApp:                    Payroll App:
┌─────────────────────┐             ┌─────────────────────┐
│    App.tsx (Root)   │             │    App.tsx (Root)   │
│  ┌───────────────┐  │             │  ┌───────────────┐  │
│  │ AuthProvider  │  │             │  │PayrollAuthProv│  │
│  │ ┌───────────┐ │  │             │  │ ┌───────────┐ │  │
│  │ │NavigationC│ │  │             │  │ │Authentica-│ │  │
│  │ │ontainer   │ │  │             │  │ │tedApp     │ │  │
│  │ │┌─────────┐│ │  │             │  │ │┌─────────┐│ │  │
│  │ ││AppNaviga││ │  │             │  │ ││Navigation││ │  │
│  │ ││tor      ││ │  │             │  │ ││Container ││ │  │
│  │ │└─────────┘│ │  │             │  │ │└─────────┘│ │  │
│  │ └───────────┘ │  │             │  │ └───────────┘ │  │
│  └───────────────┘  │             │  └───────────────┘  │
└─────────────────────┘             └─────────────────────┘
         │                                   │
         ├─ Conditional:                    ├─ Conditional:
         │  ├─ Auth Stack                   │  ├─ Login Screen
         │  ├─ Onboarding Stack             │  └─ All App Screens
         │  ├─ Admin Navigator                     (28 screens flat)
         │  └─ Main Navigator
         │     └─ Tab Navigator
         │        ├─ Dashboard Stack
         │        ├─ Cases Stack
         │        └─ Admin Stack
```

---

## 📁 File Structure Comparison

### **LetlinkMobileApp (Modular, Separate Files)**

```
LetlinkMobileApp/
├── App.tsx                                    # Root entry point
│   └── Wraps with AuthProvider
│       └── Wraps with NavigationContainer
│           └── Renders AppNavigator
│
└── src/
    ├── features/auth/context/
    │   └── AuthContext.tsx                    # 1,288 lines - Auth logic
    │
    └── navigation/
        ├── AppNavigator.tsx                   # Root navigator (conditional)
        │   └── Decides which stack to show
        │
        └── stacks/
            ├── AuthNavigator.tsx              # Auth screens stack
            ├── OnboardingNavigator.tsx        # Onboarding stack
            ├── MainNavigator.tsx              # Main app (tabs)
            ├── AdminNavigator.tsx             # Admin dashboard
            ├── DashboardStack.tsx             # Dashboard screens
            ├── CasesStack.tsx                 # Cases screens
            └── ... (11 more stacks)
```

### **Payroll App (Single File, Inline)**

```
LetlinkMobileApp/
├── App.tsx                                    # Everything in one file!
│   ├── PayrollAuthContext import
│   ├── Screen imports (28 screens)
│   ├── AuthenticatedApp component             # Auth check + navigation
│   └── App component (root)                   # Context providers
│
└── payroll/
    ├── context/
    │   └── PayrollAuthContext.tsx             # 160 lines - Auth logic
    │
    └── screens/                               # 28 screens (no stacks folder)
        ├── LoginScreen.tsx
        ├── PayrollHomeScreen.tsx
        ├── RequestsScreen.tsx
        └── ... (25 more screens)
```

---

## 🏗️ Setup Breakdown: LetlinkMobileApp

### **Step 1: Root Entry Point**

**📁 File:** `LetlinkMobileApp/App.tsx`

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>              {/* ← Auth state available globally */}
          <NavigationContainer>     {/* ← Navigation at root level */}
            <AppNavigator />        {/* ← Conditional routing happens here */}
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
```

**Key Points:**
- ✅ **Clean separation**: Each provider in its own file
- ✅ **AuthProvider** wraps entire app → auth state available everywhere
- ✅ **NavigationContainer** at root → single navigation tree
- ✅ **AppNavigator** decides which stack to show

---

### **Step 2: Auth Context (Enterprise-Grade)**

**📁 File:** `LetlinkMobileApp/src/features/auth/context/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from '../../../config/axios';
import { urlAuth } from '../../../config/endpoint';

// 1. Define State Structure
interface InitialStateType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: { UserInfo: UserInfo } | null;
  token: string;
  avatarUrl: string;
}

// 2. Define User Info Structure
interface UserInfo {
  uid: string;
  email: string;
  name: string;
  role: string | string[];        // Multiple roles!
  ActiveRole: string;              // Current active role
  isNewUser: boolean;
  LawyerId?: string;
  LawFirmId?: string;
}

// 3. Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. Create Reducer (for complex state management)
const reducer = (state: InitialStateType, action: any): InitialStateType => {
  switch (action.type) {
    case 'AUTH_STATE_CHANGED':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        isInitialized: true,
        user: action.payload.user,
        avatarUrl: action.payload.avatarUrl || '',
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload.token };
    case 'SET_AVATAR':
      return { ...state, avatarUrl: action.payload.avatarUrl };
    default:
      return state;
  }
};

// 5. Create Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  // 6. Initialize: Check for stored token on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          // Decode JWT token
          const decoded = jwtDecode(token);
          
          // Check if expired
          if (decoded.exp * 1000 < Date.now()) {
            await logout();
          } else {
            // Fetch user data from backend
            const response = await axios.get(urlAuth.profile, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const user = response.data;
            const avatarUrl = await getAvatarUrl(user.uid);
            
            dispatch({
              type: 'AUTH_STATE_CHANGED',
              payload: { isAuthenticated: true, user, avatarUrl }
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // 7. Login Function (calls backend API)
  const login = async (email: string, password: string) => {
    try {
      // Call backend login API
      const response = await axios.post(urlAuth.login, { email, password });
      const { token } = response.data;
      
      // Decode JWT to get user info
      const decoded = jwtDecode(token);
      
      // Store token securely
      await SecureStore.setItemAsync('authToken', token);
      
      // Fetch full user profile
      const userResponse = await axios.get(urlAuth.profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = userResponse.data;
      const avatarUrl = await getAvatarUrl(user.uid);
      
      // Update state
      dispatch({
        type: 'AUTH_STATE_CHANGED',
        payload: { isAuthenticated: true, user, avatarUrl }
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // 8. Logout Function
  const logout = async () => {
    try {
      // Cleanup WebSocket
      cleanupGlobalWebSocketService();
      
      // Call backend logout API
      await axios.post(urlAuth.logout);
      
      // Clear stored token
      await SecureStore.deleteItemAsync('authToken');
      
      // Update state
      dispatch({
        type: 'AUTH_STATE_CHANGED',
        payload: { isAuthenticated: false, user: null, avatarUrl: '' }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 9. Switch Role Function
  const switchRole = async (newRole: string) => {
    try {
      // Call backend to switch role
      const response = await axios.post(urlAuth.switchRole, { role: newRole });
      
      // Update user state
      const updatedUser = { ...state.user, UserInfo: { ...state.user.UserInfo, ActiveRole: newRole } };
      
      dispatch({
        type: 'AUTH_STATE_CHANGED',
        payload: { isAuthenticated: true, user: updatedUser, avatarUrl: state.avatarUrl }
      });
    } catch (error) {
      console.error('Switch role error:', error);
      throw error;
    }
  };

  // 10. Provide Context Value
  const value = {
    ...state,
    isLoading,
    login,
    logout,
    switchRole,
    register,
    confirmEmail,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 11. Create Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Key Features:**
- ✅ **useReducer** for complex state management
- ✅ **JWT token** decoding and validation
- ✅ **Backend API** integration
- ✅ **Token refresh** logic
- ✅ **WebSocket cleanup** on logout
- ✅ **Multiple roles** with switching
- ✅ **Avatar fetching**
- ✅ **Email confirmation**
- ✅ **Password reset**

---

### **Step 3: Root Navigator (Conditional Routing)**

**📁 File:** `LetlinkMobileApp/src/navigation/AppNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../features/auth/context/AuthContext';
import AuthNavigator from './stacks/AuthNavigator';
import OnboardingNavigator from './stacks/OnboardingNavigator';
import MainNavigator from './stacks/MainNavigator';
import AdminNavigator from './stacks/AdminNavigator';
import LoadingScreen from '../components/ui/feedback/LoadingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading screen while checking auth status
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine which stack to show
  const isNewUser = user?.UserInfo?.isNewUser === true;
  const activeRole = user?.UserInfo?.ActiveRole || '';
  const isAdmin = activeRole === 'Admin';

  const initialRouteName = !isAuthenticated 
    ? 'Auth' 
    : isNewUser 
    ? 'Onboarding' 
    : isAdmin 
    ? 'Admin' 
    : 'Main';

  console.log('🧭 [AppNavigator] Initial route:', initialRouteName);

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
      key={activeRole}  // Force re-render when role changes
    >
      {!isAuthenticated ? (
        // Not authenticated → Show Auth Stack
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : isNewUser ? (
        // New user → Show Onboarding Stack
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : isAdmin ? (
        // Admin user → Show Admin Navigator
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        // Regular user → Show Main Navigator
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

**Key Features:**
- ✅ **Conditional rendering**: Only ONE stack is active at a time
- ✅ **Loading state**: Shows loading screen during auth check
- ✅ **Role-based routing**: Different stacks for different roles
- ✅ **key={activeRole}**: Forces re-render when user switches role
- ✅ **Clean separation**: Each stack in its own file

---

### **Step 4: Auth Navigator (Auth Screens Stack)**

**📁 File:** `LetlinkMobileApp/src/navigation/stacks/AuthNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RegisterScreen from '../../features/auth/screens/RegisterScreen';
import OtpVerificationScreen from '../../features/auth/screens/OtpVerificationScreen';
import TwoFactorAuthScreen from '../../features/auth/screens/TwoFactorAuthScreen';
import EmailVerificationScreen from '../../features/auth/screens/EmailVerificationScreen';
import OtpTokenLoginScreen from '../../features/auth/screens/OtpTokenLoginScreen';
import ForgotPasswordScreen from '../../features/auth/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="OtpTokenLogin" component={OtpTokenLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
```

**Key Features:**
- ✅ **7 authentication screens** in one stack
- ✅ **Slide animation** for smooth transitions
- ✅ **No headers** (custom headers in screens)
- ✅ **Modular**: Easy to add/remove screens

---

## 🏗️ Setup Breakdown: Payroll App

### **Step 1: Root Entry Point (All-in-One)**

**📁 File:** `LetlinkMobileApp/App.tsx` (lines 137-195)

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PayrollAuthProvider } from './payroll/context/PayrollAuthContext';
import { ThemeProvider } from './payroll/context/ThemeContext';
import { LanguageProvider } from './payroll/context/LanguageContext';

// Import ALL 28 screens
import { PayrollHomeScreen } from './payroll/screens/PayrollHomeScreen';
import { RequestsScreen } from './payroll/screens/RequestsScreen';
import { LeavesScreen } from './payroll/screens/LeavesScreen';
// ... 25 more imports ...

// Auth Wrapper Component (inline in same file)
function AuthenticatedApp() {
  const { user, isLoading } = usePayrollAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'PayrollHome' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          // Not logged in → Show Login Screen
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Logged in → Show ALL 28 App Screens (flat list)
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Root App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <PayrollAuthProvider>
            <AuthenticatedApp />  {/* ← Auth check + navigation inline */}
          </PayrollAuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

**Key Points:**
- ✅ **Everything in one file**: Root, auth check, navigation, all screens
- ✅ **NavigationContainer** inside `AuthenticatedApp` (not at root)
- ✅ **Flat structure**: All 28 screens in one `<>` fragment
- ✅ **Simple conditional**: `user ? show app : show login`
- ✅ **No separate navigator files**

---

### **Step 2: Auth Context (Simplified)**

**📁 File:** `LetlinkMobileApp/payroll/context/PayrollAuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

// 1. Define User Structure (simple)
interface PayrollUser {
  uid: string;
  name: string;
  email: string;
  role: string;                    // Single role (current)
  availableRoles?: string[];       // Roles user can switch to
}

// 2. Create Context
const PayrollAuthContext = createContext<PayrollAuthContextType | undefined>(undefined);

// 3. Create Provider (using useState, not useReducer)
export const PayrollAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PayrollUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 4. Initialize: Check for stored user on app start
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('payroll_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  // 5. Login Function (dummy data, no backend)
  const login = async (email: string, password: string) => {
    // Hardcoded dummy users
    const DUMMY_USERS = [
      {
        email: 'employee@test.com',
        password: '123456',
        uid: 'emp-001',
        name: 'John Employee',
        role: 'Employee',
        availableRoles: ['Employee', 'Manager'],
      },
      {
        email: 'manager@test.com',
        password: '123456',
        uid: 'mgr-001',
        name: 'Sarah Manager',
        role: 'Manager',
        availableRoles: ['Employee', 'Manager'],
      },
    ];

    // Find matching user
    const matchedUser = DUMMY_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!matchedUser) {
      throw new Error('Invalid email or password');
    }

    // Store in SecureStore
    await SecureStore.setItemAsync('payroll_user', JSON.stringify(matchedUser));
    setUser(matchedUser);
  };

  // 6. Logout Function (simple)
  const logout = async () => {
    await SecureStore.deleteItemAsync('payroll_user');
    setUser(null);
  };

  // 7. Switch Role Function (simple)
  const switchRole = async (newRole: string) => {
    if (!user || !user.availableRoles?.includes(newRole)) {
      throw new Error('Invalid role');
    }

    const updatedUser = { ...user, role: newRole };
    await SecureStore.setItemAsync('payroll_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // 8. Provide Context Value
  const value = {
    user,
    isLoading,
    currentRole: user?.role || null,
    availableRoles: user?.availableRoles || [],
    switchRole,
    login,
    logout,
  };

  return <PayrollAuthContext.Provider value={value}>{children}</PayrollAuthContext.Provider>;
};

// 9. Create Hook
export const usePayrollAuth = () => {
  const context = useContext(PayrollAuthContext);
  if (!context) {
    throw new Error('usePayrollAuth must be used within PayrollAuthProvider');
  }
  return context;
};
```

**Key Features:**
- ✅ **useState** (not useReducer) - simpler state management
- ✅ **Dummy data** (no backend API calls)
- ✅ **Simple role switching** (no backend call)
- ✅ **SecureStore only** (no JWT tokens)
- ✅ **160 lines** vs 1,288 lines in LetlinkMobileApp

---

## 📊 Side-by-Side Comparison

| Aspect | LetlinkMobileApp | Payroll App |
|--------|------------------|-------------|
| **Root File** | `App.tsx` (clean, minimal) | `App.tsx` (all-in-one, 199 lines) |
| **AuthContext File** | `src/features/auth/context/AuthContext.tsx` (1,288 lines) | `payroll/context/PayrollAuthContext.tsx` (160 lines) |
| **Navigator File** | `src/navigation/AppNavigator.tsx` (separate) | Inline in `App.tsx` |
| **Auth Stack File** | `src/navigation/stacks/AuthNavigator.tsx` (separate) | No separate file |
| **State Management** | useReducer | useState |
| **Backend Integration** | ✅ Full API integration | ❌ Dummy data |
| **Token Management** | ✅ JWT decode, refresh, expiry | ❌ No tokens |
| **Role Switching** | ✅ Backend API call | ✅ Local state update |
| **WebSocket** | ✅ Cleanup on logout | ❌ Not implemented |
| **Avatar Fetching** | ✅ From backend | ❌ Not implemented |
| **Email Confirmation** | ✅ Yes | ❌ No |
| **Password Reset** | ✅ Yes | ❌ No |
| **2FA/OTP** | ✅ Yes | ❌ No |
| **Deep Linking** | ✅ Yes | ❌ No |

---

## 🎯 Navigation Flow Comparison

### **LetlinkMobileApp Flow:**

```
App Starts
    ↓
App.tsx (Root)
    ↓
AuthProvider wraps app
    ↓
NavigationContainer at root
    ↓
AppNavigator.tsx (Conditional Routing)
    ↓
Check: isAuthenticated?
    ├─ NO  → AuthNavigator.tsx (Auth Stack)
    │        ├─ Login Screen
    │        ├─ Register Screen
    │        ├─ OTP Screen
    │        └─ Forgot Password Screen
    │
    └─ YES → Check: isNewUser?
             ├─ YES → OnboardingNavigator.tsx (Onboarding Stack)
             │        └─ Complete Profile Screen
             │
             └─ NO  → Check: isAdmin?
                      ├─ YES → AdminNavigator.tsx (Admin Stack)
                      │        └─ Admin Dashboard (Tabs)
                      │
                      └─ NO  → MainNavigator.tsx (Main Stack)
                               └─ Tab Navigator
                                  ├─ Dashboard Tab → DashboardStack.tsx
                                  ├─ Cases Tab → CasesStack.tsx
                                  └─ Profile Tab → ProfileStack.tsx
```

**Key: Nested stacks, modular files, conditional at root**

---

### **Payroll App Flow:**

```
App Starts
    ↓
App.tsx (Root)
    ↓
PayrollAuthProvider wraps app
    ↓
AuthenticatedApp component (inline)
    ↓
Check: isLoading?
    ├─ YES → Show LoadingScreen
    │
    └─ NO  → NavigationContainer
             ↓
             Stack.Navigator
             ↓
             Check: user exists?
             ├─ NO  → Login Screen
             │
             └─ YES → All 28 App Screens (flat list)
                      ├─ PayrollHomeScreen
                      ├─ RequestsScreen
                      ├─ LeavesScreen
                      ├─ PayslipScreen
                      ├─ AttendanceScreen
                      ├─ ProfileScreen
                      └─ ... (22 more screens)
```

**Key: Flat structure, single file, conditional inside navigator**

---

## 🔑 Key Differences Summary

### **1. File Organization**

| LetlinkMobileApp | Payroll App |
|------------------|-------------|
| Modular (separate files) | All-in-one (single file) |
| `App.tsx` → `AppNavigator.tsx` → `AuthNavigator.tsx` | `App.tsx` (everything inline) |
| Easy to navigate | Harder to navigate |
| Scalable | Less scalable |

### **2. Navigation Structure**

| LetlinkMobileApp | Payroll App |
|------------------|-------------|
| Nested stacks (17 stacks) | Flat stack (1 stack) |
| Conditional at root level | Conditional inside navigator |
| Tab navigator with nested stacks | Custom bottom nav component |
| Role-based navigators | Role-based rendering in screens |

### **3. Auth Complexity**

| LetlinkMobileApp | Payroll App |
|------------------|-------------|
| 1,288 lines | 160 lines |
| useReducer | useState |
| JWT tokens | No tokens |
| Backend API | Dummy data |
| Token refresh | N/A |
| WebSocket cleanup | N/A |

### **4. Learning Curve**

| LetlinkMobileApp | Payroll App |
|------------------|-------------|
| High (enterprise patterns) | Low (simple patterns) |
| Requires understanding of nested navigation | Easy to understand |
| Requires understanding of JWT | No JWT knowledge needed |
| Requires understanding of useReducer | Just useState |

---

## 🎓 Which Approach Should You Use?

### **Use LetlinkMobileApp Approach If:**
- ✅ Building a production app with backend
- ✅ Need multiple user roles with different UIs
- ✅ Need real-time features (WebSocket, chat)
- ✅ Need advanced auth (JWT, 2FA, OTP)
- ✅ App will scale to 50+ screens
- ✅ Team of multiple developers
- ✅ Need maintainability and modularity

### **Use Payroll App Approach If:**
- ✅ Building a prototype or MVP
- ✅ Simple auth requirements
- ✅ Small app (< 30 screens)
- ✅ No backend yet (using mock data)
- ✅ Solo developer or small team
- ✅ Need to move fast
- ✅ Learning React Native

---

## 🚀 Migration Path: Payroll → LetlinkMobileApp Style

If you want to upgrade Payroll app to LetlinkMobileApp style:

### **Step 1: Extract AuthContext**
Move `PayrollAuthContext` to a separate file structure:
```
payroll/
└── features/
    └── auth/
        └── context/
            └── PayrollAuthContext.tsx
```

### **Step 2: Create AppNavigator**
Extract navigation logic from `App.tsx`:
```
payroll/
└── navigation/
    └── AppNavigator.tsx
```

### **Step 3: Create Auth Stack**
Create separate auth navigator:
```
payroll/
└── navigation/
    └── stacks/
        └── AuthNavigator.tsx
```

### **Step 4: Create Main Stack**
Create main app navigator:
```
payroll/
└── navigation/
    └── stacks/
        └── MainNavigator.tsx
```

### **Step 5: Integrate Backend**
Replace dummy data with API calls in `PayrollAuthContext`.

---

*Last Updated: January 2026*
