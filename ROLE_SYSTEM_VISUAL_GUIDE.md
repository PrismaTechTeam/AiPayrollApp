# Role System Visual Guide

## 🎨 Visual Flow Diagrams

### Old LetlinkMobile App - Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Check          │
                │ SecureStore    │
                │ for authToken  │
                └────────┬───────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼ No Token                  ▼ Token Found
    ┌──────────────┐          ┌──────────────────┐
    │ Show Login   │          │ Decode JWT Token │
    │ Screen       │          │ Extract UserInfo │
    └──────┬───────┘          └────────┬─────────┘
           │                           │
           │                           ▼
           │                  ┌─────────────────┐
           │                  │ UserInfo Object │
           │                  │ - uid           │
           │                  │ - name          │
           │                  │ - email         │
           │                  │ - role: ["User",│
           │                  │         "Lawyer"]│
           │                  │ - ActiveRole:   │
           │                  │   "User"        │
           │                  └────────┬────────┘
           │                           │
           ▼                           ▼
    ┌──────────────┐          ┌──────────────────┐
    │ User Enters  │          │ AuthContext      │
    │ Email/Pass   │          │ provides user    │
    └──────┬───────┘          │ to all screens   │
           │                  └────────┬─────────┘
           ▼                           │
    ┌──────────────┐                  │
    │ Send to      │                  │
    │ Backend API  │                  │
    └──────┬───────┘                  │
           │                           │
           ▼                           │
    ┌──────────────┐                  │
    │ Backend      │                  │
    │ validates &  │                  │
    │ returns JWT  │                  │
    └──────┬───────┘                  │
           │                           │
           ▼                           │
    ┌──────────────┐                  │
    │ Store in     │                  │
    │ SecureStore  │                  │
    └──────┬───────┘                  │
           │                           │
           └───────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ App Renders Based   │
              │ on ActiveRole       │
              │                     │
              │ If "Admin":         │
              │   → Admin Dashboard │
              │ If "User":          │
              │   → Home Screen     │
              │ If "Lawyer":        │
              │   → Cases Screen    │
              └─────────────────────┘
```

---

### New Payroll App - Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Check          │
                │ SecureStore    │
                │ for payroll_   │
                │ user           │
                └────────┬───────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼ No User                   ▼ User Found
    ┌──────────────┐          ┌──────────────────┐
    │ Show Login   │          │ Parse JSON       │
    │ Screen       │          │ User Object      │
    └──────┬───────┘          └────────┬─────────┘
           │                           │
           │                           ▼
           │                  ┌─────────────────┐
           │                  │ PayrollUser     │
           │                  │ - uid           │
           │                  │ - name          │
           │                  │ - email         │
           │                  │ - role: "Emp"   │
           │                  │ - availableRoles│
           │                  │   ["Emp","Mgr"] │
           │                  └────────┬────────┘
           │                           │
           ▼                           ▼
    ┌──────────────┐          ┌──────────────────┐
    │ User Enters  │          │ PayrollAuth      │
    │ Email/Pass   │          │ Context provides │
    └──────┬───────┘          │ user to screens  │
           │                  └────────┬─────────┘
           ▼                           │
    ┌──────────────┐                  │
    │ Check Dummy  │                  │
    │ Users Array  │                  │
    └──────┬───────┘                  │
           │                           │
     ┌─────┴─────┐                    │
     │           │                    │
     ▼           ▼                    │
   Match      No Match                │
   Found      (Error)                 │
     │                                │
     ▼                                │
┌──────────────┐                      │
│ Create User  │                      │
│ Object       │                      │
└──────┬───────┘                      │
       │                              │
       ▼                              │
┌──────────────┐                      │
│ Store in     │                      │
│ SecureStore  │                      │
└──────┬───────┘                      │
       │                              │
       └──────────────────────────────┘
                 │
                 ▼
       ┌─────────────────┐
       │ Show Payroll    │
       │ Home Screen     │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ User sees Role  │
       │ Switcher (if    │
       │ multiple roles) │
       └────────┬────────┘
                │
       ┌────────┴─────────┐
       │                  │
       ▼                  ▼
   Employee           Manager
   Features           Features
```

---

### Role Switching Flow (Payroll App)

