# Role-Based Leave Screen Implementation

## 📋 Overview

The Leaves feature now has separate screens and functionality based on the user's current role:

- **Employee Role** → **Leave Application** screen (view own leaves) + **Create Leave** button (FAB)
  - **LeavesScreen**: List of own leave requests
  - **CreateLeaveScreen**: Form to submit new leave requests
- **Manager Role** → **Leave Approval** screen (approve/reject leave requests from team)
  - **LeavesScreen**: List of team leave requests with approval buttons
  - NO create button (managers don't submit leaves for approval)

---

## 🎯 Implementation Details

### 1. File Updated: `LeavesScreen.tsx`

#### Changes Made:

**Import PayrollAuth Hook:**
```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';
```

**Get Current Role:**
```typescript
export const LeavesScreen: React.FC<LeavesScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const { currentRole } = usePayrollAuth();  // ⬅️ Get current role
  const [activeTab, setActiveTab] = useState<LeaveStatus>('requested');
  
  // Determine if current user is manager
  const isManager = currentRole === USER_ROLES.MANAGER;
```

**Dynamic Header Title:**
```typescript
<Header
  title={isManager ? "Leave Approval" : "Leave Application"}  // ⬅️ Changes based on role
  onBackPress={() => navigation?.goBack()}
  showBackButton={true}
/>
```

**Role-Based Actions:**
```typescript
<LeaveList
  leaves={leaves}
  onPress={handleViewDetails}
  onApprove={isManager ? handleApprove : undefined}    // ⬅️ Only for Manager
  onReject={isManager ? handleReject : undefined}      // ⬅️ Only for Manager
  onCancel={!isManager ? handleCancel : undefined}     // ⬅️ Only for Employee
  onRestore={isManager ? handleRestore : undefined}    // ⬅️ Only for Manager
/>
```

---

### 2. File Updated: `LeaveCard.tsx`

#### Changes Made:

**More Explicit Role Check:**
```typescript
// Before:
const showActions = leave.status === 'requested';

// After:
const showApproveReject = leave.status === 'requested' && (onApprove || onReject);
```

**Conditional Button Rendering:**
```typescript
{showApproveReject && (
  <View style={styles.actionButtons}>
    {onReject && (  // ⬅️ Only show if callback provided (Manager)
      <TouchableOpacity
        style={styles.rejectButton}
        onPress={() => onReject(leave.id)}
      >
        <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    )}
    {onApprove && (  // ⬅️ Only show if callback provided (Manager)
      <TouchableOpacity
        style={styles.approveButton}
        onPress={() => onApprove(leave.id)}
      >
        <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    )}
  </View>
)}
```

---

## 📊 Visual Flow

### Employee View (Leave Application)

```
┌─────────────────────────────────────────────────────────────┐
│  🔵 EMPLOYEE ROLE                                           │
└─────────────────────────────────────────────────────────────┘

SCREEN 1: LeavesScreen (List View)
┌─────────────────────────────────────────────────────────────┐
│  Header: "Leave Application"                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tabs: [Requested] [Active] [Cancelled]                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Leave List:                                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 My Annual Leave         2 Days Ago                │  │
│  │ 27 Aug- 28 Aug, 2021        [Requested]              │  │
│  │ Annual Leave Request                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 My Sick Leave           5 Days Ago                │  │
│  │ 23 Aug- 24 Aug, 2021        [Active]                 │  │
│  │ Sick Leave Request          [✗ Cancel]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ❌ NO Approve/Reject buttons                               │
│  ✅ CAN Cancel own active leaves                       [+]← FAB│
└─────────────────────────────────────────────────────────────┘
                              ↓ Click FAB

SCREEN 2: CreateLeaveScreen (Form View)
┌─────────────────────────────────────────────────────────────┐
│  ← Create a Leave Plan                                       │
├─────────────────────────────────────────────────────────────┤
│  Leave Type                                                  │
│  [Select Leave Type                                     ▼]   │
│                                                              │
│  Start Date                                                  │
│  [Select Start Date                                    📅]   │
│                                                              │
│  End Date                                                    │
│  [Select End Date                                      📅]   │
│                                                              │
│  ℹ️  Total Leave Days: 3                                     │
│                                                              │
│  Additional Note                                             │
│  [Enter any additional information...              ]        │
│                                                              │
│  [            Submit            ]                            │
└─────────────────────────────────────────────────────────────┘

What Employee Can Do:
- ✅ View own leave requests (LeavesScreen)
- ✅ Create new leave requests (CreateLeaveScreen via FAB)
- ✅ Cancel own active leaves
- ✅ View leave details
- ❌ Cannot approve/reject others' leaves
- ❌ Cannot restore cancelled leaves
```

---

### Manager View (Leave Approval)

```
┌─────────────────────────────────────────────────────────────┐
│  🟠 MANAGER ROLE                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Header: "Leave Approval"                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tabs: [Requested] [Active] [Cancelled]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Leave List:                                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 Alexa Smith             2 Days Ago                │  │
│  │ 27 Aug- 28 Aug, 2021        [✗] [✓]                 │  │
│  │ Leave Application                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 Jack Liam               2 Days Ago                │  │
│  │ 27 Aug- 28 Aug, 2021        [✗] [✓]                 │  │
│  │ Sick Leave Request                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✅ HAS Approve/Reject buttons on requested leaves          │
│  ✅ CAN Restore cancelled leaves                            │
│  ❌ NO Cancel button for active leaves                      │
└─────────────────────────────────────────────────────────────┘

What Manager Can Do:
- ✅ View all team leave requests
- ✅ Approve pending leave requests
- ✅ Reject pending leave requests
- ✅ Restore cancelled leaves
- ✅ View leave details
- ❌ Cannot cancel active leaves (employee action)
```

---

## 🔄 Role Switching Flow

```
User logs in as: Alex Smith (has both Employee & Manager roles)
Default role: Employee

┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Employee View                                       │
└─────────────────────────────────────────────────────────────┘

User on Home Screen → Clicks "Leaves" card
    ↓
LeavesScreen renders
    ↓
const { currentRole } = usePayrollAuth()  ← Returns "Employee"
    ↓
const isManager = currentRole === 'Manager'  ← Returns false
    ↓
Screen shows:
- Header: "Leave Application" ✅
- Approve/Reject buttons: Hidden ❌
- Cancel buttons: Visible ✅

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: User Switches Role                                  │
└─────────────────────────────────────────────────────────────┘

User goes back to Home → Clicks role badge → Switches to "Manager"
    ↓
PayrollAuthContext updates: setUser({ ...user, role: 'Manager' })
    ↓
ALL components using usePayrollAuth() re-render
    ↓
User clicks "Leaves" card again

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Manager View                                        │
└─────────────────────────────────────────────────────────────┘

LeavesScreen renders
    ↓
const { currentRole } = usePayrollAuth()  ← Returns "Manager"
    ↓
const isManager = currentRole === 'Manager'  ← Returns true
    ↓
Screen shows:
- Header: "Leave Approval" ✅
- Approve/Reject buttons: Visible ✅
- Cancel buttons: Hidden ❌
```

---

## 💻 Code Examples

### How LeavesScreen Uses Role

```typescript
// File: payroll/screens/LeavesScreen.tsx

import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

export const LeavesScreen: React.FC = () => {
  const { currentRole } = usePayrollAuth();
  const isManager = currentRole === USER_ROLES.MANAGER;
  
  return (
    <View>
      {/* Dynamic header */}
      <Header title={isManager ? "Leave Approval" : "Leave Application"} />
      
      {/* Pass role-based callbacks */}
      <LeaveList
        leaves={leaves}
        onApprove={isManager ? handleApprove : undefined}
        onReject={isManager ? handleReject : undefined}
        onCancel={!isManager ? handleCancel : undefined}
        onRestore={isManager ? handleRestore : undefined}
      />
    </View>
  );
};
```

### How LeaveCard Respects Role

```typescript
// File: payroll/components/leaves/LeaveCard.tsx

export const LeaveCard: React.FC<LeaveCardProps> = ({
  leave,
  onApprove,
  onReject,
  onCancel,
  onRestore,
}) => {
  // Only show approve/reject if:
  // 1. Leave status is 'requested' AND
  // 2. Callbacks are provided (meaning user is Manager)
  const showApproveReject = leave.status === 'requested' && (onApprove || onReject);
  
  return (
    <View>
      {showApproveReject && (
        <View>
          {onReject && <Button onPress={() => onReject(leave.id)} />}
          {onApprove && <Button onPress={() => onApprove(leave.id)} />}
        </View>
      )}
      
      {/* Show cancel only if callback provided (Employee) */}
      {onCancel && <Button onPress={() => onCancel(leave.id)} />}
      
      {/* Show restore only if callback provided (Manager) */}
      {onRestore && <Button onPress={() => onRestore(leave.id)} />}
    </View>
  );
};
```

---

## 🎯 Permission Matrix

| Action | Employee | Manager | Status Required |
|--------|----------|---------|-----------------|
| **View Leaves** | ✅ Own leaves | ✅ All leaves | Any |
| **Approve** | ❌ | ✅ | Requested |
| **Reject** | ❌ | ✅ | Requested |
| **Cancel** | ✅ Own leaves | ❌ | Active |
| **Restore** | ❌ | ✅ | Cancelled |
| **View Details** | ✅ | ✅ | Any |

---

## 🔧 Technical Implementation

### Data Flow

```
┌────────────────────────────────────────────────────────┐
│  PayrollAuthContext                                     │
│  - State: { user, currentRole }                         │
│  - Currently: "Employee" or "Manager"                   │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│  LeavesScreen                                           │
│  const { currentRole } = usePayrollAuth()               │
│  const isManager = currentRole === 'Manager'            │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│  Props passed to LeaveList                              │
│  - onApprove: isManager ? fn : undefined                │
│  - onReject: isManager ? fn : undefined                 │
│  - onCancel: !isManager ? fn : undefined                │
│  - onRestore: isManager ? fn : undefined                │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│  LeaveCard (each card in list)                          │
│  - Checks if onApprove/onReject provided                │
│  - Shows buttons only if callback exists                │
│  - Result: Role-based UI rendering                      │
└────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing the Implementation

### Test Case 1: Employee Cannot Approve

1. Login as: `employee@test.com` (password: `123456`)
2. Navigate to Leaves screen
3. **Expected:**
   - Header shows "Leave Application"
   - Requested leaves show NO approve/reject buttons
   - Active leaves show cancel button
   - Cancelled leaves show NO restore button

### Test Case 2: Manager Can Approve

1. Login as: `manager@test.com` (password: `123456`)
2. Navigate to Leaves screen
3. **Expected:**
   - Header shows "Leave Approval"
   - Requested leaves show approve/reject buttons
   - Active leaves show NO cancel button
   - Cancelled leaves show restore button

### Test Case 3: Role Switch (Both Roles)

1. Login as: `admin@test.com` (password: `123456`)
2. Navigate to Leaves screen
3. **Expected:** "Leave Application" (default Employee role)
4. Go back → Click role badge → Switch to Manager
5. Navigate to Leaves screen again
6. **Expected:** "Leave Approval" with manager buttons

---

## 📁 Files Modified/Created

```
LetlinkMobileApp/
├── App.tsx                        ← Added CreateLeave route
│
├── payroll/
│   ├── screens/
│   │   ├── LeavesScreen.tsx       ← Added FAB for employees
│   │   ├── CreateLeaveScreen.tsx  ← NEW: Form to create leave
│   │   └── LeaveDetailsScreen.tsx
│   │
│   ├── components/
│   │   └── leaves/
│   │       └── LeaveCard.tsx      ← Updated button visibility logic
│   │
│   └── context/
│       └── PayrollAuthContext.tsx ← Provides currentRole (no changes needed)
│
└── Docs/
    ├── ROLE_BASED_LEAVE_SCREEN.md       ← This file
    └── CREATE_LEAVE_REQUEST_GUIDE.md    ← NEW: Complete guide for CreateLeave
```

---

## 🎓 Key Takeaways

1. **Single Screen, Dual Purpose:**
   - One `LeavesScreen` component
   - Renders differently based on `currentRole`
   - No need for separate Employee/Manager screens

2. **Callback-Based Permissions:**
   - Pass `undefined` to disable features
   - Components check if callback exists before showing buttons
   - Clean, declarative permission model

3. **Context-Driven:**
   - Role comes from `PayrollAuthContext`
   - Automatic re-rendering on role switch
   - No prop drilling needed

4. **Scalable Pattern:**
   - Same pattern can be applied to:
     - Requests screen
     - Payslips screen
     - Attendance screen
   - Consistent implementation across features

---

## 🚀 Next Steps

Apply the same pattern to other screens:

1. **RequestsScreen** - Same implementation
2. **PayslipsScreen** - Same implementation
3. **AttendanceScreen** - Same implementation

Pattern:
```typescript
const { currentRole } = usePayrollAuth();
const isManager = currentRole === USER_ROLES.MANAGER;

<Header title={isManager ? "X Approval" : "X Application"} />
<XList
  onApprove={isManager ? handleApprove : undefined}
  onReject={isManager ? handleReject : undefined}
  onCancel={!isManager ? handleCancel : undefined}
/>
```

---

## ✅ Summary

**Before:** Leaves screen showed same content to all users

**After:** 
- **Employee** sees "Leave Application" with cancel button
- **Manager** sees "Leave Approval" with approve/reject/restore buttons
- Role switching instantly updates the UI
- Clean, maintainable, scalable implementation

🎉 **Role-based Leave Screen Complete!**
