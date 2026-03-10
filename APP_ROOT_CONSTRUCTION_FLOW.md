# 🏗️ LetlinkMobileApp: Complete App Root Construction Flow

## 📋 Overview

This document traces the **complete call chain** from the very first file that loads to the final screen that appears on the user's device. Every step is documented with file names and what each file does.

---

## 🎯 The Complete Call Chain (Visual)

```
1. index.ts (Entry Point)
      ↓ registers
2. App.tsx (Root Component)
      ↓ imports & wraps
3. AuthProvider (Context)
      ↓ provides auth state
4. NavigationContainer (React Navigation)
      ↓ wraps
5. AppNavigator.tsx (Root Navigator)
      ↓ decides which stack to show
6. [ONE OF THESE - Based on Auth State]
      ├─ AuthNavigator.tsx (if not authenticated)
      ├─ OnboardingNavigator.tsx (if new user)
      ├─ AdminNavigator.tsx (if admin)
      └─ MainNavigator.tsx (if regular user)
           ↓ renders
7. Tab Navigator with Nested Stacks
      ├─ DashboardStack.tsx
      ├─ CasesStack.tsx
      └─ ProfileStack.tsx
           ↓ renders
8. Individual Screens (e.g., DashboardHomeScreen.tsx)
```

---

## 📁 Step-by-Step Breakdown with File Names

### **Step 1: Entry Point - Where Everything Starts**

**📁 File:** `@LetlinkMobileApp/index.ts`

**What it does:**
- **First file** that loads when the app starts
- Registers the root component with Expo/React Native
- Tells the system: "Use `App.tsx` as the root of the app"

**Code:**

```typescript
import { registerRootComponent } from 'expo';
import App from './App';

console.log('🚀 [index.ts] APP ROOT INITIALIZATION');

// Register App.tsx as the root component
registerRootComponent(App);

console.log('✅ [index.ts] Root component registered successfully!');
```

**Key Points:**
- ✅ This is the **entry point** defined in `package.json`
- ✅ `registerRootComponent` calls `AppRegistry.registerComponent('main', () => App)`
- ✅ This file doesn't render anything - it just registers `App`
- ✅ After this, React Native calls `App` to render the app

**What calls this file?**
- Expo/React Native runtime (defined in `package.json` → `"main": "index.ts"`)

**What does this file call?**
- Imports and registers `App.tsx`

---

### **Step 2: Root Component - Context Providers Setup**

**📁 File:** `@LetlinkMobileApp/App.tsx`

**What it does:**
- **Root React component** of the entire app
- Wraps the app with **context providers** (auth, language, theme)
- Wraps the app with **NavigationContainer**
- Renders **AppNavigator** inside all the providers

**Code Structure:**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>               {/* 1. Safe area handling */}
      <LanguageProvider>             {/* 2. Language/i18n state */}
        <AuthProvider>               {/* 3. Auth state (most important!) */}
          <NavigationContainer>      {/* 4. Navigation setup */}
            <AppNavigator />         {/* 5. Root navigator */}
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
```

**What's happening here (Layer by Layer):**

1. **SafeAreaProvider** (outermost layer)
   - Handles device notches, home indicators, status bars
   - Provides safe area insets to child components

2. **LanguageProvider**
   - Manages app language (English, Arabic, Chinese, etc.)
   - Provides translation functions (`t()`)

3. **AuthProvider** (critical!)
   - Manages authentication state
   - Provides `useAuth()` hook to entire app
   - Contains: `isAuthenticated`, `user`, `login()`, `logout()`, etc.

4. **NavigationContainer**
   - React Navigation's root container
   - Manages navigation state
   - Handles deep linking
   - Provides navigation context

5. **AppNavigator**
   - The actual navigator that decides which screen to show
   - Uses `useAuth()` to check authentication status
   - Conditionally renders different navigation stacks

**Key Points:**
- ✅ This is the **first React component** that renders
- ✅ All context providers wrap the entire app
- ✅ `AppNavigator` can access auth state because it's inside `AuthProvider`
- ✅ `NavigationContainer` is at root level (only one per app)

**What calls this file?**
- `index.ts` via `registerRootComponent(App)`

**What does this file call?**
- Renders `AppNavigator` from `src/navigation/AppNavigator.tsx`

---

### **Step 3: Authentication Context - The Brain**

**📁 File:** `@LetlinkMobileApp/src/features/auth/context/AuthContext.tsx`

**What it does:**
- **Manages authentication state** for the entire app
- Checks if user is logged in (on app start)
- Provides login, logout, register functions
- Stores JWT tokens in SecureStore
- Decodes tokens to get user info
- Handles token refresh and expiration

**Code Structure:**

```typescript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from '../../../config/axios';

