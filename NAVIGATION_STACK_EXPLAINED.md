# 📚 Navigation "Stack" Explained

## 🤔 Why is it Called "Stack"?

**"Stack"** refers to the **Stack Data Structure** in computer science - a Last-In-First-Out (LIFO) structure, like a stack of plates.

### **Visual Explanation:**

```
Think of screens like plates stacked on top of each other:

Stack of Plates:          Navigation Stack:
┌─────────────┐          ┌──────────────────┐
│  Plate 3    │ ← Top    │  Screen 3        │ ← Current Screen
├─────────────┤          ├──────────────────┤
│  Plate 2    │          │  Screen 2        │
├─────────────┤          ├──────────────────┤
│  Plate 1    │ ← Bottom │  Screen 1        │ ← Initial Screen
└─────────────┘          └──────────────────┘

When you navigate:
- Push = Add screen on top (navigate forward)
- Pop = Remove top screen (go back)
```

---

## 🎯 Stack Navigation in React Native

React Navigation uses `createNativeStackNavigator` (from `@react-navigation/native-stack`) to create a stack of screens.

**Key Concept:** Each screen you navigate to is **pushed** onto the stack. When you go back, it's **popped** off.

---

## 📁 Real Codebase Examples

### **1. Auth Stack (Login Screens)**

**📁 File:** `LetlinkMobileApp/src/navigation/stacks/AuthNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import auth screens
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RegisterScreen from '../../features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../../features/auth/screens/ForgotPasswordScreen';

// Create a Stack Navigator
const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide default header
        animation: 'slide_from_right', // Slide animation
      }}
    >
      {/* Each Stack.Screen is a "plate" in the stack */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
```

**How it works:**

```
User Journey (Auth Stack):

1. App opens → Login Screen (Initial)
   Stack: [Login]

2. User taps "Register" → Navigate to Register
   Stack: [Login, Register] ← Register on top

3. User fills form → Navigate to OTP
   Stack: [Login, Register, OtpVerification] ← OTP on top

4. User presses back button → Pop OTP off stack
   Stack: [Login, Register] ← Register visible again

5. User presses back again → Pop Register off stack
   Stack: [Login] ← Back to Login
```

---

### **2. Main App Stack (Bottom Tabs + Nested Stacks)**

**📁 File:** `LetlinkMobileApp/src/navigation/stacks/MainNavigator.tsx`

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import other STACKS (nested stacks!)
import DashboardStack from './DashboardStack';
import CasesStack from './CasesStack';
import AdminStack from './AdminStack';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator>
      {/* Each tab contains its own STACK */}
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Cases" component={CasesStack} />
      <Tab.Screen name="Admin" component={AdminStack} />
    </Tab.Navigator>
  );
}
```

**Note:** This is a **Tab Navigator** with **nested Stacks**. Each tab has its own stack of screens!

---

### **3. Root App Navigator (Conditional Stacks)**

**📁 File:** `LetlinkMobileApp/src/navigation/AppNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../features/auth/context/AuthContext';

