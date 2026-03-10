# 🔧 Expo Go Troubleshooting - Payroll App Not Loading

## ✅ Current Configuration Status

Based on `npx expo config`, your configuration is **CORRECT**:

- ✅ **Name**: `Payroll App`
- ✅ **Slug**: `payrollapp`
- ✅ **Scheme**: `payrollapp`
- ✅ **Project ID**: `f99348cf-2307-484a-9305-dd7beddc86d6` (NEW, unique)
- ✅ **iOS Bundle ID**: `com.payroll.app`
- ✅ **Android Package**: `com.payroll.app`

---

## 🔍 Why QR Code Might Not Work

Even with correct configuration, Expo Go might still open the old app due to:

1. **Expo Go Cache** - Expo Go caches apps by projectId
2. **Old App Still Installed** - If you have the old LetlinkMobile app installed
3. **Wrong QR Code Format** - QR code might be for development build instead of Expo Go
4. **Network Issues** - Phone and computer not on same network

---

## 🛠️ Step-by-Step Fix

### Step 1: Check QR Code Format

When you run `npx expo start`, check the QR code URL:

**✅ Correct (Expo Go):**
```
exp://192.168.1.100:8081
```

**❌ Wrong (Development Build):**
```
exp+payrollapp://expo-development-client/?url=...
```

**If you see the wrong format, run:**
```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"
npx expo start --go --clear
```

The `--go` flag forces Expo Go mode.

---

### Step 2: Clear Expo Go Cache

**On Your Phone:**

1. Open Expo Go app
2. Shake your device (or press `Cmd+D` on iOS / `Cmd+M` on Android)
3. Select **"Settings"**
4. Tap **"Clear Cache"**
5. Close Expo Go completely (swipe it away from recent apps)

**Or uninstall and reinstall Expo Go:**
- iOS: Delete app → Reinstall from App Store
- Android: Uninstall → Reinstall from Play Store

---

### Step 3: Restart Expo Server with Clear Cache

```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"

# Stop any running Expo processes
# Press Ctrl+C if Metro bundler is running

# Start with clear cache and Expo Go mode
npx expo start --go --clear
```

**What this does:**
- `--go` - Forces Expo Go mode (not development build)
- `--clear` - Clears Metro bundler cache

---

### Step 4: Verify Network Connection

**Check:**
1. Phone and computer are on the **same Wi-Fi network**
2. Firewall isn't blocking port 8081
3. Try scanning QR code again

**If network issues:**
- Use tunnel mode: `npx expo start --tunnel` (slower but works across networks)

---

### Step 5: Check for Debug Logs

After scanning QR code, check the **Metro bundler terminal** for these logs:

```
🔥🔥🔥 INDEX.TS FILE LOADED 🔥🔥🔥
🚀 [index.ts] APP ROOT INITIALIZATION
📦 [index.ts] App Config: { slug: 'payrollapp', name: 'Payroll App', ... }
✅ [App.tsx] APP COMPONENT MOUNTED
```

**If you see these logs:** ✅ App is loading correctly!

**If you DON'T see these logs:** ❌ Expo Go is opening the old cached app

---

## 🎯 Quick Fix Commands

Run these commands in order:

```bash
# Navigate to project
cd "d:\prisma tech\payroll\LetlinkMobileApp"

# Stop any running processes (Ctrl+C)

# Clear cache and start in Expo Go mode
npx expo start --go --clear
```

**Then on your phone:**
1. Clear Expo Go cache (shake device → Settings → Clear Cache)
2. Or uninstall/reinstall Expo Go
3. Scan QR code again

---

## 🔍 Verify Project ID is Correct

Check if projectId is correctly set:

```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"
npx expo config --type public | findstr projectId
```

**Should show:**
```
projectId: 'f99348cf-2307-484a-9305-dd7beddc86d6'
```

**If it shows the old ID (`b7a618fc-...`):**
- Check `app.json` → `extra.eas.projectId`
- Should be: `f99348cf-2307-484a-9305-dd7beddc86d6`

---

## 🚨 If Still Not Working

### Option 1: Remove expo-dev-client Temporarily

`expo-dev-client` forces development build mode. Temporarily remove it:

```bash
cd "d:\prisma tech\payroll\LetlinkMobileApp"
npm uninstall expo-dev-client
npx expo start --clear
```

**Note:** You'll need to reinstall it later if you use native modules.

---

### Option 2: Use Tunnel Mode

If network is the issue:

```bash
npx expo start --tunnel --clear
```

This creates a public URL that works across networks (slower but reliable).

---

### Option 3: Check for Conflicting Apps

Make sure you don't have the old LetlinkMobile app installed:
- Check your phone for any app named "LetlinkMobile" or "Lets Link"
- Uninstall it if found
- Then try scanning QR code again

---

## 📋 Checklist

- [ ] Configuration verified (`npx expo config`)
- [ ] QR code shows `exp://` format (not `exp+payrollapp://`)
- [ ] Expo Go cache cleared (or app reinstalled)
- [ ] Metro bundler restarted with `--go --clear`
- [ ] Phone and computer on same Wi-Fi
- [ ] Debug logs appear in terminal after scanning
- [ ] No old LetlinkMobile app installed on phone

---

## ✅ Success Indicators

You'll know it's working when:

1. **Terminal shows debug logs:**
   ```
   🔥🔥🔥 INDEX.TS FILE LOADED 🔥🔥🔥
   ✅ [App.tsx] APP COMPONENT MOUNTED
   ```

2. **App shows PayrollHomeScreen** (not old LetlinkMobile screens)

3. **QR code URL format:** `exp://192.168.x.x:8081`

4. **Expo Go shows:** "Payroll App" in the app list

---

## 🆘 Still Having Issues?

If none of the above works:

1. **Check Metro bundler for errors** - Look for red error messages
2. **Try tunnel mode** - `npx expo start --tunnel`
3. **Check firewall** - Make sure port 8081 isn't blocked
4. **Try different network** - Switch to mobile hotspot or different Wi-Fi
5. **Check Expo Go version** - Update Expo Go to latest version

---

## 📞 Quick Reference

**Start Expo Go:**
```bash
npx expo start --go --clear
```

**Check config:**
```bash
npx expo config --type public
```

**Clear cache:**
```bash
npx expo start --clear
```

**Tunnel mode:**
```bash
npx expo start --tunnel
```

