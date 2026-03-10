# Leave Feature - Final Architecture (Separate Workflows)

## 🎯 New Architecture Overview

**Two completely separate workflows based on role:**

### ✅ **Employee Workflow:**
```
Home Screen → "Leave Application" Card (Purple) → CreateLeaveScreen (Form)
```

### ✅ **Manager Workflow:**
```
Home Screen → "Leave Approval" Card (Red) → LeavesScreen (Approval List)
```

---

## 🔄 What Changed

### BEFORE (Old Architecture):
```
Both roles:
Home → "Leaves" Card → LeavesScreen (role-based rendering)
                         ├─ Employee: Shows FAB, own leaves
                         └─ Manager: Shows approve buttons, all leaves
```

### AFTER (New Architecture):
```
Employee:
Home → "Leave Application" Card → CreateLeaveScreen (Form directly)

Manager:
Home → "Leave Approval" Card → LeavesScreen (Approval list only)
```

---

## 📱 Screen Flow Diagrams

### EMPLOYEE FLOW (Direct to Form)

```
┌─────────────────────────────────────────────────────────┐
│              HOME SCREEN (Employee Role)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Services:                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Requests │  │  Leave   │  │ Pay Slip │        │ │
│  │  │          │  │Application│  │          │        │ │
│  │  │  Green   │  │  Purple  │  │  Orange  │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  │                      ↑                             │ │
│  │                  Click this                        │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Directly navigates to form
                         ▼
┌─────────────────────────────────────────────────────────┐
│         CREATE LEAVE SCREEN (Form)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ← Create a Leave Plan                             │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  Leave Type:  [Annual Leave            ▼]         │ │
│  │  Start Date:  [20/01/2026             📅]         │ │
│  │  End Date:    [22/01/2026             📅]         │ │
│  │  ℹ️  Total Leave Days: 3                           │ │
│  │  Note:        [Enter notes...         ]           │ │
│  │  [           Submit           ]                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### MANAGER FLOW (Approval List)

```
┌─────────────────────────────────────────────────────────┐
│              HOME SCREEN (Manager Role)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Services:                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Requests │  │  Leave   │  │ Pay Slip │        │ │
│  │  │          │  │ Approval │  │          │        │ │
│  │  │  Green   │  │   Red    │  │  Orange  │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  │                      ↑                             │ │
│  │                  Click this                        │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Navigates to approval list
                         ▼
┌─────────────────────────────────────────────────────────┐
│         LEAVES SCREEN (Approval List)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ← Leave Approval                                  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  [Requested] [Active] [Cancelled]                  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  👤 John Smith    [✗] [✓]                         │ │
│  │  👤 Sarah Lee     [✗] [✓]                         │ │
│  │  👤 Mike Jones    [✗] [✓]                         │ │
│  │                                                    │ │
│  │  NO FAB button                                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Home Screen Cards Comparison

### Employee View:
```
┌───────────────────────────────────────────────────────┐
│  Please Choose Services                                │
├───────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐       │
│  │          │  │              │  │          │       │
│  │ Requests │  │    Leave     │  │ Pay Slip │       │
│  │   100    │  │ Application  │  │    15    │       │
│  │          │  │      5       │  │          │       │
│  │  📧 🟢  │  │   📅+ 🟣    │  │  📄 🟠  │       │
│  │          │  │              │  │          │       │
│  └──────────┘  └──────────────┘  └──────────┘       │
│     Green         Purple            Orange           │
└───────────────────────────────────────────────────────┘
```

### Manager View:
```
┌───────────────────────────────────────────────────────┐
│  Please Choose Services                                │
├───────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐       │
│  │          │  │              │  │          │       │
│  │ Requests │  │    Leave     │  │ Pay Slip │       │
│  │   100    │  │   Approval   │  │    15    │       │
│  │          │  │      12      │  │          │       │
│  │  📧 🟢  │  │   📅⏰ 🔴   │  │  📄 🟠  │       │
│  │          │  │              │  │          │       │
│  └──────────┘  └──────────────┘  └──────────┘       │
│     Green          Red             Orange            │
└───────────────────────────────────────────────────────┘
```

---

## 📋 Code Implementation

### 1. PayrollHomeScreen.tsx (Role-Based Cards)

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

