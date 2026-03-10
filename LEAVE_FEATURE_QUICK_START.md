# Leave Feature - Quick Start Guide

## 🚀 Test It Right Now!

### Step 1: Start the App

```bash
npm start
# or
expo start --go
```

---

### Step 2: Login as Employee

```
Email: employee@test.com
Password: 123456
```

**Expected Result:**
- ✅ Role badge shows "Employee"
- ✅ Home screen loads

---

### Step 3: Test Employee View

**Navigate to Leaves:**
1. Tap "Leaves" card on home screen
2. **Expected:**
   - Header: "Leave Application" ✅
   - FAB (+) button visible at bottom-right ✅
   - NO approve/reject buttons ✅

**Create New Leave:**
1. Tap FAB (+) button
2. **Expected:** Opens "Create a Leave Plan" form ✅
3. Fill form:
   - Leave Type: Select "Annual Leave"
   - Start Date: Pick tomorrow's date
   - End Date: Pick 2 days after start
   - Note: "Testing the form"
4. **Expected:** See "Total Leave Days: 3" ✅
5. Tap Submit
6. **Expected:** Success alert appears ✅
7. Tap OK
8. **Expected:** Back to leaves list ✅

---

### Step 4: Logout & Login as Manager

**Logout:**
1. Tap profile icon (bottom nav)
2. Tap "Logout"
3. Confirm

**Login as Manager:**
```
Email: manager@test.com
Password: 123456
```

---

### Step 5: Test Manager View

**Navigate to Leaves:**
1. Tap "Leaves" card on home screen
2. **Expected:**
   - Header: "Leave Approval" ✅
   - NO FAB button ✅
   - Approve/Reject buttons visible ✅

**Approve a Leave:**
1. Find a requested leave
2. Tap green checkmark (✓)
3. **Expected:** Leave approved ✅

---

### Step 6: Test Role Switching

**Login as Admin (Both Roles):**
```
Email: admin@test.com
Password: 123456
```

**Switch Between Roles:**
1. On home screen, tap role badge ("Employee")
2. Modal opens with roles
3. Select "Manager"
4. **Expected:** Badge updates to "Manager" ✅
5. Tap "Leaves" card
6. **Expected:** 
   - Header changed to "Leave Approval" ✅
   - FAB disappeared ✅
   - Approve/Reject buttons appeared ✅

---

## ✅ Checklist

### Employee Testing
- [ ] Login as employee
- [ ] See "Leave Application" header
- [ ] See FAB (+) button
- [ ] Click FAB → Opens form
- [ ] Select leave type
- [ ] Pick dates
- [ ] See calculated days
- [ ] Submit form
- [ ] See success alert
- [ ] Return to list

### Manager Testing
- [ ] Login as manager
- [ ] See "Leave Approval" header
- [ ] NO FAB button visible
- [ ] See approve/reject buttons
- [ ] Click approve → Works
- [ ] Click reject → Works

### Role Switch Testing
- [ ] Login as admin
- [ ] Default role: Employee
- [ ] See FAB button
- [ ] Switch to Manager
- [ ] FAB disappears
- [ ] Approve buttons appear
- [ ] Switch back to Employee
- [ ] FAB reappears

---

## 🐛 Troubleshooting

### FAB Not Showing
**Problem:** Can't see + button
**Solution:** 
1. Check you're logged in as Employee
2. Go to home → Check role badge
3. If Manager, switch to Employee

### Form Won't Submit
**Problem:** Nothing happens on submit
**Solution:**
1. Check all required fields are filled
2. Check end date >= start date
3. Look for red validation alerts

### Navigation Error
**Problem:** App crashes on navigation
**Solution:**
1. Check CreateLeave route in App.tsx
2. Restart metro bundler
3. Clear cache: `expo start -c`

### Date Picker Not Opening
**Problem:** Calendar doesn't appear
**Solution:**
1. Verify @react-native-community/datetimepicker installed
2. Run `npm install`
3. Restart app

---

## 📱 Screenshots Reference

### Employee View
```
┌─────────────────────────────┐
│  ← Leave Application        │  ← Should see this title
├─────────────────────────────┤
│  [Requested] [Active] [...]  │
├─────────────────────────────┤
│  👤 My Leave [Requested]    │
│  👤 My Leave [Active] [✗]   │
│                              │
│                       [+] ← │  ← Should see FAB
└─────────────────────────────┘
```

### Manager View
```
┌─────────────────────────────┐
│  ← Leave Approval           │  ← Should see this title
├─────────────────────────────┤
│  [Requested] [Active] [...]  │
├─────────────────────────────┤
│  👤 John Smith [✗] [✓]     │  ← Should see buttons
│  👤 Sarah Lee  [✗] [✓]     │
│                              │
│                   NO FAB ←  │  ← Should NOT see FAB
└─────────────────────────────┘
```

### Create Form
```
┌─────────────────────────────┐
│  ← Create a Leave Plan      │
├─────────────────────────────┤
│  Leave Type                  │
│  [Annual Leave          ▼]  │  ← Dropdown
│                              │
│  Start Date                  │
│  [20/01/2026           📅]  │  ← Date picker
│                              │
│  End Date                    │
│  [22/01/2026           📅]  │  ← Date picker
│                              │
│  ℹ️  Total Leave Days: 3     │  ← Auto-calculated
│                              │
│  [      Submit      ]       │  ← Submit button
└─────────────────────────────┘
```

---

## 🎯 Expected Test Results

| Test | Expected Outcome |
|------|------------------|
| Employee Login | Role badge: "Employee" |
| Open Leaves (Employee) | Header: "Leave Application", FAB visible |
| Click FAB | Opens CreateLeaveScreen |
| Fill & Submit Form | Success alert → Back to list |
| Manager Login | Role badge: "Manager" |
| Open Leaves (Manager) | Header: "Leave Approval", NO FAB |
| Approve Leave | Leave status updates |
| Admin Login | Role badge: "Employee" (default) |
| Switch to Manager | Badge updates, UI changes |
| Open Leaves | No FAB, has approve buttons |
| Switch to Employee | FAB returns, approve buttons gone |

---

## 📞 Quick Commands

```bash
# Start app
npm start

# Start in Expo Go mode
npm run start:go

# Clear cache and start
npx expo start -c

# Check for errors
npx expo doctor

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## 🎉 Success Criteria

Your implementation is working correctly if:

✅ **Employee can:**
- See "Leave Application" header
- See and click FAB button
- Open create form
- Fill and submit form
- See success message
- Cancel own active leaves

✅ **Manager can:**
- See "Leave Approval" header
- NOT see FAB button
- See approve/reject buttons
- Approve/reject leaves
- Restore cancelled leaves

✅ **Role switching:**
- Badge updates correctly
- UI changes automatically
- FAB appears/disappears
- Buttons show/hide correctly

---

## 🚀 You're Ready!

If all tests pass, your Leave Management System is **fully functional**! 🎊

**Next Steps:**
1. Connect to backend API
2. Add real data fetching
3. Implement leave balance check
4. Add conflict detection

**Happy Testing! 🎯**