```
┌───────────────────────────────────────────────────────────┐
│            USER WITH MULTIPLE ROLES LOGGED IN              │
│                                                            │
│  Current State:                                            │
│  role: "Employee"                                          │
│  availableRoles: ["Employee", "Manager"]                   │
└──────────────────────────┬────────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │ User clicks      │
                 │ Role Badge       │
                 │ "Employee ▼"     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Modal Shows:     │
                 │                  │
                 │ ● Employee       │
                 │ ○ Manager        │
                 │                  │
                 │ [Switch] [Cancel]│
                 └────────┬─────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
         ┌──────────┐        ┌──────────┐
         │ Cancel   │        │ Select   │
         │ pressed  │        │ Manager  │
         └────┬─────┘        └────┬─────┘
              │                   │
              ▼                   ▼
         ┌──────────┐        ┌──────────────┐
         │ Close    │        │ Call         │
         │ modal    │        │ switchRole() │
         └──────────┘        └────┬─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Update user obj │
                         │ role: "Manager" │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Save to         │
                         │ SecureStore     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Context updates │
                         │ currentRole     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ React triggers  │
                         │ re-render       │
                         └────────┬────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
                ▼                                   ▼
       ┌─────────────────┐              ┌──────────────────┐
       │ Role badge now  │              │ Components       │
       │ shows:          │              │ re-check role:   │
       │ "Manager ▼"     │              │                  │
       └─────────────────┘              │ canApprove =     │
                                        │ true now!        │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Approve/Reject  │
                                        │ buttons appear  │
                                        │ on cards        │
                                        └─────────────────┘
```

---

### Permission Check Flow

```
┌────────────────────────────────────────────────────────────┐
│              COMPONENT RENDERS / USER INTERACTS             │
└───────────────────────────┬────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Get currentRole │
                   │ from context    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Call            │
                   │ hasRoleAccess() │
                   └────────┬────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │                                   │
        │  hasRoleAccess(                   │
        │    userRole,    ← "Manager"       │
        │    allowedRoles ← ["Manager"]     │
        │  )                                │
        │                                   │
        └────────┬──────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
   userRole              userRole
   is in                 NOT in
   allowedRoles          allowedRoles
       │                   │
       ▼                   ▼
   ┌─────────┐         ┌─────────┐
   │ Return  │         │ Return  │
   │ TRUE    │         │ FALSE   │
   └────┬────┘         └────┬────┘
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌─────────┐
   │ Show    │         │ Hide    │
   │ Feature │         │ Feature │
   └─────────┘         └─────────┘

Example 1: Manager approving requests
┌──────────────────────────────────────────┐
│ currentRole = "Manager"                  │
│ allowedRoles = ["Manager"]               │
│ Result: TRUE → Show approve button       │
└──────────────────────────────────────────┘

Example 2: Employee approving requests
┌──────────────────────────────────────────┐
│ currentRole = "Employee"                 │
│ allowedRoles = ["Manager"]               │
│ Result: FALSE → Hide approve button      │
└──────────────────────────────────────────┘

Example 3: Anyone submitting requests
┌──────────────────────────────────────────┐
│ currentRole = "Employee" OR "Manager"    │
│ allowedRoles = ["Employee", "Manager"]   │
│ Result: TRUE → Show submit button        │
└──────────────────────────────────────────┘
```

---

### Data Structure Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    OLD APP (LetlinkMobile)                   │
└─────────────────────────────────────────────────────────────┘

JWT Token Payload (from Backend):
┌─────────────────────────────────────────┐
│ {                                       │
│   "uid": "abc-123",                     │
│   "email": "user@example.com",          │
│   "name": "John Doe",                   │
│   "role": ["User", "Lawyer"],  ← Array! │
│   "ActiveRole": "User",        ← Active │
│   "isNewUser": false,                   │
│   "exp": 1234567890                     │
│ }                                       │
└─────────────────────────────────────────┘

