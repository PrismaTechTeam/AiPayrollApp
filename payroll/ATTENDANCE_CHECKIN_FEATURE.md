# Attendance Check-In Feature

## Overview

The Attendance Check-In feature allows employees to check in/out using biometric authentication (fingerprint or face recognition). This feature is employee-specific and provides a secure, convenient way to record attendance.

---

## 🎯 Feature Architecture

### Screen Flow

```
Employee Home Screen → Check-In Card → AttendanceCheckInScreen → Biometric Auth → Success
```

### Manager vs Employee Views

#### **Employee:**
- Home Screen shows "Check-In" card (Cyan color with fingerprint icon)
- Attendance Screen shows Floating Action Button (FAB) for quick check-in
- Can access AttendanceCheckInScreen for biometric authentication

#### **Manager:**
- Home Screen shows "Attendance" card (Blue color with clock icon)
- Attendance Screen shows attendance list without FAB
- Cannot access AttendanceCheckInScreen (manager-only view)

---

## 📱 Screen Details

### AttendanceCheckInScreen

**Location:** `payroll/screens/AttendanceCheckInScreen.tsx`

**Features:**
1. **Real-time Clock Display** - Shows current time in 12-hour format (e.g., "10:30 AM")
2. **Dual Biometric Authentication** - Supports both Face ID and Fingerprint
3. **Smart Detection** - Automatically detects available biometric methods
4. **Adaptive UI** - Shows appropriate icons based on device capabilities:
   - Face ID only: Large face recognition icon
   - Fingerprint only: Large fingerprint icon
   - Both available: Shows both icons side by side with "or" text
5. **Error Handling** - Graceful fallback if biometric is not available
6. **Success Confirmation** - Alert dialog showing check-in time

**UI Components:**
- Header with back button
- **Adaptive Biometric Icons:**
  - **Both available:** Two circular icons (Face ID + Fingerprint) with "or" between them
  - **Face ID only:** Large face recognition icon (120px) in blue circular border
  - **Fingerprint only:** Large fingerprint icon (120px) in blue circular border
- **Dynamic instruction text:**
  - Both: "Use Face ID or Fingerprint to verify"
  - Face ID: "Look at your device to verify"
  - Fingerprint: "Please lift and rest your finger"
- Real-time clock display (48px, bold, blue)
- Continue button (blue, rounded)
- Warning message if biometric not available

---

## 🔧 Technical Implementation

### Dependencies

```json
{
  "expo-local-authentication": "~15.0.7"
}
```

**Installation:**
```bash
npm install expo-local-authentication
```

### Biometric Authentication Flow

```typescript
1. Check if biometric hardware is available
   → LocalAuthentication.hasHardwareAsync()

2. Check if biometric is enrolled (user has set up fingerprint/face)
   → LocalAuthentication.isEnrolledAsync()

3. Detect available biometric types
   → LocalAuthentication.supportedAuthenticationTypesAsync()
   → Returns: FINGERPRINT, FACIAL_RECOGNITION, or IRIS

4. Update UI based on available types
   → Face ID only: Show face recognition icon
   → Fingerprint only: Show fingerprint icon
   → Both: Show both icons with "or" text

5. Trigger authentication
   → LocalAuthentication.authenticateAsync({
       promptMessage: 'Verify your identity to check in',
       fallbackLabel: 'Use Passcode',
       cancelLabel: 'Cancel',
     })
   → Automatically uses available biometric method

6. Handle result
   → Success: Show confirmation, navigate back
   → Failure: Show error message
```

### Navigation Integration

**Added to App.tsx:**
```typescript
import AttendanceCheckInScreen from './payroll/screens/AttendanceCheckInScreen';

<Stack.Screen name="AttendanceCheckIn" component={AttendanceCheckInScreen} />
```

**Navigation Calls:**
```typescript
// From Home Screen (Employee only)
navigation.navigate('AttendanceCheckIn')

// From Attendance Screen FAB (Employee only)
navigation.navigate('AttendanceCheckIn')
```

---

## 🎨 UI/UX Design

### Color Scheme
- Primary Blue: `#4285F4`
- Background: `#F5F5F5`
- Text: `#000` (header), `#999` (instruction), `#4285F4` (time)
- Warning: `#FF9800`

### Layout
- **Header:** Standard header with back button and "Attandance" title
- **Content:** Centered layout with fingerprint icon, instruction, time, and button
- **Spacing:** Generous padding for comfortable touch targets

### Responsive Design
- Safe area handling for notched devices
- Proper keyboard avoidance (not needed for this screen)
- Touch-friendly button sizes (60x60 for FAB, large continue button)

---

## 🔐 Security Features