// 1. Define state structure
interface InitialStateType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: { UserInfo: UserInfo } | null;
  token: string;
  avatarUrl: string;
}

// 2. Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 4. Initialize: Check for stored token on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check SecureStore for existing token
        const token = await SecureStore.getItemAsync('authToken');
        
        if (token) {
          // Decode JWT token
          const decoded = jwtDecode(token);
          
          // Check if expired
          if (decoded.exp * 1000 < Date.now()) {
            await logout(); // Token expired
          } else {
            // Fetch user data from backend
            const response = await axios.get('/api/profile');
            const user = response.data;
            
            // Update state: User is authenticated
            dispatch({
              type: 'AUTH_STATE_CHANGED',
              payload: { isAuthenticated: true, user }
            });
          }
        } else {
          // No token: User is not authenticated
          dispatch({
            type: 'AUTH_STATE_CHANGED',
            payload: { isAuthenticated: false, user: null }
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };

    initialize();
  }, []);

  // 5. Provide auth state to entire app
  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 6. Hook to access auth state
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**What's happening here:**

1. **On App Start:**
   - Checks SecureStore for existing auth token
   - If token exists → decode it → check expiry → fetch user data
   - If no token → user is not authenticated

2. **Provides Auth State:**
   - `isAuthenticated`: true/false
   - `isLoading`: true (during check), false (after)
   - `user`: user data object with roles, email, name, etc.
   - `login()`: function to log in
   - `logout()`: function to log out

3. **Available to Entire App:**
   - Any component can call `useAuth()` to access auth state
   - AppNavigator uses this to decide which screens to show

**Key Points:**
- ✅ This runs **on every app start** (checks for existing login)
- ✅ Takes a few milliseconds to check SecureStore
- ✅ Updates state once check is complete
- ✅ Provides auth state via Context API

**What calls this file?**
- Imported and used in `App.tsx` as `<AuthProvider>`

**What does this file provide?**
- Auth state to all components via `useAuth()` hook

---

### **Step 4: Root Navigator - The Traffic Controller**

**📁 File:** `@LetlinkMobileApp/src/navigation/AppNavigator.tsx`

**What it does:**
- **Main navigation controller** of the app
- Uses `useAuth()` to check authentication status
- **Conditionally renders** different navigation stacks based on:
  - Is user authenticated?
  - Is user a new user (needs onboarding)?
  - What is the user's active role (Admin, Lawyer, User)?
- Manages WebSocket initialization
- Manages notification provider

