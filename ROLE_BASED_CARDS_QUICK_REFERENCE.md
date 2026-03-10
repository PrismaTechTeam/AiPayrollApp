# Role-Based Cards - Quick Reference

## 🎯 Visual Quick Reference

### EMPLOYEE HOME SCREEN

```
┌──────────────────────────────────────────────┐
│  Hi John, Good Morning!                       │
│  Role: [Employee ▼]                           │
├──────────────────────────────────────────────┤
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Request  │  │  Leave   │  │ Pay Slip │  │
│  │Application│  │Application│  │    15    │  │
│  │    📧+   │  │    📅+   │  │    📄    │  │
│  │  🔵 BLUE │  │ 🟣 PURPLE│  │ 🟠 ORANGE│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       ↓             ↓             ↓          │
│    CREATE       CREATE        VIEW           │
│     FORM         FORM         LIST           │
└──────────────────────────────────────────────┘
```

### MANAGER HOME SCREEN

```
┌──────────────────────────────────────────────┐
│  Hi Sarah, Good Morning!                      │
│  Role: [Manager ▼]                            │
├──────────────────────────────────────────────┤
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Request  │  │  Leave   │  │ Pay Slip │  │
│  │ Approval │  │ Approval │  │    15    │  │
│  │    📧    │  │   📅⏰   │  │    📄    │  │
│  │ 🟢 GREEN │  │  🔴 RED  │  │ 🟠 ORANGE│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       ↓             ↓             ↓          │
│    APPROVE      APPROVE       VIEW           │
│     LIST         LIST         LIST           │
└──────────────────────────────────────────────┘
```

---

## 📋 Card Specifications

| Card | Employee | Manager |
|------|----------|---------|
| **Request** | 🔵 Request Application<br>`#2196F3` Blue<br>Icon: `email-plus-outline`<br>→ CreateRequestScreen | 🟢 Request Approval<br>`#4CAF50` Green<br>Icon: `email-outline`<br>→ RequestsScreen |
| **Leave** | 🟣 Leave Application<br>`#9C27B0` Purple<br>Icon: `calendar-plus`<br>→ CreateLeaveScreen | 🔴 Leave Approval<br>`#FF5722` Red<br>Icon: `calendar-clock`<br>→ LeavesScreen |
| **Pay Slip** | 🟠 Pay Slip<br>`#FFB300` Orange<br>Icon: `file-document-outline`<br>→ PayslipScreen | 🟠 Pay Slip<br>`#FFB300` Orange<br>Icon: `file-document-outline`<br>→ PayslipScreen |
| **Attendance** | 🔵 Attendance<br>`#2196F3` Blue<br>Icon: `clock-outline`<br>→ AttendanceScreen | 🔵 Attendance<br>`#2196F3` Blue<br>Icon: `clock-outline`<br>→ AttendanceScreen |

---

## 🔄 Role Switch Behavior

```
Login as: admin@test.com (has both roles)

DEFAULT (Employee):
┌──────────────────────┐
│ Request Application  │  🔵 Blue
│ Leave Application    │  🟣 Purple
└──────────────────────┘

↓ Click role badge → Select "Manager"

SWITCHED (Manager):
┌──────────────────────┐
│ Request Approval     │  🟢 Green
│ Leave Approval       │  🔴 Red
└──────────────────────┘

↓ Click role badge → Select "Employee"

BACK TO DEFAULT (Employee):
┌──────────────────────┐
│ Request Application  │  🔵 Blue
│ Leave Application    │  🟣 Purple
└──────────────────────┘
```

---

## ✅ Quick Test Checklist

### Employee Test (5 mins)
```
1. Login: employee@test.com / 123456
2. Check cards:
   ✓ Blue "Request Application"
   ✓ Purple "Leave Application"
3. Click blue card → Opens form
4. Fill form → Submit → Success
5. Click purple card → Opens form
6. Fill form → Submit → Success
```

### Manager Test (5 mins)
```
1. Login: manager@test.com / 123456
2. Check cards:
   ✓ Green "Request Approval"
   ✓ Red "Leave Approval"
3. Click green card → Opens list
4. Click ✓ → Approve → Success
5. Click red card → Opens list
6. Click ✓ → Approve → Success
```

### Role Switch Test (3 mins)
```
1. Login: admin@test.com / 123456
2. Default: Blue + Purple cards ✓
3. Switch to Manager
4. Cards change: Green + Red ✓
5. Switch back to Employee
6. Cards change: Blue + Purple ✓
```

---

## 🎨 Color Memory Aid

```
EMPLOYEE (Create/Apply):
🔵 Blue + 🟣 Purple = Cool colors = Submit/Create

MANAGER (Approve/Review):
🟢 Green + 🔴 Red = Traffic light colors = Approve/Reject
```

---

## 🚀 Quick Start

```bash
# Start app
npm start

# Test credentials
employee@test.com / 123456   → See Blue + Purple cards
manager@test.com / 123456    → See Green + Red cards
admin@test.com / 123456      → Can switch between both
```

---

## 🎯 Expected Behavior

| Action | Employee Result | Manager Result |
|--------|----------------|----------------|
| **Click Request card** | Opens CreateRequestScreen (Form) | Opens RequestsScreen (List) |
| **Click Leave card** | Opens CreateLeaveScreen (Form) | Opens LeavesScreen (List) |
| **Click Pay Slip card** | Opens PayslipScreen | Opens PayslipScreen |
| **Click Attendance card** | Opens AttendanceScreen | Opens AttendanceScreen |

---

## ⚠️ Common Issues

### Card colors not changing on role switch
**Solution:** Restart app or check if user has multiple roles

### Wrong screen opens
**Solution:** Check navigation routes in App.tsx

### Cards not showing
**Solution:** Check if user is logged in and role is set

---

## ✅ Success Indicators

- [✅] Employee sees Blue + Purple cards
- [✅] Manager sees Green + Red cards
- [✅] Role switch updates cards immediately
- [✅] Correct screens open on click
- [✅] Forms submit successfully
- [✅] Approvals work correctly

---

**Everything Working? You're Ready! 🎉**
