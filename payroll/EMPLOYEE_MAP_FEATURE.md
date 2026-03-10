# Employee Map Feature - GPS Tracking for Managers

## Overview

The Employee Map feature allows managers to track employee GPS locations during attendance check-in. This provides visibility into where employees are checking in from, helping managers verify attendance authenticity and monitor remote work locations.

---

## 🎯 Feature Architecture

### Screen Flow

```
Manager Home Screen → Employee Map Card → EmployeeMapScreen → View Employee Locations
                                                                     ↓
                                                              Tap Marker → Employee Details
```

### Role-Based Access

#### **Manager:**
- Home Screen shows "Employee Map" card (Cyan color with map marker icon)
- Attendance Screen shows "Employee Map" button in filter bar
- Can access EmployeeMapScreen to view all employee locations
- Can tap markers to see employee details (name, check-in time, coordinates)

#### **Employee:**
- Cannot see Employee Map card
- Cannot see Employee Map button
- Cannot access EmployeeMapScreen (manager-only feature)

---

## 📱 Screen Details

### EmployeeMapScreen

**Location:** `payroll/screens/EmployeeMapScreen.tsx`

**Features:**
1. **Interactive Map** - Uses `react-native-maps` with Google Maps provider
2. **Real-time GPS Location** - Gets manager's current location as map center
3. **Employee Markers** - Shows employee locations as markers on the map
4. **Location Circle** - 500m radius circle around manager's location
5. **Marker Details** - Tap markers to see employee info (name, check-in time, coordinates)
6. **Permission Handling** - Requests location permission gracefully
7. **Google Maps UI** - Custom bottom card with Google Maps-style icon
8. **Cancel Button** - Easy exit back to previous screen

**UI Components:**
- Header with back button and "Employee Map" title
- Full-screen map view with markers
- Manager location shown as blue dot with circle radius
- Employee markers with account icons
- Bottom info card with:
  - Google Maps-style icon (red, blue, yellow, green dots)
  - Title: "Employee Map"
  - Description: "Where your employee you can check gps"
  - Cancel button (pink background)

---

## 🔧 Technical Implementation

### Dependencies

```json
{
  "react-native-maps": "1.18.2",
  "expo-location": "~19.0.7"
}
```

**Installation:**
```bash
npx expo install react-native-maps
```

### Location Permission Flow

```typescript
1. Request foreground location permission
   → Location.requestForegroundPermissionsAsync()

2. Check permission status
   → If granted: Get current location
   → If denied: Show permission dialog with options

3. Get current position
   → Location.getCurrentPositionAsync()
   → Use balanced accuracy for better performance

4. Set map center to current location
   → Show manager's position on map
```

### Map Configuration

```typescript
<MapView
  provider={PROVIDER_GOOGLE}
  initialRegion={{
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.02,  // ~2km zoom level
    longitudeDelta: 0.02,
  }}
  showsUserLocation={true}
  showsMyLocationButton={true}
  showsCompass={true}
>
```

### Employee Location Data Structure

```typescript
interface EmployeeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  checkInTime: string;
}
```

### Mock Data

Currently uses mock employee data. In production, this should be fetched from the backend API:

```typescript
// Example API call (to be implemented)
const fetchEmployeeLocations = async () => {
  const response = await fetch('/api/attendance/employee-locations');
  const employees = await response.json();
  setEmployees(employees);
};
```

---

## 🎨 UI/UX Design

### Color Scheme
- Primary Blue: `#4285F4` (manager location circle)
- Teal: `#00BCD4` (card accent)
- Cyan: `#00897B` (map button)
- Pink: `#FFE5E5` (cancel button background)
- Red: `#FF6B6B` (cancel button text)

### Map Markers
- **Manager:** Blue dot (native map marker)
- **Employees:** Custom marker with account icon
  - White background
  - Blue border
  - Account circle icon

### Location Circle
- **Radius:** 500 meters
- **Fill Color:** Light blue with 10% opacity
- **Stroke Color:** Blue with 30% opacity
- **Purpose:** Shows coverage area around manager

---

## 🔐 Security & Privacy Features

1. **Permission Handling**
   - Requests only when needed
   - Clear permission dialogs
   - Graceful fallback if denied

2. **Manager-Only Access**
   - Role-based access control
   - Hidden from employee UI
   - Protected navigation routes

3. **Location Accuracy**
   - Balanced accuracy for better battery life
   - Coordinates rounded to 4 decimal places (~11m accuracy)

4. **Data Privacy**
   - Only shows employee locations during check-in
   - Historical tracking not implemented (privacy consideration)
   - Employees should be informed of tracking policy

---

## 🚀 Access Points

### 1. Home Screen (Manager Only)
```typescript
<ServiceCard
  title="Employee Map"
  count={5}  // Number of employees checked in today
  icon="map-marker-radius"
  color="#00BCD4"
  onPress={() => navigation?.navigate('EmployeeMap')}
/>
```

### 2. Attendance Screen (Manager Only)
```typescript
// Shows as button in filter bar
<TouchableOpacity
  style={styles.mapButton}
  onPress={() => navigation?.navigate('EmployeeMap')}
>
  <MaterialCommunityIcons name="map-marker-radius" size={16} color="#00897B" />
  <Text>Employee Map</Text>
</TouchableOpacity>
```

---

## 📊 Integration Points

