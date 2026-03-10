# Home Screen - Role-Based Visibility

## 🎯 Overview

The PayrollHomeScreen now has role-based sections that show different content to employees and managers.

---

## 📱 Complete Home Screen Layout

### EMPLOYEE VIEW

```
┌──────────────────────────────────────────────────────────┐
│  Hi John, Good Morning!                                  │
│  Role: [Employee ▼]                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📋 Please Choose Services                               │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │   Request    │    Leave     │  My Payslip  │         │
│  │ Application  │ Application  │              │         │
│  │   🔵 Blue    │  🟣 Purple  │  🟠 Orange   │       │
│  └──────────────┴──────────────┴──────────────┘         │
│  ┌──────────────┐                                        │
│  │  Attendance  │                                        │
│  │   🔵 Blue    │                                        │
│  └──────────────┘                                        │
│                                                           │
│  ❌ Recent Leave Application - NOT VISIBLE               │
│                                                           │
│  📊 Today's Attendance                                    │
│  ┌────────┬────────┬────────┐                           │
│  │ Present│  Late  │ Absent │                           │
│  │   54   │   15   │   20   │                           │
│  └────────┴────────┴────────┘                           │
└──────────────────────────────────────────────────────────┘
```

### MANAGER VIEW

```
┌──────────────────────────────────────────────────────────┐
│  Hi Sarah, Good Morning!                                  │
│  Role: [Manager ▼]                                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📋 Please Choose Services                                │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │   Request    │    Leave     │   Payslip    │         │
│  │   Approval   │   Approval   │  Management  │         │
│  │  🟢 Green    │   🔴 Red     │  🟠 Orange   │         │
│  └──────────────┴──────────────┴──────────────┘         │
│  ┌──────────────┐                                        │
│  │  Attendance  │                                        │
│  │   🔵 Blue    │                                        │
│  └──────────────┘                                        │
│                                                           │
│  ✅ Recent Leave Application                             │
│  ┌────────────────────────────────────────┐  [See All]← │
│  │ 👤 Alexa Smith                         │             │
│  │ 27 Aug - 28 Aug, 2021                  │             │
│  │ Sick Leave Request                     │             │
│  └────────────────────────────────────────┘             │
│  ┌────────────────────────────────────────┐             │
│  │ 👤 Jack Liam                           │             │
│  │ 25 Aug - 26 Aug, 2021                  │             │
│  │ Annual Leave Request                   │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  📊 Today's Attendance                                    │
│  ┌────────┬────────┬────────┐                           │
│  │ Present│  Late  │ Absent │                           │
│  │   54   │   15   │   20   │                           │
│  └────────┴────────┴────────┘                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 What Changed

### Recent Leave Application Section

**BEFORE:**
- Visible to all users (both employees and managers)
- "See All" button had no action

**AFTER:**
- ✅ Visible **only to managers**
- ✅ "See All" button navigates to **LeavesScreen** (approval list)
- ✅ Shows 2 recent leave applications

---

## 💻 Code Implementation

```typescript
// File: payroll/screens/PayrollHomeScreen.tsx

export const PayrollHomeScreen: React.FC = ({ navigation }) => {
  const { user, currentRole } = usePayrollAuth();
  const isManager = currentRole === USER_ROLES.MANAGER;

  return (
    <View>
      {/* Service Cards - Role-based as before */}
      <ScrollView horizontal>
        {/* ... service cards ... */}
      </ScrollView>

      {/* Recent Leave Application Section - Manager Only */}
      {isManager && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Leave Application</Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Leaves')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <LeaveApplicationCard
            name="Alexa Smith"
            date="27 Aug - 28 Aug, 2021"
            type="Sick Leave Request"
          />
          <LeaveApplicationCard
            name="Jack Liam"
            date="25 Aug - 26 Aug, 2021"
            type="Annual Leave Request"
          />
        </View>
      )}

      {/* Today's Attendance Section - Visible to all */}
      <View style={styles.section}>
        {/* ... attendance cards ... */}
      </View>
    </View>
  );
};
```

---

## 📊 Visibility Matrix

| Section | Employee | Manager | Notes |
|---------|----------|---------|-------|
| **Service Cards** | ✅ Application cards | ✅ Approval cards | Role-specific cards |
| **Recent Leave Application** | ❌ Hidden | ✅ Visible | Manager-only section |
| **See All Button** | N/A | ✅ → LeavesScreen | Navigates to approval list |
| **Today's Attendance** | ✅ Visible | ✅ Visible | Both roles can see |

---

## 🎯 User Flows

### Manager Flow: View Recent Leaves

```
MANAGER HOME SCREEN
    ↓
See "Recent Leave Application" section
    ├─ See 2 recent leave cards
    └─ See "See All" button
        ↓ Click "See All"
LEAVES SCREEN (Approval)
    ├─ Shows all pending leave requests
    ├─ Can approve/reject
    └─ Can see all tabs (Requested, Active, Cancelled)
```

### Employee Flow: No Recent Leaves Section

```
EMPLOYEE HOME SCREEN
    ↓
"Recent Leave Application" section NOT visible
    ├─ Only see service cards
    └─ See Today's Attendance
