# Employee Tracking Flow - Complete Feature

## Overview

The Employee Tracking feature provides a two-step process for managers to view employee locations:
1. **Employee List Screen** - Shows all employees with their check-in status
2. **Employee Map Screen** - Shows the selected employee's location on an interactive map

---

## 🎯 User Flow

### Complete Navigation Flow

```
Manager Home Screen
       ↓
   Click "Employee Map" Card
       ↓
Employee List Screen (shows all employees)
       ↓
   Click on Checked-In Employee
       ↓
Employee Map Screen (focused on selected employee)
       ↓
   Tap "Back to List"
       ↓
Back to Employee List Screen
```

### Alternative Entry Point

```
Attendance Screen (Manager)
       ↓
   Click "Employee Map" Button (in filter bar)
       ↓
Employee List Screen
       ↓
   (same flow as above)
```

---

## 📱 Screen Details

### 1. Employee List Screen

**Location:** `payroll/screens/EmployeeListScreen.tsx`

**Purpose:** Display all employees and their check-in status, allowing managers to select which employee to track.

**Features:**
- **Summary Cards:** Quick overview of checked-in vs not checked-in employees
  - Green card: Checked In count (with check-circle icon)
  - Orange card: Not Checked In count (with clock-alert icon)

- **Employee Cards:** Each employee displays:
  - Avatar with initial letter
  - Name, position, and department
  - Check-in status badge
  - Check-in time (if checked in)
  - Chevron arrow (only for checked-in employees)

- **Status Indicators:**
  - ✅ **Checked In:** Green badge, shows check-in time, clickable
  - ⏰ **Not Checked In:** Orange badge, grayed out, not clickable

- **Interaction:**
  - Tap checked-in employee → Navigate to map with their location
  - Tap not-checked-in employee → No action (card is disabled)

**UI Layout:**
```
┌──────────────────────────────────────┐
│  ←  Employee List               ⚪   │
├──────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐       │
│  │    ✓     │    │    ⏰    │       │
│  │    5     │    │    2     │       │
│  │Checked In│    │Not Checked│       │
│  └──────────┘    └──────────┘       │
├──────────────────────────────────────┤
│  All Employees                       │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ [J] John Doe            ✓ >  │   │
│  │     Software Engineer        │   │
│  │     🏢 Engineering           │   │
│  │     🕐 08:45 AM              │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ [J] Jane Smith          ✓ >  │   │
│  │     Product Manager          │   │
│  │     🏢 Product               │   │
│  │     🕐 08:52 AM              │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ [E] Emily Davis         ⏰   │   │
│  │     Data Analyst             │   │
│  │     🏢 Analytics (grayed)    │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Data Structure:**
```typescript
interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  checkInTime: string;
  status: 'checked-in' | 'not-checked-in';
  latitude?: number;
  longitude?: number;
}
```

---

### 2. Employee Map Screen

**Location:** `payroll/screens/EmployeeMapScreen.tsx`

**Purpose:** Display the selected employee's location on an interactive map.

**Features:**
- **Interactive Map:** Google Maps with all employee locations
- **Focused View:** Automatically zooms to selected employee
- **Selected Marker:** Highlighted with larger icon and blue color
- **Employee Info Card:** Shows:
  - Avatar and name
  - Position and department
  - Check-in time
  - GPS coordinates
- **Map Controls:**
  - Zoom in/out
  - Pan to explore
  - My Location button
  - Compass

**UI Layout:**
```
┌──────────────────────────────────────┐
│  ←  Employee Map                ⚪   │
├──────────────────────────────────────┤
│                                      │
│          [Interactive Map]           │
│                                      │
│         📍 Employee Markers          │
│         (Selected one is blue)       │
│                                      │
│         🔵 Manager Location          │
│         (with 500m circle)           │
│                                      │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │  [J] John Doe                │   │
│  │      Software Engineer       │   │
│  │      🏢 Engineering          │   │
│  │                              │   │
│  │  🕐 Check-in: 08:45 AM       │   │
│  │  📍 Location: 3.1395, 101.69 │   │
│  │                              │   │
│  │  ┌──────────────────────┐   │   │
│  │  │   Back to List       │   │   │
│  │  └──────────────────────┘   │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Map Behavior:**
1. On load: Zooms to selected employee (if provided)
2. Tap marker: Zooms to that employee and updates info card
3. Selected marker: Larger, blue color, with shadow
4. Animation: Smooth transition when focusing on employee

---

## 🔧 Technical Implementation

### Navigation Setup

