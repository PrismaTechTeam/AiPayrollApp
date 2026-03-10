# Payroll App - Login/Logout System (Dummy Data)

## Overview
Implemented a complete login/logout system with dummy user credentials for testing.

## Test Users

### 1. Employee User
- **Email:** `employee@test.com`
- **Password:** `123456`
- **Name:** John Employee
- **Role:** Employee only
- **Can:** Submit requests, view own data
- **Cannot:** Approve requests

### 2. Manager User
- **Email:** `manager@test.com`
- **Password:** `123456`
- **Name:** Sarah Manager
- **Role:** Manager only
- **Can:** Approve/reject all requests, view all data
- **Cannot:** Switch roles (only has Manager role)

### 3. Admin User (Both Roles)
- **Email:** `admin@test.com`
- **Password:** `123456`
- **Name:** Alex Smith
- **Role:** Employee (can switch to Manager)
- **Can:** Everything, including role switching
- **Special:** Has access to both Employee and Manager roles

## Features

### Login Screen
- ✅ Email and password input
- ✅ Show/hide password toggle
- ✅ Quick-fill buttons for test users
- ✅ Validation with error messages
- ✅ Beautiful blue theme matching the app

### Profile Screen
- ✅ User avatar with role color
- ✅ Display name, email, and current role
- ✅ Settings menu items (UI only)
- ✅ Logout button with confirmation
- ✅ Access via bottom navigation (Profile icon)

### Authentication Flow
1. **App Launch** → Check SecureStore for logged-in user
2. **No User** → Show Login Screen
3. **User Exists** → Show Payroll Home Screen
4. **Logout** → Clear SecureStore, return to Login Screen

## How to Test

### Test Login
1. Open the app
2. You'll see the Login Screen
3. Click any "Test User" button to auto-fill credentials
4. Click "Sign In"
5. App navigates to Payroll Home

### Test Role Switching
1. Login with `admin@test.com` (password: `123456`)
2. Go to home screen
3. Click role badge below "Good Morning"
4. Switch between Employee and Manager
5. Notice approve/reject buttons appear/disappear

### Test Logout
1. Click Profile icon in bottom navigation
2. Scroll down
3. Click "Logout" button
4. Confirm logout
5. Returns to Login Screen

## File Structure

```
payroll/
├── screens/
│   ├── LoginScreen.tsx          # Login with dummy users
│   └── ProfileScreen.tsx        # Profile with logout
├── context/
│   └── PayrollAuthContext.tsx   # Auth logic with dummy validation
└── components/
    └── BottomNavBar.tsx         # Navigation with Profile link
```

## Security Notes

⚠️ **This is for development/testing only!**

- All credentials are hardcoded
- No actual API integration
- Data stored in SecureStore (encrypted)
- Passwords are checked in plain text (not hashed)

## For Production

When ready for production:

1. **Replace dummy validation** with API calls
2. **Add proper password hashing**
3. **Implement JWT tokens**
4. **Add refresh token logic**
5. **Add forgot password flow**
6. **Add registration screen**
7. **Add email verification**

## Current Validation Logic

```typescript
// In PayrollAuthContext.tsx
const DUMMY_USERS = [
  { email: 'employee@test.com', password: '123456', ... },
  { email: 'manager@test.com', password: '123456', ... },
  { email: 'admin@test.com', password: '123456', ... },
];

// Find matching user
const matchedUser = DUMMY_USERS.find(
  (u) => u.email === email && u.password === password
);

if (!matchedUser) {
  throw new Error('Invalid email or password');
}
```

## Navigation Structure

```
App starts
    ↓
Is user logged in?
    ↓                     ↓
   NO                    YES
    ↓                     ↓
LoginScreen         PayrollHome
    ↓                     ↓
  Login              All app screens
    ↓                     ↓
PayrollHome          Profile Screen
                          ↓
                       Logout
                          ↓
                    LoginScreen
```

## Quick Commands

```bash
# Clear all stored data (reset login)
# On iOS: Settings > Expo Go > Clear Data
# On Android: Settings > Apps > Expo Go > Clear Data
```

## UI Screenshots

### Login Screen
- Blue header with app icon
- White form container
- Three test user buttons
- Email/password inputs
- Sign In button

### Profile Screen
- Blue header
- Large avatar with role color
- User name and email
- Current role badge
- Settings menu items
- Red logout button at bottom

## Next Steps

- [ ] Add "Remember Me" checkbox
- [ ] Add biometric authentication (Face ID / Fingerprint)
- [ ] Add session timeout
- [ ] Add multi-factor authentication
- [ ] Integrate with real backend API