export const PayrollHomeScreen: React.FC = ({ navigation }) => {
  const { user, currentRole } = usePayrollAuth();
  const isManager = currentRole === USER_ROLES.MANAGER;

  return (
    <View>
      {/* Services Section */}
      <ScrollView horizontal>
        <ServiceCard
          title="Requests"
          icon="email-outline"
          color="#4CAF50"
        />
        
        {/* Role-Based Leave Cards */}
        {isManager ? (
          // Manager: Leave Approval Card (Red) → LeavesScreen
          <ServiceCard
            title="Leave Approval"
            count={12}
            icon="calendar-clock"
            color="#FF5722"
            onPress={() => navigation?.navigate('Leaves')}
          />
        ) : (
          // Employee: Leave Application Card (Purple) → CreateLeaveScreen
          <ServiceCard
            title="Leave Application"
            count={5}
            icon="calendar-plus"
            color="#9C27B0"
            onPress={() => navigation?.navigate('CreateLeave')}
          />
        )}
        
        <ServiceCard
          title="Pay Slip"
          icon="file-document-outline"
          color="#FFB300"
        />
      </ScrollView>
    </View>
  );
};
```

### 2. LeavesScreen.tsx (Manager-Only Now)

```typescript
// BEFORE: Had role checking and FAB
import { usePayrollAuth } from '../context/PayrollAuthContext';
const { currentRole } = usePayrollAuth();
const isManager = currentRole === USER_ROLES.MANAGER;

// AFTER: No role checking needed - Manager only screen
export const LeavesScreen: React.FC = ({ navigation }) => {
  return (
    <View>
      <Header title="Leave Approval" />  {/* Fixed title */}
      
      <LeaveList
        onApprove={handleApprove}  {/* Always available */}
        onReject={handleReject}    {/* Always available */}
        onRestore={handleRestore}  {/* Always available */}
      />
      
      {/* NO FAB - Removed completely */}
    </View>
  );
};
```

### 3. CreateLeaveScreen.tsx (Employee Entry Point)

```typescript
// No changes needed - already exists as standalone screen
export const CreateLeaveScreen: React.FC = ({ navigation }) => {
  return (
    <View>
      <Header title="Create a Leave Plan" />
      
      {/* Form fields */}
      <LeaveTypeDropdown />
      <DatePickers />
      <SubmitButton />
    </View>
  );
};
```

---

## 🎯 Role-Based Access Matrix

| Screen | Employee Access | Manager Access | How Accessed |
|--------|----------------|----------------|--------------|
| **CreateLeaveScreen** | ✅ Yes | ❌ No | Employee: Home → "Leave Application" card |
| **LeavesScreen** | ❌ No | ✅ Yes | Manager: Home → "Leave Approval" card |
| **LeaveDetailsScreen** | ✅ Yes* | ✅ Yes | Both: Click on leave card |

*Employee can see details if they navigate from somewhere, but no direct access from home

---

## 🔄 Complete User Journeys

### Employee Journey: Submit Leave

```
STEP 1: Login as Employee
┌─────────────────────────────┐
│  Login Screen               │
│  email: employee@test.com   │
│  password: 123456           │
│  [Login]                    │
└─────────────┬───────────────┘
              ▼
STEP 2: Home Screen Loads
┌─────────────────────────────┐
│  Home Screen                │
│  Role Badge: "Employee"     │
│  Services:                  │
│  - Requests (Green)         │
│  - Leave Application (Purple)│ ← Click
│  - Pay Slip (Orange)        │
└─────────────┬───────────────┘
              ▼
STEP 3: Opens Create Leave Form Directly
┌─────────────────────────────┐
│  Create a Leave Plan        │
│  [Select Leave Type]        │
│  [Pick Start Date]          │
│  [Pick End Date]            │
│  Days: Auto-calculated      │
│  [Submit]                   │
└─────────────┬───────────────┘
              ▼
STEP 4: Form Submitted
┌─────────────────────────────┐
│  ✅ Success Alert           │
│  "Leave request submitted!" │
│  [OK]                       │
└─────────────┬───────────────┘
              ▼
STEP 5: Back to Home
┌─────────────────────────────┐
│  Home Screen                │
│  Leave count updated        │
└─────────────────────────────┘
```

### Manager Journey: Approve Leave

```
STEP 1: Login as Manager
┌─────────────────────────────┐
│  Login Screen               │
│  email: manager@test.com    │
│  password: 123456           │
│  [Login]                    │
└─────────────┬───────────────┘
              ▼
