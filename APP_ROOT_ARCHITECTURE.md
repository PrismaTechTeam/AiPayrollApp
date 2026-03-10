# 🏗️ Application Root Architecture - Complete Guide

## Overview

This document explains how the root of your Payroll mobile application is designed, from the entry point to the final rendered screens.

---

## 📁 File Structure Hierarchy

```
LetlinkMobileApp/
├── index.ts                    ← ENTRY POINT (runs first)
├── App.tsx                     ← ROOT COMPONENT (main app structure)
├── package.json                ← Configuration (tells Expo where to start)
├── app.json                    ← Expo configuration
└── payroll/
    └── screens/
        ├── PayrollHomeScreen.tsx  ← Home screen
        └── RequestsScreen.tsx     ← Requests screen
```

---

## 🔄 Complete Execution Flow

### Step 1: Application Starts
```
Device/Expo Go Starts
    ↓
```

### Step 2: Entry Point (`index.ts`)
```typescript
// index.ts - THE FIRST FILE THAT RUNS

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

**What happens:**
1. Expo reads `package.json` → finds `"main": "index.ts"`
2. Expo executes `index.ts` FIRST
3. `index.ts` imports `App` component from `./App.tsx`
4. `registerRootComponent(App)` tells React Native: "This is my root component"
5. React Native now knows to render `App` component

**Key Point:** `index.ts` is the bridge between Expo/React Native and your app code.

---

### Step 3: Root Component (`App.tsx`)
```typescript
// App.tsx - THE ROOT COMPONENT

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
        <Stack.Screen name="Requests" component={RequestsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**What happens:**
1. React Native renders `App` component
2. `App` sets up React Navigation:
   - `NavigationContainer` - Provides navigation context
   - `Stack.Navigator` - Manages screen stack
   - `Stack.Screen` - Defines each screen
3. Initial route is `"PayrollHome"` (from `initialRouteName`)
4. `PayrollHomeScreen` component is rendered

**Key Point:** `App.tsx` is where you set up:
- Navigation structure
- Global providers (Redux, Context, etc.)
- App-wide configuration

---

### Step 4: Screen Components
```typescript
// PayrollHomeScreen.tsx - First screen shown

export const PayrollHomeScreen: React.FC<PayrollHomeScreenProps> = ({ navigation }) => {
  return (
    <View>
      {/* Your UI here */}
      <ServiceCard
        title="Requests"
        onPress={() => navigation?.navigate('Requests')}
      />
    </View>
  );
};
```

**What happens:**
1. `PayrollHomeScreen` renders
2. User sees the home screen UI
3. When user taps "Requests" button:
   - `navigation.navigate('Requests')` is called
   - React Navigation pushes `RequestsScreen` onto stack
   - `RequestsScreen` renders

---

## 🎯 Component Hierarchy

```
┌─────────────────────────────────────────┐
│         React Native Runtime            │
│  (Native iOS/Android Code)              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         index.ts                         │
│  - Entry point                           │
│  - Registers App component               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         App.tsx                          │
│  - Root component                        │
│  - Sets up Navigation                    │
│  - Wraps entire app                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    NavigationContainer                   │
│  - Provides navigation context           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Stack.Navigator                      │
│  - Manages screen stack                 │
│  - Handles navigation                   │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐      ┌───────────────┐
│ PayrollHome   │      │   Requests    │
│   Screen      │      │    Screen     │
└───────────────┘      └───────────────┘
```

---

## 📋 Detailed Breakdown

### 1. `package.json` - Configuration

```json
{
  "main": "index.ts",        // ← Tells Expo: "Start here!"
  "scripts": {
    "start": "expo start"    // ← Command to run app
  }
}
```

**Purpose:**
- Defines entry point (`main` field)
- Lists dependencies
- Defines npm scripts

---

### 2. `index.ts` - Entry Point

```typescript
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

**Purpose:**
- First file that executes
- Registers root component with React Native
- Equivalent to: `AppRegistry.registerComponent('main', () => App)`

**Key Functions:**
- `registerRootComponent()` - Connects your app to React Native

---

### 3. `App.tsx` - Root Component

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PayrollHome">
        <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
        <Stack.Screen name="Requests" component={RequestsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Purpose:**
- Root React component
- Sets up navigation structure
- Wraps entire app

**Key Components:**
- `NavigationContainer` - Provides navigation context to all screens
- `Stack.Navigator` - Manages screen stack (like a stack of cards)
- `Stack.Screen` - Defines each screen route
- `initialRouteName` - First screen to show

---

### 4. Screen Components

#### `PayrollHomeScreen.tsx`
```typescript
export const PayrollHomeScreen: React.FC<PayrollHomeScreenProps> = ({ navigation }) => {
  return (
    <View>
      <ServiceCard
        onPress={() => navigation?.navigate('Requests')}
      />
    </View>
  );
};
```

**Purpose:**
- Home screen UI
- Receives `navigation` prop from React Navigation
- Can navigate to other screens using `navigation.navigate()`

#### `RequestsScreen.tsx`
```typescript
export const RequestsScreen: React.FC<RequestsScreenProps> = ({ navigation }) => {
  return (
    <View>
      <TouchableOpacity onPress={() => navigation?.goBack()}>
        <Icon name="arrow-left" />
      </TouchableOpacity>
      {/* Requests list */}
    </View>
  );
};
```

**Purpose:**
- Requests screen UI
- Can go back using `navigation.goBack()`

---

## 🔑 Key Concepts

### 1. Entry Point (`index.ts`)
- **Runs FIRST** when app starts
- Must call `registerRootComponent(App)`
- This connects your app to React Native

### 2. Root Component (`App.tsx`)
- **Rendered FIRST** by React Native
- Sets up app-wide structure:
  - Navigation
  - Providers (Redux, Context, etc.)
  - Global configuration

### 3. Navigation Setup
- `NavigationContainer` - Must wrap all navigators
- `Stack.Navigator` - Manages screen stack
- `Stack.Screen` - Defines routes
- Each screen receives `navigation` prop

### 4. Screen Navigation
- `navigation.navigate('ScreenName')` - Go to screen
- `navigation.goBack()` - Go back
- `navigation.push('ScreenName')` - Push new screen

---

## 🎨 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVICE STARTS APP                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  package.json                                                │
│  "main": "index.ts"  ← Expo reads this                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  index.ts                                                   │
│  ┌─────────────────────────────────────┐                   │
│  │ import App from './App'              │                   │
│  │ registerRootComponent(App)          │                   │
│  └─────────────────────────────────────┘                   │
│  Purpose: Register root component                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                    │
│  ┌─────────────────────────────────────┐                   │
│  │ <NavigationContainer>               │                   │
│  │   <Stack.Navigator>                 │                   │
│  │     <Stack.Screen                   │                   │
│  │       name="PayrollHome"            │                   │
│  │       component={PayrollHomeScreen} │                   │
│  │     />                               │                   │
│  │     <Stack.Screen                   │                   │
│  │       name="Requests"                │                   │
│  │       component={RequestsScreen}     │                   │
│  │     />                               │                   │
│  │   </Stack.Navigator>                 │                   │
│  │ </NavigationContainer>              │                   │
│  └─────────────────────────────────────┘                   │
│  Purpose: Set up navigation structure                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PayrollHomeScreen (Initial Screen)                         │
│  ┌─────────────────────────────────────┐                   │
│  │ User sees home screen                │                   │
│  │ User taps "Requests" button          │                   │
│  │ navigation.navigate('Requests')      │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  RequestsScreen                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ User sees requests list              │                   │
│  │ User taps back button                │                   │
│  │ navigation.goBack()                  │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Back to PayrollHomeScreen                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 What Each File Does

| File | Purpose | When It Runs |
|------|---------|--------------|
| `package.json` | Configuration | Read by npm/Expo |
| `index.ts` | Entry point | **FIRST** - Registers app |
| `App.tsx` | Root component | **SECOND** - Sets up navigation |
| `PayrollHomeScreen.tsx` | Home screen | When app starts (initial route) |
| `RequestsScreen.tsx` | Requests screen | When user navigates to it |

---

## 💡 Important Points

### 1. **Single Entry Point**
- Only ONE file can be the entry point
- Defined in `package.json` → `"main": "index.ts"`
- This file MUST call `registerRootComponent()`

### 2. **Root Component**
- `App.tsx` is the root React component
- Everything else is nested inside it
- This is where you set up:
  - Navigation
  - Global state (Redux, Context)
  - Theme providers
  - Error boundaries

### 3. **Navigation Structure**
- `NavigationContainer` wraps everything
- `Stack.Navigator` manages screen stack
- Each `Stack.Screen` defines a route
- Screens receive `navigation` prop automatically

### 4. **Screen Flow**
- Initial screen: `PayrollHome` (from `initialRouteName`)
- Navigate: `navigation.navigate('ScreenName')`
- Go back: `navigation.goBack()`

---

## 🚀 Adding New Screens

To add a new screen:

1. **Create screen component:**
```typescript
// payroll/screens/NewScreen.tsx
export const NewScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  return <View>...</View>;
};
```

2. **Import in App.tsx:**
```typescript
import { NewScreen } from './payroll/screens/NewScreen';
```

3. **Add to Stack.Navigator:**
```typescript
<Stack.Screen name="NewScreen" component={NewScreen} />
```

4. **Navigate to it:**
```typescript
navigation.navigate('NewScreen');
```

---

## 📝 Summary

**The Root Architecture:**

1. **`index.ts`** - Entry point, registers `App` component
2. **`App.tsx`** - Root component, sets up navigation
3. **Navigation** - Manages screen stack
4. **Screens** - Individual screen components

**Flow:**
```
Device → index.ts → App.tsx → NavigationContainer → Stack.Navigator → Screens
```

**Key:**
- `index.ts` = Bridge to React Native
- `App.tsx` = App structure
- Navigation = Screen management
- Screens = User interface

This architecture allows you to:
- ✅ Navigate between screens
- ✅ Pass data between screens
- ✅ Manage app state globally
- ✅ Add new screens easily

---

## 🎯 Quick Reference

### Entry Point
```typescript
// index.ts
registerRootComponent(App);
```

### Root Component
```typescript
// App.tsx
<NavigationContainer>
  <Stack.Navigator>
    <Stack.Screen name="ScreenName" component={ScreenComponent} />
  </Stack.Navigator>
</NavigationContainer>
```

### Navigation
```typescript
// In any screen
navigation.navigate('ScreenName');  // Go to screen
navigation.goBack();                // Go back
```

---

This is how your Payroll app root is designed! 🎉