**App.tsx:**
```typescript
<Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
<Stack.Screen name="EmployeeMap" component={EmployeeMapScreen} />
```

**Navigation Flow:**
```typescript
// From Home or Attendance Screen
navigation.navigate('EmployeeList')

// From Employee List to Map
navigation.navigate('EmployeeMap', { 
  selectedEmployee: employee,
  employees: checkedInEmployees,
})
```

### Data Flow

```
┌─────────────────────────────────────┐
│     Employee List Screen             │
│  - Loads all employees               │
│  - Filters by check-in status        │
│  - User taps checked-in employee     │
└──────────────┬──────────────────────┘
               │
               │ Pass via route params:
               │ - selectedEmployee
               │ - employees (array)
               ↓
┌─────────────────────────────────────┐
│     Employee Map Screen              │
│  - Receives employee data            │
│  - Focuses map on selected employee  │
│  - Shows employee info in card       │
└─────────────────────────────────────┘
```

### Route Parameters

**EmployeeMap Route Params:**
```typescript
{
  selectedEmployee: {
    id: string;
    name: string;
    position: string;
    department: string;
    checkInTime: string;
    latitude: number;
    longitude: number;
  },
  employees: Employee[] // All checked-in employees
}
```

---

## 🎨 Design Features

### Employee List Screen
- **Color Scheme:**
  - Checked In: Green (#4CAF50)
  - Not Checked In: Orange (#FF9800)
  - Card Background: White (#FFFFFF)
  - Avatar (Active): Blue (#4285F4)
  - Avatar (Inactive): Gray (#E0E0E0)

- **Status Badges:**
  - Rounded corners (12px)
  - Icon + text combination
  - Light background with colored text
  - 20% opacity for background

- **Employee Cards:**
  - White background with subtle shadow
  - 12px border radius
  - 16px padding
  - Clear hierarchy: Name → Position → Department

### Employee Map Screen
- **Selected Marker:**
  - Larger size (40px vs 36px)
  - Blue color (#4285F4)
  - Thicker border (3px)
  - Drop shadow effect

- **Info Card:**
  - Large avatar (60px)
  - Employee details clearly displayed
  - Location details in gray box
  - "Back to List" button (pink)

---

## 🔐 Security & Access Control

### Manager-Only Access

**Enforced at Multiple Levels:**

1. **UI Level:**
   - Home screen: Employee Map card hidden from employees
   - Attendance screen: Employee Map button hidden from employees

2. **Navigation Level:**
   - Both screens registered in navigation but not directly accessible to employees

3. **Role Check:**
   ```typescript
   const { currentRole } = usePayrollAuth();
   const isManager = currentRole === USER_ROLES.MANAGER;
   
   {isManager && (
     <ServiceCard onPress={() => navigation.navigate('EmployeeList')} />
   )}
   ```

---

## 🚀 Access Points for Managers

### 1. Home Screen
```typescript
<ServiceCard
  title="Employee Map"
  count={5}  // Checked-in employees count
  icon="map-marker-radius"
  color="#00BCD4"
  onPress={() => navigation.navigate('EmployeeList')}
/>
```

### 2. Attendance Screen
```typescript
<TouchableOpacity
  style={styles.mapButton}
  onPress={() => navigation.navigate('EmployeeList')}
>
  <MaterialCommunityIcons name="map-marker-radius" />
  <Text>Employee Map</Text>
</TouchableOpacity>
```

---

## 📊 Integration Points

### Current Integrations
1. ✅ PayrollAuthContext - Role-based access
2. ✅ Navigation Stack - Screen routing
3. ✅ Home Screen - Service card
4. ✅ Attendance Screen - Filter bar button
5. ✅ expo-location - GPS tracking
6. ✅ react-native-maps - Map display

### Future Backend Integration

**API Endpoints Needed:**

```typescript
// Get all employees with check-in status
GET /api/attendance/employees
Response: Employee[]

// Get specific employee location
GET /api/attendance/employee/:id/location
Response: {
  latitude: number,
  longitude: number,
  checkInTime: string,
  address: string
}

// Real-time location updates (WebSocket)
WS /api/attendance/location-updates
Message: {
  employeeId: string,
  latitude: number,
  longitude: number,
  timestamp: string
}
```

**Implementation Example:**
```typescript
// In EmployeeListScreen
const loadEmployees = async () => {
  try {
    const response = await fetch('/api/attendance/employees');
    const data = await response.json();
    setEmployees(data);
  } catch (error) {
    console.error('Failed to load employees:', error);
  }
};
```

---

## 🧪 Testing Checklist

### Employee List Screen
- [ ] Summary cards show correct counts
- [ ] All employees displayed correctly
- [ ] Checked-in employees are clickable
- [ ] Not-checked-in employees are disabled (grayed out)
- [ ] Tapping checked-in employee navigates to map
- [ ] Avatar shows correct initial
- [ ] Status badges show correct color and icon
- [ ] Check-in time displays correctly
- [ ] Back button navigates correctly

### Employee Map Screen
- [ ] Map loads with selected employee location
- [ ] Selected employee marker is highlighted
- [ ] Info card shows correct employee details
- [ ] Tapping other markers updates selection
- [ ] Map zooms to tapped employee
- [ ] "Back to List" button works
- [ ] Manager location shows with circle
- [ ] Map controls work (zoom, pan, compass)

### Navigation Flow
- [ ] Home → Employee List → Employee Map
- [ ] Attendance → Employee List → Employee Map
- [ ] Employee Map → Back → Employee List
- [ ] Employee List → Back → Home/Attendance

### Role-Based Access
- [ ] Manager sees Employee Map card on home
- [ ] Manager sees Employee Map button in attendance
- [ ] Employee does NOT see Employee Map card
- [ ] Employee does NOT see Employee Map button

---

## 📝 Known Issues & Limitations

### Current Limitations

1. **Mock Data Only**
   - Currently uses hardcoded employee data
   - **Solution:** Integrate with backend API

2. **No Real-time Updates**
   - Employee locations don't update live
   - **Solution:** Implement WebSocket for live tracking

3. **No Search/Filter**
   - Cannot search employees by name
   - Cannot filter by department or status
   - **Solution:** Add search bar and filter options

4. **No Location History**
   - Only shows current check-in location
   - **Solution:** Add historical location tracking

5. **No Address Display**
   - Shows coordinates instead of readable address
   - **Solution:** Implement reverse geocoding

---

## 🔮 Future Enhancements

### Phase 1 (Current) ✅
- ✅ Employee list with status
- ✅ Map view with employee locations
- ✅ Focus on selected employee
- ✅ Manager-only access

### Phase 2 (Planned)
- [ ] Backend API integration
- [ ] Real-time location updates via WebSocket
- [ ] Search functionality
- [ ] Department/status filters
- [ ] Pull-to-refresh

### Phase 3 (Future)
- [ ] Reverse geocoding (show addresses)
- [ ] Location history timeline
- [ ] Export employee location reports
- [ ] Multiple date selection
- [ ] Geofencing alerts
- [ ] Distance calculation from office
- [ ] Route tracking for field employees

---

## 📚 File Structure

```
payroll/
├── screens/
│   ├── EmployeeListScreen.tsx         ← New screen (list)
│   ├── EmployeeMapScreen.tsx          ← Updated (map with focus)
│   ├── AttendanceScreen.tsx           ← Updated (map button)
│   └── PayrollHomeScreen.tsx          ← Updated (map card)
├── EMPLOYEE_TRACKING_FLOW.md          ← This file
└── EMPLOYEE_MAP_FEATURE.md            ← Original map documentation
```

---

## 🎓 Developer Notes

### Important Considerations

1. **Employee Privacy:**
   - Only track location during work hours
   - Get employee consent
   - Comply with labor laws and privacy regulations
   - Clear privacy policy

2. **Performance:**
   - Lazy load employee data
   - Use pagination for large employee lists
   - Optimize map rendering
   - Cache employee data locally

3. **User Experience:**
   - Clear status indicators
   - Smooth animations
   - Loading states
   - Error handling
   - Empty states

4. **Testing:**
   - Test with various employee counts (5, 50, 500)
   - Test with different screen sizes
   - Test permission scenarios
   - Test offline behavior

---

## 📞 Troubleshooting

### Common Issues

**Issue:** List shows no employees
- **Solution:** Check if mock data is loaded correctly
- **Solution:** Check API connection (in production)

**Issue:** Can't tap employee card
- **Solution:** Check if employee status is 'checked-in'
- **Solution:** Check if latitude/longitude are provided

**Issue:** Map doesn't focus on employee
- **Solution:** Check if employee coordinates are valid
- **Solution:** Check if mapRef is properly initialized

**Issue:** "Back to List" doesn't work
- **Solution:** Check navigation stack
- **Solution:** Verify goBack() is called correctly

---

**Last Updated:** January 19, 2026
**Version:** 2.0.0
**Status:** ✅ Two-Step Flow Implemented and Ready for Testing
