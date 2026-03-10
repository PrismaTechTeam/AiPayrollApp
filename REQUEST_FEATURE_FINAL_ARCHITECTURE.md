# Request Feature - Final Architecture (Separate Workflows)

## 🎯 Architecture Overview

**Two completely separate workflows based on role (same pattern as Leave feature):**

### ✅ **Employee Workflow:**
```
Home Screen → "Request Application" Card (Blue 🔵) → CreateRequestScreen (Form)
```

### ✅ **Manager Workflow:**
```
Home Screen → "Request Approval" Card (Green 🟢) → RequestsScreen (Approval List)
```

---

## 🔄 What Changed

### BEFORE (Old Architecture):
```
Both roles:
Home → "Requests" Card → RequestsScreen
```

### AFTER (New Architecture):
```
Employee:
Home → "Request Application" Card (Blue) → CreateRequestScreen (Form directly)

Manager:
Home → "Request Approval" Card (Green) → RequestsScreen (Approval list only)
```

---

## 📱 Screen Flow Diagrams

### EMPLOYEE FLOW (Direct to Form)

```
┌─────────────────────────────────────────────────────────┐
│              HOME SCREEN (Employee Role)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Services:                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │ Request  │  │  Leave   │  │ Pay Slip │          │ │
│  │  │Application│ │Application│ │          │          │ │
│  │  │   Blue   │  │  Purple  │  │  Orange  │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘          │ │
│  │       ↑                                            │ │
│  │   Click this                                       │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Directly navigates to form
                         ▼
┌─────────────────────────────────────────────────────────┐
│         CREATE REQUEST SCREEN (Form)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ← Requested                                       │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  Request Type:  [Document Request      ▼]          │ │
│  │  Start Date:    [20/01/2026          📅]          │  │
│  │  Note:          [Enter details...     ]            │ │
│  │                                                    │ │
│  │  [           Submit           ]                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### MANAGER FLOW (Approval List)

```
┌─────────────────────────────────────────────────────────┐
│              HOME SCREEN (Manager Role)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Services:                                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │ Request  │  │  Leave   │  │ Pay Slip │          │ │
│  │  │ Approval │  │ Approval │  │          │          │ │
│  │  │  Green   │  │   Red    │  │  Orange  │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘          │ │
│  │       ↑                                            │ │
│  │   Click this                                       │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Navigates to approval list
                         ▼
┌─────────────────────────────────────────────────────────┐
│         REQUEST APPROVAL (List Screen)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ← Request Approval                                │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  [Requested] [Active] [Cancelled]                  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  👤 John Smith    [✗] [✓]                         │ │
│  │  👤 Sarah Lee     [✗] [✓]                         │ │
│  │  👤 Mike Jones    [✗] [✓]                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Home Screen Cards Comparison

### Employee View:
```
┌───────────────────────────────────────────────────────┐
│  Please Choose Services                               │
├───────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │              │  │              │  │          │   │
│  │   Request    │  │    Leave     │  │ Pay Slip │   │
│  │ Application  │  │ Application  │  │    15    │   │
│  │      8       │  │      5       │  │          │   │
│  │   📧+ 🔵    │  │   📅+ 🟣    │  │  📄 🟠  │   │
│  │              │  │              │  │          │   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
│      Blue             Purple            Orange       │
└───────────────────────────────────────────────────────┘
```

### Manager View:
```
┌───────────────────────────────────────────────────────┐
│  Please Choose Services                                │
├───────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │              │  │              │  │          │   │
│  │   Request    │  │    Leave     │  │ Pay Slip │   │
│  │   Approval   │  │   Approval   │  │    15    │   │
│  │     100      │  │      12      │  │          │   │
│  │   📧 🟢     │  │   📅⏰ 🔴   │  │  📄 🟠  │   │
│  │              │  │              │  │          │   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
│      Green             Red              Orange       │
└───────────────────────────────────────────────────────┘
```

---

## 📋 Code Implementation

### 1. PayrollHomeScreen.tsx (Role-Based Cards)

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

