# Leave Cards - Quick Reference Guide

## 🎯 Visual Summary

### EMPLOYEE VIEW
```
┌───────────────────────────────────────────────────────────┐
│            HOME SCREEN (Employee Role)                     │
├───────────────────────────────────────────────────────────┤
│  Good Morning, John!                                       │
│  Role: [Employee ▼]                                        │
│                                                           │
│  Please Choose Services:                                   │
│  ┌───────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────┐    │   │
│  │  │          │  │             │  │          │    │   │
│  │  │ Requests │  │   Leave     │  │ Pay Slip │    │   │
│  │  │   100    │  │ Application │  │    15    │    │   │
│  │  │          │  │     5       │  │          │    │   │
│  │  │  📧 🟢   │  │  📅+ 🟣    │  │  📄 🟠   │    │   │
│  │  │          │  │             │  │          │    │   │
│  │  └──────────┘  └─────────────┘  └──────────┘    │   │
│  │     Green         PURPLE          Orange        │   │
│  │               ↑                                  │   │
│  │           Click Here                            │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │ Navigates to...
                        ▼
┌───────────────────────────────────────────────────────────┐
│         CREATE A LEAVE PLAN (Form Screen)                 │
├───────────────────────────────────────────────────────────┤
│  ← Back                                                    │
│                                                           │
│  Leave Type:                                               │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Select Leave Type                          ▼   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Start Date:                                               │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Select Start Date                         📅   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  End Date:                                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Select End Date                           📅   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ℹ️  Total Leave Days: 3                                  │
│                                                           │
│  Additional Note:                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Enter notes...                                 │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Submit                             │     │
│  └─────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────┘
```

---

### MANAGER VIEW
```
┌───────────────────────────────────────────────────────────┐
│            HOME SCREEN (Manager Role)                      │
├───────────────────────────────────────────────────────────┤
│  Good Morning, Sarah!                                      │
│  Role: [Manager ▼]                                         │
│                                                           │
│  Please Choose Services:                                   │
│  ┌───────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────┐    │   │
│  │  │          │  │             │  │          │    │   │
│  │  │ Requests │  │   Leave     │  │ Pay Slip │    │   │
│  │  │   100    │  │  Approval   │  │    15    │    │   │
│  │  │          │  │     12      │  │          │    │   │
│  │  │  📧 🟢   │  │  📅⏰ 🔴   │  │  📄 🟠   │    │   │
│  │  │          │  │             │  │          │    │   │
│  │  └──────────┘  └─────────────┘  └──────────┘    │   │
│  │     Green          RED            Orange        │   │
│  │               ↑                                  │   │
│  │           Click Here                            │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │ Navigates to...
                        ▼
┌───────────────────────────────────────────────────────────┐
│         LEAVE APPROVAL (List Screen)                      │
├───────────────────────────────────────────────────────────┤
│  ← Back                                                    │
│                                                           │
│  [Requested] [Active] [Cancelled]                          │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  👤 John Smith            2 Days Ago            │     │
│  │  27 Aug - 28 Aug, 2021     [✗] [✓]            │     │
│  │  Annual Leave Request                          │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  👤 Sarah Lee             3 Days Ago            │     │
│  │  25 Aug - 27 Aug, 2021     [✗] [✓]            │     │
│  │  Sick Leave Request                            │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │  👤 Mike Jones            1 Day Ago             │     │
│  │  28 Aug - 29 Aug, 2021     [✗] [✓]            │     │
│  │  Casual Leave Request                          │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  NO + Button                                               │
└───────────────────────────────────────────────────────────┘
```

---

## 🎨 Card Specifications

| Role | Card Title | Icon | Color | Color Code | Navigation |
|------|-----------|------|-------|------------|------------|
| **Employee** | Leave Application | 📅+ `calendar-plus` | 🟣 Purple | `#9C27B0` | → CreateLeaveScreen |
| **Manager** | Leave Approval | 📅⏰ `calendar-clock` | 🔴 Red | `#FF5722` | → LeavesScreen |

---

## 🔄 Role Switching

### User with Both Roles (e.g., Admin):

