# 📱 Complete Guide: How Expo Mobile Apps Work (From Scratch)

## Table of Contents
1. [What is Expo?](#what-is-expo)
2. [How React Native Works](#how-react-native-works)
3. [Project Structure Explained](#project-structure-explained)
4. [How `npm start` Works](#how-npm-start-works)
5. [How Expo Go Works](#how-expo-go-works)
6. [Complete App Loading Flow](#complete-app-loading-flow)
7. [Key Concepts](#key-concepts)
8. [Troubleshooting](#troubleshooting)

---

## What is Expo?

**Expo** is a framework and platform for building React Native apps. It provides:

- ✅ **Pre-configured tools** - No need to set up Android Studio or Xcode
- ✅ **Expo Go app** - Test your app instantly on your phone
- ✅ **EAS Build** - Build production apps in the cloud
- ✅ **Expo APIs** - Camera, Location, Notifications, etc. ready to use

### Two Ways to Use Expo:

1. **Expo Go** (Development)
   - Install Expo Go app on your phone
   - Scan QR code to test
   - Fast iteration, but limited native modules

2. **Development Build** (Production-like)
   - Custom native build with your code
   - Full access to native modules
   - Requires building APK/IPA

---

## How React Native Works

### Traditional Mobile Development:
```
iOS App:     Swift/Objective-C code
Android App: Java/Kotlin code
Result:      Two separate codebases ❌
```

### React Native Approach:
```
Your Code:   JavaScript/TypeScript (ONE codebase) ✅
    ↓
React Native Bridge (translates to native)
    ↓
Native iOS/Android Code
    ↓
Your App Running on Device
```

**Key Point:** Write once, run on both iOS and Android!

---

## Project Structure Explained

### 1. `package.json` - Project Configuration

```json
{
  "name": "letlinkapp",
  "version": "1.0.0",
  "main": "index.ts",              // ← Entry point file
  "scripts": {
    "start": "expo start"          // ← What runs when you type npm start
  },
  "dependencies": {
    "expo": "~54.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5"
  }
}
```

**What it does:**
- Lists all packages your app needs
- Defines commands (`npm start`, `npm run android`, etc.)
- Tells Node.js which file to run first (`main` field)

---

### 2. `app.json` - Expo Configuration

```json
{
  "expo": {
    "name": "Payroll App",                    // Display name
    "slug": "payrollapp",                     // URL identifier (MUST BE UNIQUE!)
    "owner": "prismatechteam",                // Your Expo account
    "version": "1.0.0",
    "scheme": "payrollapp",                   // Deep linking scheme
    "ios": {
      "bundleIdentifier": "com.payroll.app"   // iOS app ID (MUST BE UNIQUE!)
    },
    "android": {
      "package": "com.payroll.app"            // Android app ID (MUST BE UNIQUE!)
    },
    "extra": {
      "eas": {
        "projectId": "f99348cf-..."           // Expo project ID (MUST BE UNIQUE!)
      }
    }
  }
}
```

**What it does:**
- Configures app identity (name, icons, splash screen)
- Sets platform-specific IDs (iOS bundle ID, Android package)
- Defines permissions and plugins
- Stores project ID (used by Expo Go to identify your app)

**Critical Identifiers:**
- **`slug`**: Unique across Expo (e.g., `payrollapp`)
- **`projectId`**: Unique Expo project ID
- **`bundleIdentifier`/`package`**: Unique app IDs for App Store/Play Store

---

### 3. `index.ts` - Entry Point

```typescript
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

**What it does:**
- This file runs FIRST when your app starts
- Registers your root component (`App`) with React Native
- Equivalent to: `AppRegistry.registerComponent('main', () => App)`

**Flow:**
```
Device Starts App
    ↓
index.ts runs
    ↓
registerRootComponent(App) called
    ↓
React Native loads App component
    ↓
App.tsx renders
    ↓
Your UI appears!
```

---

### 4. `App.tsx` - Root Component

```typescript
export default function App() {
  return (
    <View>
      <PayrollHomeScreen />
    </View>
  );
}
```

**What it does:**
- First React component that renders
- Contains your app's UI structure
- Can wrap providers (Redux, Navigation, etc.)

---

## How `npm start` Works

### Step-by-Step Process:

#### Step 1: You Run `npm start`
```bash
npm start
```

**What happens:**
- npm reads `package.json`
- Finds `"start": "expo start"`
- Runs `expo start` command

---

#### Step 2: Expo Starts Metro Bundler

**Metro Bundler** is Expo's JavaScript bundler:
- Bundles all your JavaScript/TypeScript files
- Transpiles TypeScript to JavaScript
- Serves code over HTTP
- Provides hot reloading (auto-refresh on code changes)

**What it does:**
```
Your TypeScript Files
    ↓
Metro Bundler
    ↓
Single JavaScript Bundle
    ↓
Served on http://localhost:8081
```

---

#### Step 3: QR Code Appears

The QR code contains a URL like:
```
exp://192.168.1.140:8081
```

**What this means:**
- `exp://` = Expo protocol
- `192.168.1.140` = Your computer's IP address
- `8081` = Metro bundler port

---

#### Step 4: You Scan QR Code

**With Expo Go:**
1. Open Expo Go app
2. Scan QR code
3. Expo Go reads the URL
4. Connects to your computer's Metro bundler
5. Downloads JavaScript bundle
6. Runs your app!

**With Development Build:**
1. QR code shows: `exp+payrollapp://expo-development-client/...`
2. Requires custom development build installed
3. Same process but uses your custom build

---

## How Expo Go Works

### Expo Go App Structure:

```
Expo Go App (Installed on Phone)
    ↓
Contains: React Native Runtime + Expo APIs
    ↓
Downloads: Your JavaScript Bundle (from Metro)
    ↓
Runs: Your App Code
```

**Key Points:**
- Expo Go is a **container app** that can run any Expo project
- It identifies apps by **projectId** (from `app.json`)
- If two apps have same `projectId`, Expo Go opens the cached one
- That's why changing `projectId` fixes the "wrong app opening" issue!

---

## Complete App Loading Flow

### Full Journey from `npm start` to App Running:

```
1. You type: npm start
   ↓
2. npm reads package.json → finds "start": "expo start"
   ↓
3. Expo CLI starts Metro Bundler
   ↓
4. Metro reads index.ts (entry point)
   ↓
5. Metro bundles all files (index.ts → App.tsx → components)
   ↓
6. Metro serves bundle on http://localhost:8081
   ↓
7. QR code appears with URL: exp://192.168.x.x:8081
   ↓
8. You scan QR code with Expo Go
   ↓
9. Expo Go reads projectId from app.json
   ↓
10. Expo Go checks cache:
    - If projectId exists → opens cached app ❌
    - If projectId is new → downloads bundle ✅
   ↓
11. Expo Go downloads JavaScript bundle from Metro
   ↓
12. Expo Go executes index.ts
   ↓
13. index.ts calls registerRootComponent(App)
   ↓
14. React Native loads App component
   ↓
15. App.tsx renders
   ↓
16. Your UI appears on phone! 🎉
```

---

## Key Concepts

### 1. Entry Point (`main` field)

**In `package.json`:**
```json
"main": "index.ts"
```

**What it means:**
- This is the FIRST file that runs
- Node.js/Expo looks for this file when starting
- Must export/register your root component

---

### 2. Root Component Registration

**In `index.ts`:**
```typescript
registerRootComponent(App);
```

**What it does:**
- Tells React Native: "This is my root component"
- Equivalent to React Native's `AppRegistry.registerComponent()`
- Must be called for app to work

---

### 3. Project Identification

**Expo Go uses THREE things to identify apps:**

1. **`slug`** (`app.json` → `expo.slug`)
   - Example: `"payrollapp"`
   - Used in URLs: `exp://expo.dev/@owner/slug`

2. **`projectId`** (`app.json` → `expo.extra.eas.projectId`)
   - Example: `"f99348cf-2307-484a-9305-dd7beddc86d6"`
   - Used by Expo Go to cache/identify apps

3. **`owner`** (`app.json` → `expo.owner`)
   - Example: `"prismatechteam"`
   - Your Expo account username

**If any of these match another app, Expo Go might open the wrong one!**

---

### 4. Development Build vs Expo Go

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| **Setup** | Just install app | Build APK/IPA |
| **Speed** | Instant | 10-20 min build |
| **Native Modules** | Limited | Full access |
| **QR Code** | `exp://...` | `exp+slug://expo-development-client/...` |
| **Best For** | Quick testing | Production-like testing |

---

## Troubleshooting

### Problem: No Logs Appear When Scanning QR

**Possible Causes:**

1. **Wrong projectId** - Expo Go opening cached old app
   - **Fix:** Change `projectId` in `app.json`
   - **Fix:** Clear Expo Go cache

2. **Development Build Mode** - QR code shows `exp+slug://expo-development-client/`
   - **Fix:** Run `npx expo start --go` to force Expo Go mode
   - **Fix:** Remove `expo-dev-client` from `package.json`

3. **Code Not Executing** - Bundle not loading
   - **Fix:** Check Metro bundler for errors
   - **Fix:** Verify `index.ts` exists and is correct
   - **Fix:** Check `package.json` `main` field

---

### Problem: Expo Go Opens Wrong App

**Cause:** Same `projectId` as another app

**Fix:**
1. Remove `projectId` from `app.json`:
   ```json
   "extra": {
     "environment": "development"
     // Remove "eas" section temporarily
   }
   ```

2. Create new project:
   ```bash
   npx eas init
   ```

3. Clear Expo Go cache on phone

---

### Problem: QR Code Shows Development Build URL

**Cause:** `expo-dev-client` installed

**Fix Options:**

**Option 1:** Force Expo Go mode:
```bash
npx expo start --go --clear
```

**Option 2:** Remove expo-dev-client:
```bash
npm uninstall expo-dev-client
npx expo start --clear
```

---

## Quick Reference

### Important Files:

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, entry point |
| `app.json` | Expo configuration, app identity |
| `index.ts` | Entry point, registers root component |
| `App.tsx` | Root React component |
| `eas.json` | EAS Build configuration |

### Important Commands:

```bash
# Start development server
npm start

# Start with cache cleared
npx expo start --clear

# Force Expo Go mode
npx expo start --go

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

### Important Identifiers:

| Identifier | Location | Purpose |
|------------|----------|---------|
| `slug` | `app.json` → `expo.slug` | URL identifier |
| `projectId` | `app.json` → `expo.extra.eas.projectId` | Expo project ID |
| `bundleIdentifier` | `app.json` → `expo.ios.bundleIdentifier` | iOS app ID |
| `package` | `app.json` → `expo.android.package` | Android app ID |
| `main` | `package.json` → `main` | Entry point file |

---

## Summary

1. **`package.json`** tells npm what to run (`npm start` → `expo start`)
2. **`app.json`** configures your app identity and settings
3. **`index.ts`** is the entry point that runs first
4. **`App.tsx`** is your root React component
5. **Metro Bundler** bundles your code and serves it
6. **Expo Go** downloads and runs your bundle
7. **ProjectId** identifies your app (must be unique!)

**The Flow:**
```
npm start → Metro Bundler → QR Code → Expo Go → Downloads Bundle → Runs index.ts → Renders App.tsx → Your App!
```

---

## Next Steps

1. ✅ Understand the flow
2. ✅ Check your `app.json` configuration
3. ✅ Verify `index.ts` is correct
4. ✅ Ensure `projectId` is unique
5. ✅ Test with `npm start`

Happy coding! 🚀