export const PayrollHomeScreen: React.FC = ({ navigation }) => {
  const { currentRole } = usePayrollAuth();
  const isManager = currentRole === USER_ROLES.MANAGER;

  return (
    <View>
      {/* Services Section */}
      <ScrollView horizontal>
        
        {/* Role-Based Request Cards */}
        {isManager ? (
          // Manager: Request Approval Card (Green) → RequestsScreen
          <ServiceCard
            title="Request Approval"
            count={100}
            icon="email-outline"
            color="#4CAF50"
            onPress={() => navigation?.navigate('Requests')}
          />
        ) : (
          // Employee: Request Application Card (Blue) → CreateRequestScreen
          <ServiceCard
            title="Request Application"
            count={8}
            icon="email-plus-outline"
            color="#2196F3"
            onPress={() => navigation?.navigate('CreateRequest')}
          />
        )}
        
        {/* Role-Based Leave Cards */}
        {isManager ? (
          <ServiceCard
            title="Leave Approval"
            icon="calendar-clock"
            color="#FF5722"
            onPress={() => navigation?.navigate('Leaves')}
          />
        ) : (
          <ServiceCard
            title="Leave Application"
            icon="calendar-plus"
            color="#9C27B0"
            onPress={() => navigation?.navigate('CreateLeave')}
          />
        )}
      </ScrollView>
    </View>
  );
};
```

### 2. RequestsScreen.tsx (Manager-Only)

```typescript
// Manager-only screen - No role checking needed
export const RequestsScreen: React.FC = ({ navigation }) => {
  return (
    <View>
      <Header title="Request Approval" />  {/* Fixed title */}
      
      <RequestList
        onApprove={handleApprove}  {/* Always available */}
        onReject={handleReject}    {/* Always available */}
        onRestore={handleRestore}  {/* Always available */}
        onCancel={undefined}       {/* Not available for managers */}
      />
    </View>
  );
};
```

### 3. CreateRequestScreen.tsx (Employee Entry Point)

```typescript
// New form screen for employees
export const CreateRequestScreen: React.FC = ({ navigation }) => {
  const REQUEST_TYPES = [
    'Document Request',
    'Salary Advance',
    'Equipment Request',
    'Work From Home',
    'Travel Request',
    'Other',
  ];

  return (
    <View>
      <Header title="Requested" />
      
      {/* Form fields */}
      <RequestTypeDropdown />
      <StartDatePicker />
      <NotesTextArea />
      <SubmitButton />
    </View>
  );
};
```

---

## 🎯 Card Specifications

| Role | Card Title | Icon | Color | Color Code | Navigation |
|------|-----------|------|-------|------------|------------|
| **Employee** | Request Application | 📧+ `email-plus-outline` | 🔵 Blue | `#2196F3` | → CreateRequestScreen |
| **Manager** | Request Approval | 📧 `email-outline` | 🟢 Green | `#4CAF50` | → RequestsScreen |

---

## 🔄 Complete User Journeys

### Employee Journey: Submit Request

```
STEP 1: Login as Employee
┌─────────────────────────────┐
│  Login Screen               │
│  email: employee@test.com   │
│  [Login]                    │
└─────────────┬───────────────┘
              ▼
STEP 2: Home Screen Loads
┌─────────────────────────────┐
│  Home Screen                │
│  Role Badge: "Employee"     │
│  Services:                  │
│  - Request Application (Blue)│ ← Click
│  - Leave Application (Purple)│
└─────────────┬───────────────┘
              ▼
STEP 3: Opens Create Request Form Directly
┌─────────────────────────────┐
│  Requested                  │
│  [Select Request Type]      │
│  [Pick Start Date]          │
│  [Enter Details]            │
│  [Submit]                   │
└─────────────┬───────────────┘
              ▼
STEP 4: Form Submitted
┌─────────────────────────────┐
│  ✅ Success Alert           │
│  "Request submitted!"       │
│  [OK]                       │
└─────────────┬───────────────┘
              ▼
STEP 5: Back to Home
┌─────────────────────────────┐
│  Home Screen                │
└─────────────────────────────┘
```

### Manager Journey: Approve Request

```
STEP 1: Login as Manager
┌─────────────────────────────┐
│  Login Screen               │
│  email: manager@test.com    │
│  [Login]                    │
└─────────────┬───────────────┘
              ▼
STEP 2: Home Screen Loads
┌─────────────────────────────┐
│  Home Screen                │
│  Role Badge: "Manager"      │
│  Services:                  │
│  - Request Approval (Green) │ ← Click
│  - Leave Approval (Red)     │
└─────────────┬───────────────┘
              ▼
STEP 3: Opens Approval List
┌─────────────────────────────┐
│  Request Approval           │
│  [Requested] [Active] [...]  │
│  👤 John [✗] [✓]           │ ← Click ✓
└─────────────┬───────────────┘
              ▼
STEP 4: Request Approved
┌─────────────────────────────┐
│  Status → Active            │
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
│  - Blue Card     │            │  - Green Card    │
│  - Purple Card   │            │  - Red Card      │
└──────────────────┘            └──────────────────┘
         │                               │
         │ Click Blue                    │ Click Green
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│CreateRequestScreen│            │ RequestsScreen   │
│                  │            │                  │
│ [Form to submit] │            │ [List to approve]│
│                  │            │                  │
│ - Request Type   │            │ - Requested      │
│ - Date           │            │ - Active         │
│ - Notes          │            │ - Cancelled      │
│ - Submit         │            │ - Approve/Reject │
└──────────────────┘            └──────────────────┘
```