```

---

## 🧪 Testing Checklist

### Test Manager View

- [ ] Login as `manager@test.com`
- [ ] Verify "Recent Leave Application" section visible ✅
- [ ] Verify 2 leave application cards shown ✅
- [ ] Verify "See All" button visible ✅
- [ ] Click "See All" button
- [ ] Verify: Navigates to LeavesScreen ✅
- [ ] Verify: Shows "Leave Approval" header ✅
- [ ] Verify: Shows all leave requests ✅

### Test Employee View

- [ ] Login as `employee@test.com`
- [ ] Verify "Recent Leave Application" section NOT visible ❌
- [ ] Verify: Service cards visible ✅
- [ ] Verify: Today's Attendance visible ✅
- [ ] Verify: Clean layout without leave section ✅

### Test Role Switching

- [ ] Login as `admin@test.com` (both roles)
- [ ] Default role: "Employee"
- [ ] Verify: NO "Recent Leave Application" section ❌
- [ ] Switch to "Manager" role
- [ ] Verify: "Recent Leave Application" section appears ✅
- [ ] Click "See All"
- [ ] Verify: Opens LeavesScreen ✅
- [ ] Go back, switch to "Employee"
- [ ] Verify: Section disappears again ❌

---

## 📱 Visual Comparison

### Employee Home (No Recent Leaves)

```
┌────────────────────────────────────┐
│  Services                           │
│  [Request] [Leave] [Payslip]       │
│  [Attendance]                       │
│                                     │
│  ← No Recent Leave Section          │
│                                     │
│  Today's Attendance                 │
│  [Present] [Late] [Absent]         │
└────────────────────────────────────┘
```

### Manager Home (With Recent Leaves)

```
┌────────────────────────────────────┐
│  Services                           │
│  [Request] [Leave] [Payslip]       │
│  [Attendance]                       │
│                                     │
│  Recent Leave Application [See All]│ ← Manager-only section
│  ┌──────────────────────────────┐  │
│  │ Alexa Smith - Sick Leave     │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Jack Liam - Annual Leave     │  │
│  └──────────────────────────────┘  │
│                                     │
│  Today's Attendance                 │
│  [Present] [Late] [Absent]         │
└────────────────────────────────────┘
```

---

## 🎯 Benefits

### 1. **Relevant Information**
- Managers see pending leaves that need attention
- Employees don't see irrelevant information

### 2. **Quick Access**
- Managers can quickly see recent leave requests
- One tap to see all leaves ("See All" button)

### 3. **Clean UX**
- Employee home screen is cleaner
- No clutter from team-level information

### 4. **Consistent Pattern**
- Follows role-based visibility pattern
- Managers see more team-level data

---

## 🔧 Technical Details

### Conditional Rendering

```typescript
// Only render if user is manager
{isManager && (
  <View>
    {/* Recent Leave Application content */}
  </View>
)}
```

### Navigation Handler

```typescript
// "See All" button action
<TouchableOpacity onPress={() => navigation?.navigate('Leaves')}>
  <Text style={styles.seeAll}>See All</Text>
</TouchableOpacity>
```

### Multiple Cards

```typescript
// Show 2 recent leave applications
<LeaveApplicationCard
  name="Alexa Smith"
  date="27 Aug - 28 Aug, 2021"
  type="Sick Leave Request"
/>
<LeaveApplicationCard
  name="Jack Liam"
  date="25 Aug - 26 Aug, 2021"
  type="Annual Leave Request"
/>
```

---

## 🚀 Future Enhancements

### Dynamic Recent Leaves

```typescript
// TODO: Fetch real recent leaves from API
const [recentLeaves, setRecentLeaves] = useState([]);

useEffect(() => {
  if (isManager) {
    fetchRecentLeaves().then(setRecentLeaves);
  }
}, [isManager]);

// Render dynamic cards
{recentLeaves.slice(0, 2).map(leave => (
  <LeaveApplicationCard key={leave.id} {...leave} />
))}
```

### Make Cards Clickable

```typescript
<LeaveApplicationCard
  name="Alexa Smith"
  date="27 Aug - 28 Aug, 2021"
  type="Sick Leave Request"
  onPress={() => navigation.navigate('LeaveDetails', { leaveId: '123' })}
/>
```

### Add Loading State

```typescript
{isManager && (
  <View style={styles.section}>
    {loading ? (
      <ActivityIndicator size="small" color="#4285F4" />
    ) : (
      <>
        <View style={styles.sectionHeader}>
          <Text>Recent Leave Application</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Leaves')}>
            <Text>See All</Text>
          </TouchableOpacity>
        </View>
        {/* Cards */}
      </>
    )}
  </View>
)}
```

---

## ✅ Summary

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Recent Leave Visibility** | All users | Manager only ✅ |
| **See All Button** | No action | Navigates to LeavesScreen ✅ |
| **Leave Cards Shown** | 1 card | 2 cards ✅ |
| **Employee Home** | Had leave section | Cleaner (no leave section) ✅ |
| **Manager Home** | Had leave section | Has actionable leave section ✅ |

### Result

✅ **Manager**: See recent leaves + quick access to all  
✅ **Employee**: Cleaner home screen without team data  
✅ **Navigation**: "See All" button works correctly  
✅ **UX**: More relevant information per role

---

## 🎉 Implementation Complete!

**The Recent Leave Application section is now manager-only with a functional "See All" button that navigates to the Leave Approval screen! 🚀**