STEP 2: Home Screen Loads
┌─────────────────────────────┐
│  Home Screen                │
│  Role Badge: "Manager"      │
│  Services:                  │
│  - Requests (Green)         │
│  - Leave Approval (Red)     │ ← Click
│  - Pay Slip (Orange)        │
└─────────────┬───────────────┘
              ▼
STEP 3: Opens Approval List
┌─────────────────────────────┐
│  Leave Approval             │
│  [Requested] [Active] [...]  │
│  👤 John [✗] [✓]           │ ← Click ✓
│  👤 Sarah [✗] [✓]          │
└─────────────┬───────────────┘
              ▼
STEP 4: Leave Approved
┌─────────────────────────────┐
│  Leave status → Active      │
│  List refreshes             │
└─────────────────────────────┘
```

---

## 📊 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    PayrollAuthContext                         │
│              currentRole: "Employee" | "Manager"              │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  Employee Role   │            │   Manager Role   │
└──────────────────┘            └──────────────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  Home Screen     │            │  Home Screen     │
│  - Green Card    │            │  - Green Card    │
│  - Purple Card   │            │  - Red Card      │
│  - Orange Card   │            │  - Orange Card   │
└──────────────────┘            └──────────────────┘
         │                               │
         │ Click Purple                  │ Click Red
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ CreateLeaveScreen│            │  LeavesScreen    │
│                  │            │                  │
│ [Form to submit] │            │ [List to approve]│
│                  │            │                  │
│ - Leave Type     │            │ - Requested      │
│ - Dates          │            │ - Active         │
│ - Note           │            │ - Cancelled      │
│ - Submit         │            │ - Approve/Reject │
└──────────────────┘            └──────────────────┘
         │                               │
         │ Submit                        │ Approve/Reject
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  Success Alert   │            │  Status Updated  │
│  → Back to Home  │            │  → List Refresh  │
└──────────────────┘            └──────────────────┘
```

---

## 🎨 Visual Design Specs

### Card Colors by Role

| Role | Card Title | Icon | Color Code | RGB |
|------|-----------|------|------------|-----|
| **Employee** | "Leave Application" | `calendar-plus` | `#9C27B0` | Purple |
| **Manager** | "Leave Approval" | `calendar-clock` | `#FF5722` | Red/Orange |

### Why These Colors?