After Decoding (in AuthContext):
┌─────────────────────────────────────────┐
│ state.user = {                          │
│   UserInfo: {                           │
│     uid: "abc-123",                     │
│     email: "user@example.com",          │
│     name: "John Doe",                   │
│     role: ["User", "Lawyer"],           │
│     ActiveRole: "User",                 │
│     isNewUser: false                    │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘

How Components Use It:
┌─────────────────────────────────────────┐
│ const { user } = useAuth();             │
│ const userRole = user?.UserInfo?.role;  │
│ // userRole = ["User", "Lawyer"]        │
│                                         │
│ const activeRole =                      │
│   user?.UserInfo?.ActiveRole;           │
│ // activeRole = "User"                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     NEW APP (Payroll)                        │
└─────────────────────────────────────────────────────────────┘

Stored in SecureStore (payroll_user):
┌─────────────────────────────────────────┐
│ {                                       │
│   "uid": "emp-001",                     │
│   "name": "Alex Smith",                 │
│   "email": "admin@test.com",            │
│   "role": "Employee",          ← Active │
│   "availableRoles": [          ← Array! │
│     "Employee",                          │
│     "Manager"                            │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘

In PayrollAuthContext:
┌─────────────────────────────────────────┐
│ state.user = {                          │
│   uid: "emp-001",                       │
│   name: "Alex Smith",                   │
│   email: "admin@test.com",              │
│   role: "Employee",                     │
│   availableRoles: [                     │
│     "Employee",                          │
│     "Manager"                            │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘

How Components Use It:
┌─────────────────────────────────────────┐
│ const {                                 │
│   user,                                 │
│   currentRole,                          │
│   availableRoles                        │
│ } = usePayrollAuth();                   │
│                                         │
│ // user = entire user object            │
│ // currentRole = "Employee"             │
│ // availableRoles = ["Emp", "Mgr"]      │
└─────────────────────────────────────────┘
```

---

### Role Groups Visualization

```
OLD APP ROLES:
┌─────────────────────────────────────────────────────────┐
│                        ADMIN                            │
│              (All permissions)                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Home Access                                     │ │
│  │ • Chat Access                                     │ │
│  │ • Booking Management                              │ │
│  │ • Case Management                                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                         USER                            │
│              (Customer permissions)                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Home Access                                     │ │
│  │ • Chat Access                                     │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        LAWYER                           │
│              (Legal professional permissions)           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Cases Access                                    │ │
│  │ • Chat Access                                     │ │
│  │ • Booking Management                              │ │
│  │ • Case Management                                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                       LAW_FIRM                          │
│              (Firm-level permissions)                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Cases Access                                    │ │
│  │ • Chat Access                                     │ │
│  │ • Booking Management                              │ │
│  │ • Case Management                                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

NEW APP ROLES:
┌─────────────────────────────────────────────────────────┐
│                       MANAGER                           │
│              (Approval & oversight permissions)         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Approve Requests      ✓                         │ │
│  │ • Approve Leaves        ✓                         │ │
│  │ • Approve Payslips      ✓                         │ │
│  │ • View All Attendance   ✓                         │ │
│  │ • Submit Requests       ✓                         │ │
│  │ • View Own Payslips     ✓                         │ │
│  │ • View Own Attendance   ✓                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      EMPLOYEE                           │
│              (Self-service permissions)                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ • Approve Requests      ✗                         │ │
│  │ • Approve Leaves        ✗                         │ │
│  │ • Approve Payslips      ✗                         │ │
│  │ • View All Attendance   ✗                         │ │
│  │ • Submit Requests       ✓                         │ │
│  │ • View Own Payslips     ✓                         │ │
│  │ • View Own Attendance   ✓                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### UI Differences

```
OLD APP - Request Card (Read-Only)
┌────────────────────────────────────────┐
│  👤 John Doe                           │
│  📧 Email: john@example.com            │
│  📝 Request: Sick Leave                │
│  📅 Date: 2026-01-16                   │
│  ⏰ Status: Pending                    │
│                                        │
│  [View Details →]                      │
│                                        │
│  ← No action buttons (view only)      │
└────────────────────────────────────────┘

NEW APP - Request Card (Employee View)
┌────────────────────────────────────────┐
│  👤 John Doe                           │
│  📧 Email: john@example.com            │
│  📝 Request: Sick Leave                │
│  📅 Date: 2026-01-16                   │
│  ⏰ Status: Pending                    │
│                                        │
│  [View Details →]                      │
│                                        │
│  ← No approval buttons (Employee)     │
└────────────────────────────────────────┘

NEW APP - Request Card (Manager View)
┌────────────────────────────────────────┐
│  👤 John Doe                           │
│  📧 Email: john@example.com            │
│  📝 Request: Sick Leave                │
│  📅 Date: 2026-01-16                   │
│  ⏰ Status: Pending                    │
│                                        │
│  [View Details →]                      │
│                                        │
│  [✓ Approve]  [✗ Reject]  [↻ Restore] │
│                                        │
│  ← Action buttons (Manager only)      │
└────────────────────────────────────────┘

NEW APP - Role Switcher
┌────────────────────────────────────────┐
│  Good Morning, Alex! 👋                │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  👤 Employee ▼                   │ │  ← Click to switch
│  └──────────────────────────────────┘ │
│                                        │
│  When clicked:                         │
│  ┌──────────────────────────────────┐ │
│  │ Select Role                      │ │
│  │                                  │ │
│  │ ● Employee (Current)             │ │
│  │ ○ Manager                        │ │
│  │                                  │ │
│  │ [Switch Role]  [Cancel]          │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

This comprehensive visual guide should help you understand exactly how both role systems work! 🎯
