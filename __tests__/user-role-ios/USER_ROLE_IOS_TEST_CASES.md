# 👤 User Role - iOS Specific Test Cases

## Overview
This document contains **iOS-specific** test cases for the **User** role in the LetLink mobile app. This document focuses on areas where iOS implementation differs from Android, specifically:
- **Authentication** - Google Sign-In (iOS uses native SDK vs browser-based)
- **Notifications** - Account Settings notification preferences (iOS permission handling)

> **Note:** For all other test cases (Dashboard, Cases, Bookings, Vouchers, Chat, Profile, Tools, Referrals), please refer to the main [USER_ROLE_TEST_CASES.md](../user-role/USER_ROLE_TEST_CASES.md) as they are platform-agnostic.

---

## Table of Contents
1. [Authentication & Session (iOS-Specific)](#1-authentication--session-ios-specific)
2. [Notifications (iOS-Specific)](#2-notifications-ios-specific)

---

## 1. Authentication & Session (iOS-Specific)

### 1.1 Email/Password Login
> **Note:** Email/Password login is identical on iOS and Android. Refer to main test cases.

### 1.2 Phone OTP Login
> **Note:** Phone OTP login is identical on iOS and Android. Refer to main test cases.

### 1.3 Google Sign-In (iOS-Specific)

> **Important:** iOS uses **native Google Sign-In SDK** (`@react-native-google-signin/google-signin`) in production builds, while Expo Go uses browser-based OAuth. The app automatically detects the environment.

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-AUTH-001 | Google sign-in in Expo Go (Development) | App running in Expo Go | 1. Tap "Continue with Google"<br>2. Observe console logs | Console shows: "🔍 Google Auth Environment: Expo Go"<br>"▶️ Using Expo AuthSession Flow (Browser)"<br>Browser-based OAuth opens | High |
| USER-IOS-AUTH-002 | Google sign-in in Production Build | App running as standalone/production build | 1. Tap "Continue with Google"<br>2. Observe console logs | Console shows: "🔍 Google Auth Environment: Standalone/Production"<br>"▶️ Using Native Google Sign-In Flow"<br>Native iOS Google Sign-In sheet appears | High |
| USER-IOS-AUTH-003 | Native Google Sign-In success (existing user) | Production build, Google account linked | 1. Tap "Continue with Google"<br>2. Native iOS account picker appears<br>3. Select Google account<br>4. Authorize | Native iOS account picker shows available Google accounts<br>Login successful, redirect to Dashboard<br>Console shows: "✅ Native Google Sign-In Success" | High |
| USER-IOS-AUTH-004 | Native Google Sign-In success (new user) | Production build, Google account not in system | 1. Tap "Continue with Google"<br>2. Select Google account from native picker | Native iOS account picker shows<br>New account created, redirect to onboarding<br>Console shows: "✅ Native Google Sign-In Success" | High |
| USER-IOS-AUTH-005 | Native Google Sign-In - account picker displays | Production build | 1. Tap "Continue with Google" | Native iOS account picker modal appears (not browser)<br>Shows list of Google accounts signed into device | High |
| USER-IOS-AUTH-006 | Native Google Sign-In - select different account | Production build, multiple Google accounts | 1. Tap "Continue with Google"<br>2. Account picker shows multiple accounts<br>3. Select different account than previous | Account picker shows all accounts<br>Selected account used for sign-in<br>Previous session cleared (forced account selection) | High |
| USER-IOS-AUTH-007 | Native Google Sign-In cancelled | Production build | 1. Tap "Continue with Google"<br>2. Dismiss native account picker (tap outside or Cancel) | Native picker closes<br>Return to login screen, no error<br>No console error messages | Medium |
| USER-IOS-AUTH-008 | Native Google Sign-In - iOS Client ID configured | Production build | 1. Check app.json configuration | iOS Client ID present: `415589239922-p7dfbfm43lv3m2nk63d39p7dmrqgtdgo`<br>Plugin configured with `iosUrlScheme` | High |
| USER-IOS-AUTH-009 | Native Google Sign-In - URL scheme handling | Production build | 1. Complete Google sign-in<br>2. Check deep link handling | URL scheme `com.googleusercontent.apps.415589239922-p7dfbfm43lv3m2nk63d39p7dmrqgtdgo` configured<br>App handles OAuth redirect correctly | Medium |
| USER-IOS-AUTH-010 | Google sign-in with 2FA required (iOS) | 2FA enabled for account | 1. Complete Google sign-in on iOS<br>2. 2FA required | Redirect to 2FA verification screen<br>Native iOS keyboard appears for code input | High |
| USER-IOS-AUTH-011 | Google sign-in network error (iOS) | No internet connection | 1. Disconnect internet<br>2. Tap "Continue with Google" | Error alert: "Network error"<br>Native error handling (iOS Alert) | Medium |
| USER-IOS-AUTH-012 | Google sign-in - environment auto-detection | Any build | 1. Check console logs on app start | Console shows correct environment detection:<br>- Expo Go: "Expo Go"<br>- Production: "Standalone/Production" | Medium |
| USER-IOS-AUTH-013 | Google sign-in - session clearing | Production build, previously signed in | 1. Tap "Continue with Google"<br>2. Check console logs | Console shows: "🔄 Clearing any previous Google session to force account picker..."<br>Previous session cleared before showing picker | Medium |
| USER-IOS-AUTH-014 | Google sign-in - revoke access on sign out | Production build | 1. Sign in with Google<br>2. Sign out<br>3. Check console | Console shows: "🔄 Revoking access to clear cached account..."<br>Access revoked, account picker will show on next sign-in | Low |

### 1.4 Two-Factor Authentication
> **Note:** 2FA is identical on iOS and Android. Refer to main test cases.

### 1.5 Registration
> **Note:** Registration is identical on iOS and Android. Refer to main test cases.

### 1.6 Session Management
> **Note:** Session management is identical on iOS and Android. Refer to main test cases.

### 1.7 Password Reset
> **Note:** Password reset is identical on iOS and Android. Refer to main test cases.

---

## 2. Notifications (iOS-Specific)

### 2.1 Push Notification Permissions (iOS)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-NOTIF-001 | Request push notification permission (first time) | First app launch, iOS device | 1. Complete onboarding<br>2. Navigate to any screen that triggers notification registration | iOS native permission alert appears:<br>"LetLink Would Like to Send You Notifications"<br>Options: "Don't Allow" / "Allow" | High |
| USER-IOS-NOTIF-002 | Grant push notification permission | Permission alert visible | 1. Tap "Allow" on iOS permission alert | Permission granted<br>Push token obtained<br>Token saved to backend<br>Console shows: "Push token obtained: ExponentPushToken[...]" | High |
| USER-IOS-NOTIF-003 | Deny push notification permission | Permission alert visible | 1. Tap "Don't Allow" on iOS permission alert | Permission denied<br>App continues to work<br>No push token obtained<br>User can enable later in iOS Settings | High |
| USER-IOS-NOTIF-004 | Check notification permission status | App installed, permission may be granted/denied | 1. Navigate to Account Settings > Notifications<br>2. View permission status | Status displayed correctly:<br>- "Granted" if allowed<br>- "Denied" if not allowed<br>- "Undetermined" if never asked | High |
| USER-IOS-NOTIF-005 | Request permission from Settings | Permission previously denied | 1. Go to Account Settings > Notifications<br>2. Tap "Enable Notifications" or similar<br>3. If denied, tap "Open Settings" | Alert shows: "Please enable notifications in iOS Settings"<br>Opens iOS Settings app to LetLink notification settings | High |
| USER-IOS-NOTIF-006 | Enable permission from iOS Settings | Permission denied, Settings opened | 1. Open iOS Settings > LetLink > Notifications<br>2. Enable "Allow Notifications"<br>3. Return to app | App detects permission change<br>Token obtained automatically<br>Notification preferences enabled | High |
| USER-IOS-NOTIF-007 | Notification permission - physical device only | iOS Simulator | 1. Try to register for notifications | Console shows: "Must use physical device for Push Notifications"<br>No permission prompt (expected behavior) | Medium |
| USER-IOS-NOTIF-008 | Notification permission - device check | Physical iOS device | 1. Check device detection | `Device.isDevice` returns true<br>Permission flow proceeds | Medium |

### 2.2 Notification Preferences (Account Settings)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-NOTIF-009 | Access Notification Settings | User logged in | 1. Navigate to Account/Profile<br>2. Tap "Settings"<br>3. Tap "Notifications" tab | Notification preferences screen displays<br>Shows toggle switches for each preference | High |
| USER-IOS-NOTIF-010 | Notification preferences loading state | First load of settings | 1. Open Notification Settings | Shows loading indicator<br>Fetches preferences from backend API | Medium |
| USER-IOS-NOTIF-011 | Enable Push Notifications toggle | On Notification Settings | 1. View "Enable Push Notifications" toggle<br>2. Toggle ON | Toggle turns ON<br>API call to update preference<br>Success message shown<br>Preference saved to backend | High |
| USER-IOS-NOTIF-012 | Disable Push Notifications toggle | Push notifications enabled | 1. Toggle "Enable Push Notifications" OFF | Toggle turns OFF<br>API call to update preference<br>All notifications disabled<br>Preference saved to backend | High |
| USER-IOS-NOTIF-013 | Notify on New Case toggle | On Notification Settings | 1. Toggle "Notify on New Case" ON/OFF | Toggle state changes<br>API call updates preference<br>Preference saved | High |
| USER-IOS-NOTIF-014 | Notify on Case Update toggle | On Notification Settings | 1. Toggle "Notify on Case Update" ON/OFF | Toggle state changes<br>API call updates preference<br>Preference saved | High |
| USER-IOS-NOTIF-015 | Notify on New Message toggle | On Notification Settings | 1. Toggle "Notify on New Message" ON/OFF | Toggle state changes<br>API call updates preference<br>Preference saved | High |
| USER-IOS-NOTIF-016 | Notify on Lawyer Assignment toggle | On Notification Settings | 1. Toggle "Notify on Lawyer Assignment" ON/OFF | Toggle state changes<br>API call updates preference<br>Preference saved | High |
| USER-IOS-NOTIF-017 | Multiple preference toggles | On Notification Settings | 1. Toggle multiple preferences rapidly | All toggles update correctly<br>Each API call completes<br>No race conditions | Medium |
| USER-IOS-NOTIF-018 | Preference update error handling | Network error | 1. Disconnect internet<br>2. Toggle a preference | Error alert: "Failed to update notification preferences"<br>Toggle reverts to previous state<br>Error message displayed | High |
| USER-IOS-NOTIF-019 | Preference persistence | Preferences updated | 1. Update preferences<br>2. Close app<br>3. Reopen app<br>4. Check Notification Settings | Preferences persist correctly<br>Shows last saved state from backend | High |
| USER-IOS-NOTIF-020 | Default notification preferences | New user, first time opening | 1. New user opens Notification Settings | All preferences default to ON:<br>- Enable Push Notifications: ON<br>- Notify on New Case: ON<br>- Notify on Case Update: ON<br>- Notify on New Message: ON<br>- Notify on Lawyer Assignment: ON | Medium |
| USER-IOS-NOTIF-021 | Admin notification preferences | Admin user logged in | 1. Admin opens Notification Settings | Additional admin-specific preferences shown (if any)<br>All user preferences also available | Medium |
| USER-IOS-NOTIF-022 | Notification preference API error | Backend API error | 1. Open Notification Settings with API error | Error alert: "Failed to load notification preferences"<br>Shows default preferences<br>Retry option available | Medium |

### 2.3 Push Notification Receiving (iOS)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-NOTIF-023 | Receive push notification (app in foreground) | App open, notification sent | 1. Send test notification<br>2. App is in foreground | Notification appears as in-app banner/alert<br>Notification handler triggered<br>User can tap to navigate | High |
| USER-IOS-NOTIF-024 | Receive push notification (app in background) | App in background, notification sent | 1. Send test notification<br>2. App is in background | iOS notification banner appears at top<br>Notification appears in Notification Center<br>Badge count updates | High |
| USER-IOS-NOTIF-025 | Receive push notification (app closed) | App closed, notification sent | 1. Send test notification<br>2. App is completely closed | iOS notification appears on lock screen<br>Notification in Notification Center<br>Tapping opens app | High |
| USER-IOS-NOTIF-026 | Tap notification to open app | Notification received | 1. Tap on notification | App opens<br>Navigates to relevant screen based on notification data<br>Notification marked as read | High |
| USER-IOS-NOTIF-027 | Notification sound | Notification received, sound enabled | 1. Receive notification | iOS notification sound plays<br>Respects device silent mode | Medium |
| USER-IOS-NOTIF-028 | Notification badge count | Multiple unread notifications | 1. Receive multiple notifications | App icon badge shows unread count<br>Badge updates correctly | Medium |
| USER-IOS-NOTIF-029 | Notification with custom data | Notification with deep link data | 1. Receive notification with custom data<br>2. Tap notification | App opens to specific screen<br>Data passed correctly to app<br>Deep link handled | High |
| USER-IOS-NOTIF-030 | Notification channel (iOS) | iOS device | 1. Check notification configuration | iOS uses default notification channel<br>No Android-specific channel configuration | Low |

### 2.4 Notification Token Management (iOS)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-NOTIF-031 | Push token obtained | Permission granted | 1. Grant notification permission | Token obtained: `ExponentPushToken[...]`<br>Token saved to AsyncStorage<br>Token sent to backend API<br>Console shows token | High |
| USER-IOS-NOTIF-032 | Push token format (iOS) | Token obtained | 1. Check token format | Token format: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`<br>Valid Expo push token format | Medium |
| USER-IOS-NOTIF-033 | Push token stored locally | Token obtained | 1. Check AsyncStorage | Token stored with key: `@letlink:notificationToken`<br>Token persists across app restarts | Medium |
| USER-IOS-NOTIF-034 | Push token sent to backend | Token obtained | 1. Check API call | Token sent to backend notification registration endpoint<br>Backend stores token for user | High |
| USER-IOS-NOTIF-035 | Token refresh on app restart | App restarted | 1. Restart app<br>2. Check token | Token retrieved from AsyncStorage<br>If expired, new token obtained<br>Token updated on backend | Medium |
| USER-IOS-NOTIF-036 | Token expiration handling | Token expired | 1. Wait for token expiration<br>2. Send notification | Token refreshed automatically<br>New token obtained and sent to backend | Medium |

### 2.5 Notification Settings UI (iOS-Specific)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-IOS-NOTIF-037 | iOS native toggle switches | On Notification Settings | 1. View toggle switches | iOS native UISwitch components<br>Proper iOS styling and animations<br>Smooth toggle transitions | Medium |
| USER-IOS-NOTIF-038 | Settings screen layout (iOS) | On Notification Settings | 1. View screen layout | iOS native List/ScrollView layout<br>Proper spacing and padding<br>iOS-safe area handling | Medium |
| USER-IOS-NOTIF-039 | Settings navigation (iOS) | Navigate to Settings | 1. Navigate from Profile to Settings | iOS native navigation bar<br>Back button works correctly<br>Smooth navigation transition | Medium |
| USER-IOS-NOTIF-040 | Dark mode support | iOS Dark Mode enabled | 1. Enable Dark Mode<br>2. View Notification Settings | Settings screen adapts to dark mode<br>Text and backgrounds adjust<br>Toggle switches visible | Low |

---

## Test Execution Summary Template

```
Test Execution Report - iOS User Role
=====================================
Date: _______________
Tester: _____________
Build Version: ______
Device: _____________
iOS Version: _________
Device Type: iPhone / iPad

Total Test Cases: 40+
Passed: ____
Failed: ____
Blocked: ____
Not Executed: ____

Pass Rate: ____%

Critical Issues Found:
1. ________________
2. ________________
3. ________________

iOS-Specific Notes:
- Google Sign-In: Expo Go vs Production Build
- Notification Permissions: iOS native alerts
- Device Requirements: Physical device for push notifications
```

---

## Defect Report Template

```
Defect ID: USER-IOS-DEF-XXX
Test Case ID: USER-IOS-XXX-XXX
Severity: Critical / High / Medium / Low
Priority: P1 / P2 / P3 / P4

Summary: _________________

Steps to Reproduce:
1. _______________
2. _______________
3. _______________

Expected Result: __________
Actual Result: ___________

Device: __________________
iOS Version: ______________
Build Version: ___________
Build Type: Expo Go / Production

Attachments:
- Screenshot
- Video
- Console Logs
- Xcode Logs (if applicable)
```

---

## iOS-Specific Testing Notes

### Google Sign-In Testing
- **Expo Go**: Uses browser-based OAuth (expo-auth-session)
- **Production Build**: Uses native Google Sign-In SDK
- **Testing**: Must test both environments
- **Configuration**: iOS Client ID must be configured in app.json

### Notification Testing
- **Physical Device Required**: Push notifications only work on physical iOS devices, not simulator
- **Permission Flow**: iOS shows native permission alert (cannot be customized)
- **Settings Integration**: Users can enable/disable in iOS Settings app
- **Token Format**: Expo push tokens (ExponentPushToken[...])

### Environment Detection
- App automatically detects Expo Go vs Production build
- Console logs show which authentication method is used
- No manual configuration needed

---

*Total Test Cases for iOS User Role (Authentication & Notifications): **40+***

*Document Version: 1.0*
*Last Updated: December 2024*

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial iOS-specific test cases for Authentication (Google Sign-In) and Notifications (Account Settings) |