### Current Integrations
1. **PayrollAuthContext** - Role-based access control
2. **Navigation Stack** - Screen routing
3. **Attendance Screen** - Quick access button
4. **Home Screen** - Service card
5. **expo-location** - GPS tracking
6. **react-native-maps** - Map display

### Future Integrations
1. **Backend API** - Fetch real employee locations
2. **Real-time Updates** - WebSocket for live location updates
3. **Geofencing** - Alert if employee checks in outside allowed area
4. **Historical Data** - View past check-in locations
5. **Export Reports** - Generate location reports for payroll

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Map loads correctly with manager's location
- [ ] Employee markers appear on map
- [ ] Tap marker shows employee details
- [ ] Location permission request works
- [ ] Permission denial handled gracefully
- [ ] Cancel button navigates back
- [ ] Map controls work (zoom, pan, compass)
- [ ] My Location button centers map

### Role-Based Testing
- [ ] Manager can see Employee Map card on home
- [ ] Manager can see Employee Map button in attendance
- [ ] Employee cannot see Employee Map card
- [ ] Employee cannot see Employee Map button
- [ ] Direct URL access blocked for employees

### UI Testing
- [ ] Map renders properly on different screen sizes
- [ ] Bottom card doesn't obstruct map
- [ ] Google Maps icon displays correctly
- [ ] Markers are tappable
- [ ] Safe area handling works on notched devices

### Permission Testing
- [ ] First-time permission request shows system dialog
- [ ] Permission granted: Map loads with location
- [ ] Permission denied: Error dialog shown with options
- [ ] Re-request permission works if initially denied

---

## 📝 Known Issues & Limitations

### Current Limitations

1. **Mock Data Only**
   - Currently shows hardcoded employee locations
   - **Solution:** Integrate with backend API in production

2. **Static Locations**
   - Employee locations don't update in real-time
   - **Solution:** Implement WebSocket or polling for live updates

3. **No Historical Data**
   - Only shows current check-in locations
   - **Solution:** Add date picker to view past locations

4. **No Geofencing**
   - Doesn't validate if employee is within allowed radius
   - **Solution:** Implement geofence validation in backend

5. **iOS Simulator Issue**
   - Location may not work properly in iOS Simulator
   - **Solution:** Test on physical device

### Google Maps Configuration

For production, you'll need to configure Google Maps API keys:

**iOS (app.json):**
```json
{
  "ios": {
    "config": {
      "googleMapsApiKey": "YOUR_IOS_API_KEY"
    }
  }
}
```

**Android (app.json):**
```json
{
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "YOUR_ANDROID_API_KEY"
      }
    }
  }
}
```

---

## 🔍 Code Structure

```
payroll/
├── screens/
│   ├── EmployeeMapScreen.tsx          ← New screen
│   ├── AttendanceScreen.tsx           ← Updated with map button
│   └── PayrollHomeScreen.tsx          ← Updated with map card
└── EMPLOYEE_MAP_FEATURE.md            ← This file
```

---

## 🎓 Developer Notes

### Important Considerations

1. **Google Maps API Key:**
   - Required for production builds
   - Get from Google Cloud Console
   - Enable Maps SDK for Android/iOS
   - Set up billing (Google requires it)

2. **Location Permissions:**
   - **iOS:** Add `NSLocationWhenInUseUsageDescription` to Info.plist
   - **Android:** Add `ACCESS_FINE_LOCATION` permission to AndroidManifest.xml
   - Both handled automatically by Expo

3. **Battery Consideration:**
   - Use balanced accuracy instead of high accuracy
   - Don't continuously track location
   - Only get location when map opens

4. **Privacy Policy:**
   - Inform employees about location tracking
   - Get consent for location collection
   - Comply with GDPR/local privacy laws
   - Only track during work hours

---

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ Map view with employee locations
- ✅ Manager-only access
- ✅ Tap markers for details
- ✅ Location permission handling

### Phase 2 (Planned)
- [ ] Real-time location updates via WebSocket
- [ ] Backend API integration
- [ ] Historical location view
- [ ] Date/time filter for past check-ins

### Phase 3 (Future)
- [ ] Geofencing validation
- [ ] Location-based alerts
- [ ] Heatmap view of common check-in areas
- [ ] Export location reports (PDF/Excel)
- [ ] Custom radius configuration
- [ ] Multiple office locations support

---

## 📚 References

- [React Native Maps Documentation](https://github.com/react-native-maps/react-native-maps)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Google Maps Platform](https://developers.google.com/maps)
- [Privacy Best Practices for Location](https://developer.apple.com/documentation/corelocation/requesting_authorization_to_use_location_services)

---

## 📞 Support

### Troubleshooting

**Issue:** Map not showing
- **Solution:** Check if Google Maps API key is configured
- **Solution:** Verify location permissions are granted

**Issue:** "User denied permission"
- **Solution:** Check device settings and grant location permission manually
- **Solution:** Uninstall and reinstall app to reset permissions

**Issue:** Markers not appearing
- **Solution:** Check if mock data is loaded
- **Solution:** Verify employee locations have valid coordinates

**Issue:** Map shows wrong location
- **Solution:** Check device GPS is enabled
- **Solution:** Try outdoors for better GPS signal

---

**Last Updated:** January 19, 2026
**Version:** 1.0.0
**Status:** ✅ Implemented and Ready for Testing