**Code:**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../features/auth/context/AuthContext';
import AuthNavigator from './stacks/AuthNavigator';
import OnboardingNavigator from './stacks/OnboardingNavigator';
import MainNavigator from './stacks/MainNavigator';
import AdminNavigator from './stacks/AdminNavigator';
import LoadingScreen from '../components/ui/feedback/LoadingScreen';
import WebSocketInitializer from '../components/websocket/WebSocketInitializer';
import { NotificationProvider } from '../components/NotificationProvider';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  // 1. Get auth state from AuthContext
  const { isAuthenticated, isLoading, user } = useAuth();

  // 2. Show loading screen while checking auth status
  if (isLoading) {
    return <LoadingScreen />;  // Shows "Loading..." spinner
  }

  // 3. Determine user's status
  const isNewUser = user?.UserInfo?.isNewUser === true;
  const activeRole = user?.UserInfo?.ActiveRole || '';
  const isAdmin = activeRole === 'Admin';

  // 4. Decide which stack to show
  const initialRouteName = !isAuthenticated 
    ? 'Auth'           // Not logged in → Show login screens
    : isNewUser 
    ? 'Onboarding'     // New user → Show profile setup
    : isAdmin 
    ? 'Admin'          // Admin → Show admin dashboard
    : 'Main';          // Regular user → Show main app

  console.log('🧭 [AppNavigator] Initial route:', initialRouteName);

  return (
    <NotificationProvider>
      {/* Initialize WebSocket only when authenticated */}
      {isAuthenticated && <WebSocketInitializer />}
      
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRouteName}
        key={activeRole}  // Force re-render when role changes
      >
        {/* CONDITIONAL RENDERING: Only ONE of these is shown */}
        {!isAuthenticated ? (
          // Not logged in → Show Auth Stack
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isNewUser ? (
          // New user → Show Onboarding Stack
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : isAdmin ? (
          // Admin → Show Admin Navigator
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          // Regular user → Show Main Navigator
          <Stack.Screen name="Main" component={MainNavigator} />
        )}

        {/* Deep link screens (accessible via URLs) */}
        <Stack.Screen 
          name="JoinLawFirm" 
          component={JoinLawFirmScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NotificationProvider>
  );
}
```

**Decision Tree (What AppNavigator Does):**

```
Start
  ↓
Is isLoading true?
  ├─ YES → Show LoadingScreen (stop here until loading completes)
  └─ NO  → Continue
            ↓
      Is isAuthenticated false?
        ├─ YES → Render AuthNavigator (Login/Register screens)
        │
        └─ NO → Is isNewUser true?
                 ├─ YES → Render OnboardingNavigator (Complete profile)
                 │
                 └─ NO → Is activeRole === 'Admin'?
                          ├─ YES → Render AdminNavigator (Admin dashboard)
                          │
                          └─ NO → Render MainNavigator (Main app with tabs)
```

**Key Points:**
- ✅ This is the **traffic controller** of the app
- ✅ Uses conditional rendering (only ONE navigator is active)
- ✅ `key={activeRole}` forces re-render when user switches roles
- ✅ Shows loading screen during initial auth check
- ✅ Initializes WebSocket only when user is authenticated

**What calls this file?**
- Rendered by `App.tsx` inside `NavigationContainer`

**What does this file call?**
- Renders ONE of these navigators (based on conditions):
  - `AuthNavigator` (login flow)
  - `OnboardingNavigator` (new user setup)
  - `AdminNavigator` (admin dashboard)
  - `MainNavigator` (main app)

---

### **Step 5a: Auth Navigator - Login Flow** (If Not Authenticated)

**📁 File:** `@LetlinkMobileApp/src/navigation/stacks/AuthNavigator.tsx`

**What it does:**
- **Stack of authentication screens**
- Handles login, register, forgot password, OTP, 2FA flows
- User can navigate between these screens

**Code:**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RegisterScreen from '../../features/auth/screens/RegisterScreen';
import OtpVerificationScreen from '../../features/auth/screens/OtpVerificationScreen';
import TwoFactorAuthScreen from '../../features/auth/screens/TwoFactorAuthScreen';
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
      {/* All authentication screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
```

**Navigation Flow:**

```
AuthNavigator
  ├─ Login Screen (initial screen)
  │   ├─ User taps "Register" → Navigate to Register Screen
  │   ├─ User taps "Forgot Password" → Navigate to Forgot Password Screen
  │   └─ User logs in successfully → AuthContext updates → AppNavigator re-renders → Shows MainNavigator
  │
  ├─ Register Screen
  │   └─ After registration → Navigate to OTP Verification
  │
  ├─ OTP Verification Screen
  │   └─ After OTP → Navigate to 2FA (if enabled)
  │
  └─ Forgot Password Screen
      └─ After reset → Navigate back to Login
```

**Key Points:**
- ✅ This is a **stack of screens** (can navigate back and forth)
- ✅ Initial screen is **Login**
- ✅ Once user logs in, `AuthContext` updates → AppNavigator re-renders
- ✅ AppNavigator sees `isAuthenticated = true` → switches to MainNavigator

**What calls this file?**
- Rendered by `AppNavigator` when `isAuthenticated === false`

**What does this file call?**
- Renders authentication screens (LoginScreen, RegisterScreen, etc.)

---

### **Step 5b: Main Navigator - Main App Flow** (If Authenticated)

**📁 File:** `@LetlinkMobileApp/src/navigation/stacks/MainNavigator.tsx`

**What it does:**
- **Main app navigation** (after login)
- Creates **bottom tab navigator** with multiple tabs
- Each tab contains its own **nested stack** of screens
- Conditionally shows tabs based on user role

**Code:**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../features/auth/context/AuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../../constants/userRoles';

// Import nested stacks
import DashboardStack from './DashboardStack';
import CasesStack from './CasesStack';
import AdminStack from './AdminStack';
import VoucherScreen from '../../features/voucher/screens/VoucherScreen';
import ChatScreen from '../../screens/Chat/ChatScreen';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const { user } = useAuth();
  
  // Check user's permissions
  const isAdmin = hasRoleAccess(user?.UserInfo?.ActiveRole, ROLE_GROUPS.ADMIN_ONLY);
  const isUser = hasRoleAccess(user?.UserInfo?.ActiveRole, ROLE_GROUPS.USER_ONLY);
  const isLawyer = hasRoleAccess(user?.UserInfo?.ActiveRole, ROLE_GROUPS.LAWYER_ONLY);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#757575',
      }}
    >
      {/* Dashboard Tab - Shows for Users and Admins */}
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}  // Nested stack!
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />

      {/* Cases Tab - Shows for Users only */}
      {isUser && (
        <Tab.Screen 
          name="Cases" 
          component={CasesStack}  // Nested stack!
          options={{
            title: 'My Cases',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="briefcase" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Vouchers Tab - Shows for Users only */}
      {isUser && (
        <Tab.Screen 
          name="Vouchers" 
          component={VoucherScreen}
          options={{
            title: 'Vouchers',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="ticket-percent" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Chat Tab - Shows for everyone */}
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" size={size} color={color} />
          ),
        }}
      />

      {/* Admin Tab - Shows for Admins only */}
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminStack}  // Nested stack!
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="shield-account" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}
```

**Tab Navigator Structure:**

```
MainNavigator (Bottom Tabs)
  │
  ├─ Dashboard Tab
  │   └─ DashboardStack.tsx (nested stack)
  │       ├─ DashboardHomeScreen
  │       ├─ BlogDetailsScreen
  │       ├─ SearchScreen
  │       └─ ... (30+ screens)
  │
  ├─ Cases Tab (User only)
  │   └─ CasesStack.tsx (nested stack)
  │       ├─ MyCasesList
  │       ├─ CaseDetails
  │       └─ PostMyCase
  │
  ├─ Vouchers Tab (User only)
  │   └─ VoucherScreen (single screen)
  │
  ├─ Chat Tab (Everyone)
  │   └─ ChatScreen (single screen)
  │
  └─ Admin Tab (Admin only)
      └─ AdminStack.tsx (nested stack)
          ├─ ManageUsers
          ├─ ManageLawyers
          └─ ... (admin screens)
```

**Key Points:**
- ✅ **Bottom Tab Navigator** (tabs at bottom of screen)
- ✅ Each tab can have a **nested stack** (multiple screens)
- ✅ **Role-based tabs**: Admin tab only shows for admins
- ✅ Tabs are always visible (can switch between them)
- ✅ Initial tab is **Dashboard**

**What calls this file?**
- Rendered by `AppNavigator` when `isAuthenticated === true` and user is not new

**What does this file call?**
- Renders nested stacks:
  - `DashboardStack` (Dashboard screens)
  - `CasesStack` (Cases screens)
  - `AdminStack` (Admin screens)
  - Individual screens (VoucherScreen, ChatScreen)

---

### **Step 6: Dashboard Stack - Nested Navigation**

**📁 File:** `@LetlinkMobileApp/src/navigation/stacks/DashboardStack.tsx`

**What it does:**
- **Stack of screens** for the Dashboard tab
- Contains 30+ screens related to dashboard features
- User can navigate between these screens
- Back button returns to previous screen in the stack

**Code:**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardHomeScreen from '../../features/dashboard/screens/DashboardHomeScreen';
import BlogDetailsScreen from '../../features/dashboard/screens/BlogDetailsScreen';
import SearchScreen from '../../features/search/screens/SearchScreen';
import FindLawyerScreen from '../../features/findLawyer/screens/FindLawyerScreen';
// ... 25+ more imports

const Stack = createNativeStackNavigator();

export default function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Initial screen */}
      <Stack.Screen 
        name="DashboardHome" 
        component={DashboardHomeScreen}
      />
      
      {/* Other dashboard screens */}
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="BlogDetailsScreen" component={BlogDetailsScreen} />
      <Stack.Screen name="FindLawyerScreen" component={FindLawyerScreen} />
      <Stack.Screen name="LawyerDetailsScreen" component={LawyerDetailsScreen} />
      <Stack.Screen name="ToolsPage" component={ToolsPage} />
      {/* ... 25+ more screens */}
    </Stack.Navigator>
  );
}
```

**Navigation Flow:**

```
User is on Dashboard Tab
  ↓
DashboardStack renders DashboardHomeScreen (initial screen)
  ↓
User taps "Find a Lawyer" button
  ↓
navigation.navigate('FindLawyerScreen')
  ↓
Stack pushes FindLawyerScreen on top
  ↓
User taps a lawyer card
  ↓
navigation.navigate('LawyerDetailsScreen', { lawyerId: 123 })
  ↓
Stack pushes LawyerDetailsScreen on top
  ↓
User presses back button
  ↓
Stack pops LawyerDetailsScreen
  ↓
Back to FindLawyerScreen
```

**Key Points:**
- ✅ This is a **nested stack** inside the Dashboard tab
- ✅ Initial screen is **DashboardHomeScreen**
- ✅ User can navigate to 30+ screens without leaving the tab
- ✅ Bottom tabs remain visible (can switch to other tabs anytime)
- ✅ Each tab has its own navigation history (stack)

**What calls this file?**
- Rendered by `MainNavigator` as the Dashboard tab

**What does this file call?**
- Renders individual screens (DashboardHomeScreen, SearchScreen, etc.)

---

### **Step 7: Individual Screen - The Final Destination**

**📁 File:** `@LetlinkMobileApp/src/features/dashboard/screens/DashboardHomeScreen.tsx`

**What it does:**
- **Actual UI** that the user sees
- Contains buttons, lists, cards, images
- Handles user interactions (button taps, scrolling)
- Navigates to other screens when user taps buttons

**Code Structure:**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../features/auth/context/AuthContext';

export default function DashboardHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <ScrollView>
      <Text>Welcome, {user?.UserInfo?.name}!</Text>
      
      {/* Find Lawyer Button */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('FindLawyerScreen')}
      >
        <Text>Find a Lawyer</Text>
      </TouchableOpacity>

      {/* Blog Section */}
      <View>
        <Text>Latest Blog Posts</Text>
        {/* Blog cards */}
      </View>

      {/* Calculator Tools */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('ToolsPage')}
      >
        <Text>Legal Calculators</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

**Key Points:**
- ✅ This is the **final screen** the user sees
- ✅ Uses `useAuth()` to access user data
- ✅ Uses `useNavigation()` to navigate to other screens
- ✅ Contains actual UI elements (buttons, text, images)

**What calls this file?**
- Rendered by `DashboardStack` as the initial screen

**What does this file call?**
- Nothing (it's the end of the chain)
- But it can **trigger navigation** to other screens

---

## 🔄 Complete Flow Summary

### **On App Start (Cold Start):**

```
1. React Native Runtime
      ↓ loads
2. @LetlinkMobileApp/index.ts
      ↓ registers
3. @LetlinkMobileApp/App.tsx
      ↓ renders
4. Context Providers (SafeAreaProvider, LanguageProvider, AuthProvider)
      ↓ AuthProvider initializes (checks SecureStore for token)
      ↓ (takes ~100-500ms)
      ↓ Updates state: isLoading = false, isAuthenticated = true/false
5. NavigationContainer
      ↓ wraps
6. @LetlinkMobileApp/src/navigation/AppNavigator.tsx
      ↓ reads auth state from AuthContext
      ↓ decides which navigator to render
      ↓
      ├─ If isLoading = true:
      │    └─ Shows LoadingScreen (stop here until loading completes)
      │
      └─ If isLoading = false:
           ├─ If isAuthenticated = false:
           │    └─ Renders @LetlinkMobileApp/src/navigation/stacks/AuthNavigator.tsx
           │         └─ Shows LoginScreen
           │
           └─ If isAuthenticated = true:
                ├─ If isNewUser = true:
                │    └─ Renders OnboardingNavigator
                │         └─ Shows CompleteProfileScreen
                │
                └─ If isNewUser = false:
                     ├─ If activeRole = 'Admin':
                     │    └─ Renders AdminNavigator
                     │         └─ Shows AdminDashboard
                     │
                     └─ If activeRole = 'User' or 'Lawyer':
                          └─ Renders @LetlinkMobileApp/src/navigation/stacks/MainNavigator.tsx
                               └─ Shows Bottom Tabs
                                    └─ Dashboard Tab (initial)
                                         └─ @LetlinkMobileApp/src/navigation/stacks/DashboardStack.tsx
                                              └─ DashboardHomeScreen (initial)
                                                   └─ USER SEES THIS SCREEN! ✅
```

---

## 📊 File Dependency Tree

```
@LetlinkMobileApp/
│
├─ index.ts                                                  # Entry point
│   └─ imports & registers
│       └─ App.tsx                                           # Root component
│           └─ imports & renders
│               ├─ src/features/auth/context/AuthContext.tsx # Auth state
│               │   └─ provides auth state to entire app
│               │
│               └─ src/navigation/AppNavigator.tsx           # Root navigator
│                   └─ conditionally renders ONE of:
│                       │
│                       ├─ src/navigation/stacks/AuthNavigator.tsx
│                       │   └─ renders auth screens
│                       │       ├─ src/features/auth/screens/LoginScreen.tsx
│                       │       ├─ src/features/auth/screens/RegisterScreen.tsx
│                       │       └─ ... (5 more auth screens)
│                       │
│                       ├─ src/navigation/stacks/OnboardingNavigator.tsx
│                       │   └─ renders onboarding screens
│                       │
│                       ├─ src/navigation/stacks/AdminNavigator.tsx
│                       │   └─ renders admin dashboard
│                       │
│                       └─ src/navigation/stacks/MainNavigator.tsx
│                           └─ renders bottom tabs
│                               ├─ Dashboard Tab
│                               │   └─ src/navigation/stacks/DashboardStack.tsx
│                               │       └─ renders dashboard screens (30+)
│                               │           ├─ DashboardHomeScreen.tsx
│                               │           ├─ SearchScreen.tsx
│                               │           ├─ BlogDetailsScreen.tsx
│                               │           └─ ... (27 more)
│                               │
│                               ├─ Cases Tab
│                               │   └─ src/navigation/stacks/CasesStack.tsx
│                               │       └─ renders case screens (4)
│                               │
│                               ├─ Vouchers Tab
│                               │   └─ VoucherScreen.tsx
│                               │
│                               ├─ Chat Tab
│                               │   └─ ChatScreen.tsx
│                               │
│                               └─ Admin Tab (if admin)
│                                   └─ src/navigation/stacks/AdminStack.tsx
│                                       └─ renders admin screens (20+)
```

---

## ⏱️ Timeline: What Happens When

### **Millisecond by Millisecond (Approximate):**

```
T + 0ms:    React Native starts
T + 10ms:   index.ts loads
T + 15ms:   App.tsx loads
T + 20ms:   Context providers initialize
T + 25ms:   AuthProvider starts (begins checking SecureStore)
T + 30ms:   NavigationContainer initializes
T + 35ms:   AppNavigator renders with isLoading = true
T + 35ms:   LoadingScreen appears on device (user sees loading spinner)
            ↓
            [Auth check happens in background]
            ↓
T + 150ms:  AuthProvider finishes checking SecureStore
T + 155ms:  AuthProvider updates state: isLoading = false, isAuthenticated = true/false
T + 160ms:  AppNavigator re-renders (React detects state change)
T + 165ms:  AppNavigator decides which navigator to show
T + 170ms:  MainNavigator renders (if authenticated)
T + 175ms:  DashboardStack renders
T + 180ms:  DashboardHomeScreen renders
T + 200ms:  DashboardHomeScreen appears on device ✅
            USER SEES THE SCREEN!
```

**Total Time:** ~200ms (very fast!)

---

## 🎯 What AppNavigator Does (Detailed)

### **Primary Responsibilities:**

1. **Waits for Auth Check**
   - Shows loading screen while AuthContext checks SecureStore
   - Prevents showing wrong screen before auth state is determined

2. **Reads Auth State**
   - Gets `isAuthenticated`, `user`, `isLoading` from `useAuth()`
   - Uses this data to make navigation decisions

3. **Determines User's Status**
   - Is user logged in?
   - Is user a new user (needs onboarding)?
   - What is user's role (Admin, Lawyer, User)?

4. **Conditionally Renders Navigator**
   - **Only ONE navigator is rendered** at a time
   - Uses conditional logic to decide which one
   - Forces re-render when role changes (via `key={activeRole}`)

5. **Manages WebSocket**
   - Initializes WebSocket only when user is authenticated
   - Provides real-time features (chat, notifications)

6. **Manages Notifications**
   - Wraps everything in NotificationProvider
   - Handles push notifications, in-app notifications

7. **Handles Deep Links**
   - Provides special screens for deep links (e.g., email invitations)
   - These are accessible via URLs even if user is not on that screen

### **Decision Logic:**

```typescript
if (isLoading) {
  // Still checking auth status
  return <LoadingScreen />;
}

if (!isAuthenticated) {
  // User is not logged in
  return <AuthNavigator />;  // Show login screens
}

if (isNewUser) {
  // User is logged in but needs to complete profile
  return <OnboardingNavigator />;  // Show profile setup
}

if (isAdmin) {
  // User is logged in, profile complete, and is an admin
  return <AdminNavigator />;  // Show admin dashboard
}

// User is logged in, profile complete, and is a regular user/lawyer
return <MainNavigator />;  // Show main app with tabs
```

---

## 🚀 Next Steps After AppNavigator Executes

### **Scenario 1: User is NOT Authenticated**

```
AppNavigator renders AuthNavigator
  ↓
AuthNavigator renders LoginScreen
  ↓
User sees login form
  ↓
User enters email/password and taps "Login"
  ↓
LoginScreen calls login() function from useAuth()
  ↓
AuthContext makes API call to backend
  ↓
Backend returns JWT token
  ↓
AuthContext stores token in SecureStore
  ↓
AuthContext decodes token to get user info
  ↓
AuthContext updates state: isAuthenticated = true, user = {...}
  ↓
AppNavigator re-renders (React detects state change)
  ↓
AppNavigator sees isAuthenticated = true
  ↓
AppNavigator renders MainNavigator
  ↓
User sees main app! ✅
```

---

### **Scenario 2: User IS Authenticated (Returning User)**

```
AppNavigator reads auth state
  ↓
isAuthenticated = true (token exists in SecureStore)
  ↓
AppNavigator renders MainNavigator
  ↓
MainNavigator renders Bottom Tabs
  ↓
Dashboard Tab is initial tab
  ↓
DashboardStack renders DashboardHomeScreen
  ↓
User sees dashboard! ✅
  ↓
User taps "Find a Lawyer" button
  ↓
DashboardHomeScreen calls navigation.navigate('FindLawyerScreen')
  ↓
DashboardStack pushes FindLawyerScreen on top
  ↓
User sees Find Lawyer screen
  ↓
User taps "Cases" tab at bottom
  ↓
MainNavigator switches to Cases tab
  ↓
CasesStack renders MyCasesList screen
  ↓
User sees their cases
  ↓
... app continues running ...
```

---

## 🔑 Key Takeaways

1. **Entry Point:** `index.ts` (registers the app)
2. **Root Component:** `App.tsx` (wraps with providers)
3. **Auth Logic:** `AuthContext.tsx` (checks login status)
4. **Traffic Controller:** `AppNavigator.tsx` (decides which screens to show)
5. **Conditional Rendering:** Only ONE navigator is active at a time
6. **Nested Navigation:** MainNavigator → DashboardStack → DashboardHomeScreen
7. **Auth Check:** Takes ~100-200ms on app start
8. **State-Driven:** Navigation decisions based on auth state
9. **Dynamic:** Re-renders when auth state changes (login/logout)
10. **Role-Based:** Different navigators for different roles

---

## 📖 Quick Reference: File Paths

| What | File Path |
|------|-----------|
| Entry Point | `@LetlinkMobileApp/index.ts` |
| Root Component | `@LetlinkMobileApp/App.tsx` |
| Auth Context | `@LetlinkMobileApp/src/features/auth/context/AuthContext.tsx` |
| Root Navigator | `@LetlinkMobileApp/src/navigation/AppNavigator.tsx` |
| Auth Navigator | `@LetlinkMobileApp/src/navigation/stacks/AuthNavigator.tsx` |
| Main Navigator | `@LetlinkMobileApp/src/navigation/stacks/MainNavigator.tsx` |
| Dashboard Stack | `@LetlinkMobileApp/src/navigation/stacks/DashboardStack.tsx` |
| Login Screen | `@LetlinkMobileApp/src/features/auth/screens/LoginScreen.tsx` |
| Dashboard Screen | `@LetlinkMobileApp/src/features/dashboard/screens/DashboardHomeScreen.tsx` |

---

*Last Updated: January 2026*