1. **Biometric Authentication**
   - Uses device's native biometric system
   - Secure enclave protection (iOS)
   - Keystore protection (Android)

2. **Fallback Options**
   - Device passcode as fallback
   - Manual check-in option (future enhancement)

3. **Permission Handling**
   - Checks hardware availability
   - Checks enrollment status
   - Graceful error handling

---

## 🚀 Future Enhancements

### Phase 1 (Current)
- ✅ Dual biometric authentication (Face ID + Fingerprint)
- ✅ Smart biometric type detection
- ✅ Adaptive UI based on available biometric methods
- ✅ Real-time clock display
- ✅ Role-based access (employee only)
- ✅ FAB on Attendance screen

### Phase 2 (Planned)
- [ ] GPS location tracking
- [ ] Photo capture for verification
- [ ] Check-out functionality
- [ ] Offline mode with sync

### Phase 3 (Future)
- [ ] Geofencing (check-in only within office radius)
- [ ] QR code check-in option
- [ ] Attendance history in check-in screen
- [ ] Push notifications for check-in reminders

---

## 📊 Integration Points

### Current Integrations
1. **PayrollAuthContext** - Role-based access control
2. **Navigation Stack** - Screen routing
3. **Attendance Screen** - FAB integration
4. **Home Screen** - Check-In card

### Future Integrations
1. **Backend API** - Save attendance records
2. **Location Services** - GPS tracking
3. **Camera API** - Photo verification
4. **Push Notifications** - Reminders

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Face ID authentication works on Face ID devices
- [ ] Fingerprint authentication works on fingerprint devices
- [ ] Both icons show on devices with both biometric types
- [ ] Correct icon shows based on device capability
- [ ] Instruction text updates based on biometric type
- [ ] Fallback to passcode works
- [ ] Time updates every second
- [ ] Success alert shows correct time
- [ ] Back button navigates correctly
- [ ] FAB only visible for employees
- [ ] Check-In card only visible for employees

### UI Testing
- [ ] Layout looks good on different screen sizes
- [ ] Safe area handling works on notched devices
- [ ] Colors match design
- [ ] Animations are smooth
- [ ] Touch targets are comfortable

### Error Handling
- [ ] Biometric not available message shows
- [ ] Authentication failure handled gracefully
- [ ] Network errors handled (future)
- [ ] Permission denied handled

---

## 📝 Known Issues & Limitations

### Current Limitations
1. **Simulator Testing:** Biometric authentication doesn't work in iOS Simulator or Android Emulator
   - **Solution:** Test on physical device
   
2. **No Backend Integration:** Currently shows success alert but doesn't save to database
   - **Solution:** Integrate with backend API in Phase 2

3. **No Check-Out:** Only check-in functionality implemented
   - **Solution:** Add check-out button/screen in Phase 2

4. **No Location Tracking:** Doesn't verify user is at office location
   - **Solution:** Add GPS tracking in Phase 2

### Workarounds
- For simulator testing: Use manual check-in option (to be implemented)
- For backend: Mock data in local state (temporary)

---

## 🔍 Code Structure

```
payroll/
├── screens/
│   ├── AttendanceCheckInScreen.tsx    ← New screen
│   ├── AttendanceScreen.tsx           ← Updated with FAB
│   └── PayrollHomeScreen.tsx          ← Updated with Check-In card
├── components/
│   └── attendance/
│       └── (existing components)
└── ATTENDANCE_CHECKIN_FEATURE.md      ← This file
```

---

## 📚 References

- [Expo Local Authentication Docs](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [React Navigation Docs](https://reactnavigation.org/docs/getting-started)
- [React Native Safe Area Context](https://github.com/th3rdwave/react-native-safe-area-context)

---

## 🎓 Developer Notes

### Important Considerations

1. **Device Requirements:**
   - Physical device with biometric hardware
   - Biometric must be enrolled in device settings
   - iOS 11+ or Android 6.0+ (Marshmallow)

2. **Permissions:**
   - No additional permissions needed (handled by expo-local-authentication)
   - Uses device's native biometric system

3. **Platform Differences:**
   - iOS: Face ID or Touch ID
   - Android: Fingerprint or Face Unlock
   - Different UI prompts on each platform

4. **Best Practices:**
   - Always check hardware availability before authentication
   - Provide fallback options
   - Handle errors gracefully
   - Show clear user feedback

---

## 📞 Support

For issues or questions about this feature:
1. Check the Known Issues section above
2. Review the expo-local-authentication documentation
3. Test on a physical device (not simulator)
4. Check device biometric settings

---

**Last Updated:** January 19, 2026
**Version:** 1.0.0
**Status:** ✅ Implemented and Ready for Testing