```
┌────────────────────────────────────────────────────┐
│  HOME SCREEN                                        │
│  Role: [Employee ▼] ← Click to switch              │
│                                                     │
│  Card shown: "Leave Application" (Purple)          │
│  Destination: CreateLeaveScreen                     │
└────────────────────────────────────────────────────┘
                        ↓ Switch role
┌────────────────────────────────────────────────────┐
│  HOME SCREEN                                        │
│  Role: [Manager ▼]                                  │
│                                                     │
│  Card shown: "Leave Approval" (Red)                │
│  Destination: LeavesScreen                          │
└────────────────────────────────────────────────────┘
```

---

## ✅ Quick Test Steps

### Test as Employee:
1. Login: `employee@test.com` / `123456`
2. Check: Purple "Leave Application" card visible
3. Click card → Opens form directly
4. Fill form → Submit
5. Success! ✅

### Test as Manager:
1. Login: `manager@test.com` / `123456`
2. Check: Red "Leave Approval" card visible
3. Click card → Opens approval list
4. Click ✓ to approve
5. Leave status updated! ✅

### Test Role Switch:
1. Login: `admin@test.com` / `123456`
2. Default: Purple "Leave Application" card
3. Switch to Manager
4. Card changes to Red "Leave Approval"
5. Switch back to Employee
6. Card changes to Purple "Leave Application"

---

## 🎯 What Each Role Sees

```
┌─────────────────────┬─────────────────────┐
│      EMPLOYEE       │       MANAGER       │
├─────────────────────┼─────────────────────┤
│                     │                     │
│  Card Title:        │  Card Title:        │
│  "Leave Application"│  "Leave Approval"   │
│                     │                     │
│  Card Color:        │  Card Color:        │
│  🟣 Purple          │  🔴 Red             │
│  (#9C27B0)          │  (#FF5722)          │
│                     │                     │
│  Card Icon:         │  Card Icon:         │
│  📅+ calendar-plus  │  📅⏰ calendar-clock│
│                     │                     │
│  Card Count:        │  Card Count:        │
│  5 (own leaves)     │  12 (team leaves)   │
│                     │                     │
│  Destination:       │  Destination:       │
│  CreateLeaveScreen  │  LeavesScreen       │
│  (Form)             │  (List)             │
│                     │                     │
│  Purpose:           │  Purpose:           │
│  Submit new leave   │  Review/approve     │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

---

## 💻 Code Snippet

```typescript
// PayrollHomeScreen.tsx

const { currentRole } = usePayrollAuth();
const isManager = currentRole === USER_ROLES.MANAGER;

{isManager ? (
  // MANAGER: Red "Leave Approval" card → LeavesScreen
  <ServiceCard
    title="Leave Approval"
    count={12}
    icon="calendar-clock"
    color="#FF5722"
    onPress={() => navigation.navigate('Leaves')}
  />
) : (
  // EMPLOYEE: Purple "Leave Application" card → CreateLeaveScreen
  <ServiceCard
    title="Leave Application"
    count={5}
    icon="calendar-plus"
    color="#9C27B0"
    onPress={() => navigation.navigate('CreateLeave')}
  />
)}
```

---

## 📊 Navigation Tree

```
App
 │
 ├─ Login
 │
 ├─ Home (PayrollHomeScreen)
 │   │
 │   ├─ IF Employee Role:
 │   │   └─ "Leave Application" card
 │   │       └─ navigates to → CreateLeaveScreen (Form)
 │   │
 │   └─ IF Manager Role:
 │       └─ "Leave Approval" card
 │           └─ navigates to → LeavesScreen (List)
 │
 ├─ CreateLeaveScreen (Employee only)
 │   └─ Submit → Back to Home
 │
 └─ LeavesScreen (Manager only)
     └─ Approve/Reject → List refreshes
```

---

## 🎉 Summary

### EMPLOYEE:
- Sees: **Purple "Leave Application" card**
- Clicks: Goes **directly to form**
- Goal: **Submit leave request**

### MANAGER:
- Sees: **Red "Leave Approval" card**
- Clicks: Goes **to approval list**
- Goal: **Review team leaves**

**Simple, Clear, Intuitive! ✅**