---

## ✅ What Got Removed/Simplified

### From RequestsScreen.tsx:

**Updated:**
```typescript
// ✅ UPDATED: Fixed title for managers
title="Request Approval"  // Was: "Requests"

// ✅ UPDATED: Remove cancel action for managers
onCancel={undefined}  // Managers don't cancel, they reject
```

---

## 🧪 Testing Checklist

### Test Employee Access

- [ ] Login as `employee@test.com`
- [ ] Verify role badge: "Employee"
- [ ] Verify service cards:
  - [ ] "Request Application" (Blue) ✅
  - [ ] "Leave Application" (Purple) ✅
  - [ ] NO "Request Approval" ❌
- [ ] Click "Request Application" card
- [ ] Verify: Opens CreateRequestScreen directly ✅
- [ ] Fill and submit form
- [ ] Verify: Success message ✅

### Test Manager Access

- [ ] Login as `manager@test.com`
- [ ] Verify role badge: "Manager"
- [ ] Verify service cards:
  - [ ] "Request Approval" (Green) ✅
  - [ ] "Leave Approval" (Red) ✅
  - [ ] NO "Request Application" ❌
- [ ] Click "Request Approval" card
- [ ] Verify: Opens RequestsScreen (approval list) ✅
- [ ] Verify: Approve/Reject buttons visible ✅
- [ ] Click approve on a request
- [ ] Verify: Status updates ✅

### Test Role Switching

- [ ] Login as `admin@test.com` (both roles)
- [ ] Default role: "Employee"
- [ ] Verify: "Request Application" card visible (Blue)
- [ ] Switch to "Manager" role
- [ ] Verify: Card changes to "Request Approval" (Green)
- [ ] Click card → Opens RequestsScreen
- [ ] Switch back to "Employee"
- [ ] Verify: Card changes back to "Request Application" (Blue)
- [ ] Click card → Opens CreateRequestScreen

---

## 📁 Files Created/Modified

```
✅ NEW FILE:
   └─ CreateRequestScreen.tsx           (Form screen for employees)

✅ MODIFIED (3 files):
   ├─ PayrollHomeScreen.tsx
   │   └─ Added role-based request cards
   │
   ├─ RequestsScreen.tsx
   │   ├─ Updated title: "Request Approval"
   │   └─ Set onCancel to undefined
   │
   └─ App.tsx
       └─ Added CreateRequest route

📄 DOCS CREATED:
   └─ REQUEST_FEATURE_FINAL_ARCHITECTURE.md (this file)
```

---

## 🎯 Benefits

### 1. **Consistency with Leave Feature**
- Same pattern for all approval workflows
- Employees always get direct form access
- Managers always get approval lists

### 2. **Clearer User Experience**
- Blue "Request Application" → Create request
- Green "Request Approval" → Approve requests
- Clear visual distinction

### 3. **Faster Workflow**
- Employees: 1 click to form (direct)
- Managers: 1 click to approvals

### 4. **Simpler Code**
- No complex role checking
- Clear separation of concerns
- Easier to maintain

---

## 📊 Complete Color Scheme

| Feature | Employee Card | Manager Card |
|---------|--------------|--------------|
| **Requests** | 🔵 Blue `#2196F3` | 🟢 Green `#4CAF50` |
| **Leaves** | 🟣 Purple `#9C27B0` | 🔴 Red `#FF5722` |
| **Pay Slip** | 🟠 Orange `#FFB300` | 🟠 Orange `#FFB300` |
| **Attendance** | 🔵 Blue `#2196F3` | 🔵 Blue `#2196F3` |

---

## ✅ Summary

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Employee Path** | Home → Requests (list) | Home → CreateRequest (form) |
| **Manager Path** | Home → Requests (list) | Home → Requests (same) |
| **Home Card (Employee)** | "Requests" (Green) | "Request Application" (Blue) |
| **Home Card (Manager)** | "Requests" (Green) | "Request Approval" (Green) |
| **RequestsScreen Title** | "Requests" | "Request Approval" |

### Result

✅ **Employee**: Direct access to create requests  
✅ **Manager**: Clear approval interface  
✅ **Consistency**: Same pattern as Leave feature  
✅ **UX**: More intuitive for both roles

---

## 🎉 Implementation Complete!

**The request feature now follows the same pattern as the leave feature, providing completely separate workflows for each role! 🚀**
