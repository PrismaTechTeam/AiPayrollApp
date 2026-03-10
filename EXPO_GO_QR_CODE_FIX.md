# 🔧 Fix: Expo Go Can't Open App When Scanning QR Code

## 🔍 Root Causes Identified

### 1. **`expo-dev-client` Installed** ⚠️ PRIMARY ISSUE
- **Location**: `package.json` line 30
- **Problem**: Forces development build mode instead of Expo Go
- **Result**: QR code shows `exp+payrollapp://expo-development-client/` instead of `exp://...`
- **Impact**: Expo Go cannot open the app

### 2. **Google Sign-In Plugin Configuration** ✅ HANDLED
- **Location**: `app.json` lines 113-118
- **Status**: Code already handles this with lazy loading (see `useGoogleAuth.ts`)
- **Impact**: Should not cause issues, but plugin config is not needed for Expo Go

### 3. **EAS Configuration** ℹ️ INFO ONLY
- **Location**: `eas.json` line 8 (`developmentClient: true`)
- **Impact**: Only affects EAS builds, not Expo Go directly

---

## ✅ Solutions (Choose One)

### **Solution 1: Force Expo Go Mode** ⚡ QUICKEST FIX

**Use the new script:**
```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"
npm run start:go
```

**Or manually:**
```bash
npx expo start --go --clear
```

**What this does:**
- `--go` - Forces Expo Go mode (ignores `expo-dev-client`)
- `--clear` - Clears Metro bundler cache

**Expected QR Code Format:**
```
✅ exp://192.168.x.x:8081
```

**NOT:**
```
❌ exp+payrollapp://expo-development-client/?url=...
```

---

### **Solution 2: Temporarily Remove expo-dev-client** 🔄 FOR TESTING

If Solution 1 doesn't work:

```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"

# Temporarily remove expo-dev-client
npm uninstall expo-dev-client

# Start Expo
npx expo start --clear

# Scan QR code - should work now

# When done testing, reinstall:
npm install expo-dev-client@~6.0.18
```

---

### **Solution 3: Make Google Sign-In Plugin Conditional** 🛠️ OPTIONAL

If you want to completely avoid the plugin in Expo Go, you can conditionally include it:

**Note**: This is optional since your code already handles it with lazy loading. Only do this if Solution 1 doesn't work.

---

## 📋 Step-by-Step Troubleshooting

### Step 1: Check QR Code Format

When you run `npm start`, look at the QR code URL:

**✅ Correct (Expo Go):**
```
exp://192.168.1.100:8081
```

**❌ Wrong (Development Build):**
```
exp+payrollapp://expo-development-client/?url=...
```

### Step 2: Clear Expo Go Cache on Phone

**On Your Phone:**
1. Open Expo Go app
2. Shake device (or press `Cmd+D` on iOS / `Cmd+M` on Android)
3. Select **"Settings"**
4. Tap **"Clear Cache"**
5. Close Expo Go completely (swipe away from recent apps)

**Or uninstall and reinstall Expo Go:**
- iOS: Delete app → Reinstall from App Store
- Android: Uninstall → Reinstall from Play Store

### Step 3: Verify Network Connection

- Ensure phone and computer are on the **same Wi-Fi network**
- Check firewall isn't blocking port 8081
- Try using tunnel mode: `npx expo start --tunnel` (slower but more reliable)

### Step 4: Check Metro Bundler Logs

After scanning QR code, you should see logs like:
```
🔥🔥🔥 INDEX.TS FILE LOADED 🔥🔥🔥
🔥🔥🔥 APP.TSX FILE LOADED 🔥🔥🔥
🚀 [index.ts] APP ROOT INITIALIZATION
```

If you don't see these logs, the app isn't loading.

---

## 🎯 Recommended Approach

1. **First, try Solution 1** (`npm run start:go`)
2. **Clear Expo Go cache** on your phone
3. **Scan QR code** - should work now
4. **If still not working**, try Solution 2 (remove expo-dev-client temporarily)

---

## 📝 Current Configuration Status

✅ **App Name**: `Payroll App`  
✅ **Slug**: `payrollapp`  
✅ **Scheme**: `payrollapp`  
✅ **Project ID**: `f99348cf-2307-484a-9305-dd7beddc86d6` (unique)  
✅ **iOS Bundle ID**: `com.payroll.app`  
✅ **Android Package**: `com.payroll.app`  
⚠️ **expo-dev-client**: Installed (forces dev build mode)  
✅ **Google Sign-In**: Handled with lazy loading (safe for Expo Go)

---

## 🔍 Why This Happens

Expo Go identifies apps by:
1. **Project ID** (`expo.extra.eas.projectId`)
2. **Slug** (`expo.slug`)
3. **Owner** (`expo.owner`)

When `expo-dev-client` is installed, Expo CLI assumes you want a development build and generates QR codes in the wrong format for Expo Go.

The `--go` flag tells Expo CLI to ignore `expo-dev-client` and generate Expo Go-compatible QR codes.

---

## 💡 Pro Tip

If you frequently switch between Expo Go and development builds, you can create two scripts:

```json
"scripts": {
  "start": "expo start",
  "start:go": "expo start --go --clear",
  "start:dev": "expo start --dev-client"
}
```

Then use:
- `npm run start:go` - For Expo Go testing
- `npm run start:dev` - For development build testing