// Import navigators (which are themselves stacks!)
import AuthNavigator from './stacks/AuthNavigator';
import OnboardingNavigator from './stacks/OnboardingNavigator';
import MainNavigator from './stacks/MainNavigator';
import AdminNavigator from './stacks/AdminNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const isNewUser = user?.UserInfo?.isNewUser === true;
  const isAdmin = user?.UserInfo?.ActiveRole === 'Admin';

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Show Auth Stack (Login, Register, etc.)
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : isNewUser ? (
        // Show Onboarding Stack (Complete Profile)
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : isAdmin ? (
        // Show Admin Stack (Admin Dashboard)
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        // Show Main App Stack (Dashboard, Cases, etc.)
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

**Key Points:**
1. **Conditional Rendering:** Shows different stacks based on auth state
2. **Nested Navigators:** Each component (AuthNavigator, MainNavigator) is itself a Stack
3. **Only ONE Stack Active:** Only the matched stack is rendered at a time

---

## 🏗️ Complete Navigation Architecture

Let's see the **full hierarchy** with actual file references:

```
AppNavigator (Root Stack)
📁 src/navigation/AppNavigator.tsx
│
├─ If NOT authenticated:
│  └─ Auth Stack
│     📁 src/navigation/stacks/AuthNavigator.tsx
│     └─ Stack Navigator
│        ├─ Login Screen
│        ├─ Register Screen
│        ├─ OtpVerification Screen
│        └─ ForgotPassword Screen
│
├─ If authenticated but isNewUser:
│  └─ Onboarding Stack
│     📁 src/navigation/stacks/OnboardingNavigator.tsx
│     └─ Stack Navigator
│        └─ CompleteProfile Screen
│
├─ If authenticated and isAdmin:
│  └─ Admin Stack
│     📁 src/navigation/stacks/AdminNavigator.tsx
│     └─ Tab Navigator
│        ├─ Dashboard Tab
│        ├─ Users Tab
│        └─ Settings Tab
│
└─ If authenticated (normal user):
   └─ Main Stack
      📁 src/navigation/stacks/MainNavigator.tsx
      └─ Tab Navigator (Bottom Tabs)
         │
         ├─ Dashboard Tab
         │  └─ Dashboard Stack
         │     📁 src/navigation/stacks/DashboardStack.tsx
         │     └─ Stack Navigator
         │        ├─ Dashboard Home Screen
         │        ├─ Notification Screen
         │        └─ Search Screen
         │
         ├─ Cases Tab
         │  └─ Cases Stack
         │     📁 src/navigation/stacks/CasesStack.tsx
         │     └─ Stack Navigator
         │        ├─ Cases List Screen
         │        ├─ Case Details Screen
         │        └─ Add Case Screen
         │
         └─ Profile Tab
            └─ Profile Stack
               📁 src/navigation/stacks/ProfileStack.tsx
               └─ Stack Navigator
                  ├─ Profile Home Screen
                  ├─ Edit Profile Screen
                  └─ Settings Screen
```

---

## 🎬 Real User Journey Example

Let's trace a user's journey through the stacks:

### **Scenario: User logs in and creates a new case**

```
Step 1: App Opens (Not Authenticated)
┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Auth Stack               │
│    └─ [Login Screen] ← YOU ARE HERE
└─────────────────────────────┘

Step 2: User Logs In
Authentication successful!
AppNavigator switches to Main Stack

┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Dashboard Tab       │
│          └─ Dashboard Stack  │
│             └─ [Dashboard] ← YOU ARE HERE
└─────────────────────────────┘

Step 3: User Taps "Cases" Tab
┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Cases Tab           │
│          └─ Cases Stack      │
│             └─ [Cases List] ← YOU ARE HERE
└─────────────────────────────┘

Step 4: User Taps a Case Card
Stack PUSHES new screen on top

┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Cases Tab           │
│          └─ Cases Stack      │
│             ├─ Cases List    │
│             └─ [Case Details] ← YOU ARE HERE
└─────────────────────────────┘

Step 5: User Taps "Add Document"
Stack PUSHES another screen

┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Cases Tab           │
│          └─ Cases Stack      │
│             ├─ Cases List    │
│             ├─ Case Details  │
│             └─ [Add Document] ← YOU ARE HERE
└─────────────────────────────┘

Step 6: User Presses Back Button
Stack POPS top screen

┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Cases Tab           │
│          └─ Cases Stack      │
│             ├─ Cases List    │
│             └─ [Case Details] ← BACK TO HERE
└─────────────────────────────┘

Step 7: User Presses Back Again
Stack POPS again

┌─────────────────────────────┐
│ AppNavigator (Root Stack)   │
│ └─ Main Stack               │
│    └─ Tab Navigator          │
│       └─ Cases Tab           │
│          └─ Cases Stack      │
│             └─ [Cases List] ← BACK TO HERE
└─────────────────────────────┘
```

---

## 💡 Why "Stack" and Not "List" or "Pages"?

### **1. LIFO Behavior (Last In, First Out)**

```
Stack:
- Push Screen A
- Push Screen B
- Push Screen C
- Pop → Returns Screen B (last in comes out first)

This matches mobile app back button behavior!
```

### **2. Memory Management**

```
Stack keeps ALL screens in memory until popped:

Stack: [Screen A, Screen B, Screen C]
       ↑          ↑          ↑
    Still in    Still in   Current
    memory      memory     (visible)

When you go back, screens are instantly visible (no reload needed)
```

### **3. Navigation History**

```
Stack maintains history naturally:

Current Stack: [Home, Profile, Edit]
Press back → [Home, Profile]
Press back → [Home]

This is exactly how stack data structure works!
```

---

## 📝 Code Breakdown: Creating a Stack

### **Step-by-Step:**

```typescript
// 1. Import the creator function
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. Call it to get a Stack object with Navigator and Screen
const Stack = createNativeStackNavigator();

// 3. Use Stack.Navigator as container
// 4. Use Stack.Screen to define each screen
export default function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={Screen1Component} />
      <Stack.Screen name="Screen2" component={Screen2Component} />
    </Stack.Navigator>
  );
}
```

**What `createNativeStackNavigator()` returns:**

```typescript
{
  Navigator: Component,  // Container for screens
  Screen: Component,     // Individual screen wrapper
}
```

---

## 🎯 Types of Navigators in React Navigation

React Navigation provides different types of navigators:

| Navigator Type | Use Case | Example File |
|---------------|----------|--------------|
| **Stack Navigator** | Screens stacked on top | `AuthNavigator.tsx` |
| **Tab Navigator** | Bottom/Top tabs | `MainNavigator.tsx` |
| **Drawer Navigator** | Side menu (like hamburger) | `DrawerNavigator.tsx` |
| **Modal** | Overlays on top | Modal screens |

**All of them work like "stacks" internally!**

---

## 🔄 Stack Operations

### **Push (Navigate Forward):**
```typescript
navigation.navigate('ScreenName');
// Adds screen to stack
```

### **Pop (Go Back):**
```typescript
navigation.goBack();
// Removes current screen from stack
```

### **Replace (Swap Current Screen):**
```typescript
navigation.replace('ScreenName');
// Replaces current screen instead of pushing
```

### **Reset Stack:**
```typescript
navigation.reset({
  index: 0,
  routes: [{ name: 'Home' }],
});
// Clears entire stack, starts fresh
```

---

## 📚 File Structure in Our Codebase

```
src/navigation/
├── AppNavigator.tsx              # Root stack (conditional routing)
├── linking.ts                    # Deep linking config
│
├── stacks/                       # All navigator stacks
│   ├── AuthNavigator.tsx         # Auth stack (Login, Register)
│   ├── OnboardingNavigator.tsx   # Onboarding stack
│   ├── MainNavigator.tsx         # Main app (Tab nav with nested stacks)
│   ├── AdminNavigator.tsx        # Admin stack
│   ├── DashboardStack.tsx        # Dashboard screens stack
│   ├── CasesStack.tsx            # Cases screens stack
│   ├── AdminStack.tsx            # Admin screens stack
│   └── ProfileStack.tsx          # Profile screens stack
│
└── guards/                       # Protection layers
    ├── AuthGuard.tsx             # Require authentication
    └── RoleGuard.tsx             # Require specific role
```

**Each file with "Stack" or "Navigator" in the name creates a stack of screens!**

---

## 🎨 Visual: Stack vs Tabs vs Drawer

```
Stack Navigator:
┌─────────────┐
│  Screen 3   │ ← Covers everything
│─────────────│
│  Screen 2   │ ← Hidden
│─────────────│
│  Screen 1   │ ← Hidden
└─────────────┘

Tab Navigator:
┌─────────────┐
│   Content   │
│             │
├─────────────┤
│ [Tab] [Tab] │ ← Always visible
└─────────────┘

Drawer Navigator:
┌─┬────────────┐
│M│  Content   │ ← Menu slides from left
│e│            │
│n│            │
│u│            │
└─┴────────────┘
```

---

## 🔑 Key Takeaways

1. **"Stack" = Data Structure**: Last-In-First-Out (LIFO) - like stacking plates
2. **Physical Metaphor**: Screens literally stack on top of each other
3. **Navigation History**: Stack maintains your navigation path
4. **Memory Efficient**: Previous screens stay in memory for instant back navigation
5. **Nested Stacks**: You can have stacks within stacks (tabs with stacks)
6. **Multiple Stacks**: Different flows (Auth, Main, Admin) are separate stacks

---

## 📖 Additional Resources

- **React Navigation Docs**: https://reactnavigation.org/docs/stack-navigator
- **Stack Data Structure**: https://en.wikipedia.org/wiki/Stack_(abstract_data_type)
- **Our Implementation**: See files in `src/navigation/stacks/`

---

## 🎯 Summary

**"Stack"** is called that because:
- ✅ It's based on the stack data structure (LIFO)
- ✅ Screens are literally "stacked" on top of each other
- ✅ You "push" screens onto the stack (navigate forward)
- ✅ You "pop" screens off the stack (go back)
- ✅ Only the top screen is visible (like top plate in a stack)
- ✅ Previous screens stay in memory (the stack below)

It's not just a name - it's how the navigation actually works under the hood! 🚀

---

*Last Updated: January 2026*