- **Purple (#9C27B0)**: Calming, creative - suitable for employees planning leaves
- **Red (#FF5722)**: Action, urgency - suitable for managers reviewing approvals
- **Different Icons**:
  - `calendar-plus`: Indicates "create new"
  - `calendar-clock`: Indicates "time-sensitive review"

---

## ✅ What Got Removed

### From LeavesScreen.tsx:

```typescript
// ❌ REMOVED: Role checking
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';
const { currentRole } = usePayrollAuth();
const isManager = currentRole === USER_ROLES.MANAGER;

// ❌ REMOVED: Dynamic title
title={isManager ? "Leave Approval" : "Leave Application"}

// ❌ REMOVED: Conditional callbacks
onApprove={isManager ? handleApprove : undefined}
onReject={isManager ? handleReject : undefined}
onCancel={!isManager ? handleCancel : undefined}

// ❌ REMOVED: FAB button
{!isManager && (
  <TouchableOpacity style={styles.fab}>
    <MaterialCommunityIcons name="plus" />
  </TouchableOpacity>
)}

// ❌ REMOVED: FAB styles
fab: {
  position: 'absolute',
  bottom: 100,
  ...
}
```

### Result: Cleaner Code

```typescript
// ✅ NEW: Simple, focused screen
export const LeavesScreen: React.FC = ({ navigation }) => {
  return (
    <View>
      <Header title="Leave Approval" />  {/* Fixed */}
      <LeaveList
        onApprove={handleApprove}        {/* Always */}
        onReject={handleReject}          {/* Always */}
        onRestore={handleRestore}        {/* Always */}
      />
    </View>
  );
};
```

---

## 🧪 Testing Checklist

### Test Employee Access

- [ ] Login as `employee@test.com`
- [ ] Verify role badge: "Employee"
- [ ] Verify service cards:
  - [ ] "Requests" (Green) ✅
  - [ ] "Leave Application" (Purple) ✅
  - [ ] "Pay Slip" (Orange) ✅
  - [ ] NO "Leave Approval" ❌
- [ ] Click "Leave Application" card
- [ ] Verify: Opens CreateLeaveScreen directly ✅
- [ ] Fill and submit form
- [ ] Verify: Success message ✅

### Test Manager Access

- [ ] Login as `manager@test.com`
- [ ] Verify role badge: "Manager"
- [ ] Verify service cards:
  - [ ] "Requests" (Green) ✅
  - [ ] "Leave Approval" (Red) ✅
  - [ ] "Pay Slip" (Orange) ✅
  - [ ] NO "Leave Application" ❌
- [ ] Click "Leave Approval" card
- [ ] Verify: Opens LeavesScreen (approval list) ✅
- [ ] Verify: Approve/Reject buttons visible ✅
- [ ] Verify: NO FAB button ✅
- [ ] Click approve on a leave
- [ ] Verify: Status updates ✅

### Test Role Switching

- [ ] Login as `admin@test.com` (both roles)
- [ ] Default role: "Employee"
- [ ] Verify: "Leave Application" card visible (Purple)
- [ ] Switch to "Manager" role
- [ ] Verify: Card changes to "Leave Approval" (Red)
- [ ] Click card → Opens LeavesScreen
- [ ] Switch back to "Employee"
- [ ] Verify: Card changes back to "Leave Application" (Purple)
- [ ] Click card → Opens CreateLeaveScreen

---

## 📁 Files Modified Summary

```
✅ MODIFIED (2 files):
   ├─ PayrollHomeScreen.tsx
   │   ├─ Added: Role-based card rendering
   │   ├─ Added: isManager check
   │   └─ Added: Conditional cards
   │
   └─ LeavesScreen.tsx
       ├─ Removed: Role checking imports
       ├─ Removed: Dynamic title
       ├─ Removed: Conditional callbacks
       ├─ Removed: FAB button
       └─ Removed: FAB styles

📄 NO NEW FILES CREATED
   (CreateLeaveScreen already existed)

📝 DOCS CREATED:
   └─ LEAVE_FEATURE_FINAL_ARCHITECTURE.md (this file)
```

---

## 🎯 Benefits of New Architecture

### 1. **Clearer User Intent**
- Employee sees "Leave Application" → Knows they'll create a leave
- Manager sees "Leave Approval" → Knows they'll review leaves

### 2. **Simpler Code**
- LeavesScreen no longer needs role checking
- No conditional rendering within screens
- Easier to maintain

### 3. **Better UX**
- Employee gets to form faster (no list screen)
- Manager gets to approvals faster (no FAB confusion)
- Less cognitive load

### 4. **Scalability**
- Easy to add employee-specific features to CreateLeaveScreen
- Easy to add manager-specific features to LeavesScreen
- No cross-role concerns

---

## 🚀 Future Enhancements

### For Employee (CreateLeaveScreen):

```typescript
// Show leave balance
const { annualLeave, sickLeave } = await getLeaveBalance();
<Text>Available: {annualLeave} days</Text>

// Pre-fill leave type from params
navigation.navigate('CreateLeave', { type: 'Annual Leave' });

// Quick action buttons
<Button title="Take Today Off" onPress={quickLeave} />
```

### For Manager (LeavesScreen):

```typescript
// Bulk approve
<Button title="Approve All" onPress={approveMultiple} />

// Filter by team member
<Dropdown options={teamMembers} />

// Manager comments
<TextInput placeholder="Add approval comment..." />
```

---

## ✅ Summary

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Employee Path** | Home → Leaves (list with FAB) | Home → CreateLeave (direct form) |
| **Manager Path** | Home → Leaves (list with buttons) | Home → Leaves (same) |
| **Home Card (Employee)** | "Leaves" | "Leave Application" (Purple) |
| **Home Card (Manager)** | "Leaves" | "Leave Approval" (Red) |
| **LeavesScreen** | Role-based rendering | Manager-only, no role logic |
| **FAB Button** | On LeavesScreen for employees | Removed completely |

### Result

✅ **Employee**: Faster access to create leaves  
✅ **Manager**: Cleaner approval interface  
✅ **Code**: Simpler, more maintainable  
✅ **UX**: More intuitive for both roles

---

## 🎉 Implementation Complete!

**The leave feature now has completely separate workflows for each role, making it more intuitive and easier to use! 🚀**
