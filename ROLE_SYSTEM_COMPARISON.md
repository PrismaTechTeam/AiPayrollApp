# Role System Comparison: Old vs New Application

## Overview
This document explains how roles work in both the **old LetlinkMobile app** (legal services) and the **new Payroll app**, and why they're different.

---

## 🏢 Old LetlinkMobile App (Legal Services)

### User Roles (4 Roles)

```typescript
export const USER_ROLES = {
  ADMIN: 'Admin',
  USER: 'User',           // Regular customer
  LAWYER: 'Lawyer',       // Legal professional
  LAW_FIRM: 'LawFirm',    // Law firm account
}
```

### How Roles Work

#### 1. **Fixed Role System**
- Each user has **ONE fixed role** assigned by the backend
- User **CANNOT switch roles** themselves
- Role is stored in JWT token and decoded from backend response

#### 2. **Role Storage in JWT Token**
```typescript
// Example JWT payload from backend:
{
  "uid": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": ["User", "Lawyer"],  // User can have MULTIPLE roles
  "ActiveRole": "User",         // Currently active role
  "isNewUser": false
}
```

**Key Point:** The old app supports **multiple roles per user** (e.g., someone can be both a User and a Lawyer), and uses `ActiveRole` to track which role is currently active.

#### 3. **Role-Based Access Control**
```typescript
// Feature permissions defined in role groups
export const ROLE_GROUPS = {
  HOME_ACCESS: [USER_ROLES.ADMIN, USER_ROLES.USER],
  CASES_ACCESS: [USER_ROLES.LAWYER, USER_ROLES.LAW_FIRM],
  ADMIN_ONLY: [USER_ROLES.ADMIN],
  CHAT_ACCESS: [USER_ROLES.USER, USER_ROLES.LAWYER, USER_ROLES.LAW_FIRM, USER_ROLES.ADMIN],
  BOOKING_MANAGEMENT: [USER_ROLES.ADMIN, USER_ROLES.LAWYER, USER_ROLES.LAW_FIRM],
  CASE_MANAGEMENT: [USER_ROLES.ADMIN, USER_ROLES.LAWYER, USER_ROLES.LAW_FIRM],
};
```

#### 4. **Role Verification**
```typescript
// Check if user can access a feature
const hasAccess = hasRoleAccess(user.role, ROLE_GROUPS.CASE_MANAGEMENT);
// Checks if user's role(s) include any of the allowed roles
```

#### 5. **Authentication Flow**
```
Backend API → Login → Returns JWT Token
                           ↓
                    Decode JWT Token
                           ↓
               Extract: uid, name, email, role[], ActiveRole
                           ↓
                    Store in SecureStore
                           ↓
               AuthContext provides user data to app
                           ↓
       Components check role before showing features
```

### Real Backend Integration
- **Backend-driven:** All roles assigned by backend
- **JWT Authentication:** Token includes all user info
- **Refresh Token:** Automatic token refresh for session management
- **Complex decoding:** Handles multiple role claims in JWT
- **Real API calls:** Login, logout, refresh, etc.

---

## 💼 New Payroll App (Employee Management)

### User Roles (2 Roles)

```typescript
export const USER_ROLES = {
  EMPLOYEE: 'Employee',   // Regular employee
  MANAGER: 'Manager',     // HR/Payroll manager
}
```

### How Roles Work

#### 1. **Simple 2-Role System**
- Users can have **Employee**, **Manager**, or **BOTH** roles
- Users **CAN switch between roles** if they have multiple roles
- Role switching is client-side (for now)

#### 2. **Role Storage in Dummy Auth**
```typescript
// Example user object (dummy data):
{
  uid: 'emp-001',
  name: 'John Employee',
  email: 'employee@test.com',
  role: 'Employee',              // Current active role (single string)
  availableRoles: ['Employee']   // Roles user can switch to
}

// User with both roles:
{
  uid: 'adm-001',
  name: 'Alex Smith',
  email: 'admin@test.com',
  role: 'Employee',              // Current role
  availableRoles: ['Employee', 'Manager']  // Can switch
}
```

**Key Difference:** The new app uses `role` (singular) for the current active role and `availableRoles` (array) for all roles the user has access to.

#### 3. **Role-Based Access Control**
```typescript
// Feature permissions defined in role groups
export const ROLE_GROUPS = {
  MANAGER_ONLY: [USER_ROLES.MANAGER],
  EMPLOYEE_ONLY: [USER_ROLES.EMPLOYEE],
  ALL_USERS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
  
  // Feature-specific permissions
  CAN_APPROVE_REQUESTS: [USER_ROLES.MANAGER],
  CAN_APPROVE_LEAVES: [USER_ROLES.MANAGER],
  CAN_APPROVE_PAYSLIPS: [USER_ROLES.MANAGER],
  CAN_VIEW_ALL_ATTENDANCE: [USER_ROLES.MANAGER],
  
  CAN_SUBMIT_REQUESTS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
  CAN_VIEW_OWN_PAYSLIPS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
};
```

#### 4. **Role Verification**
```typescript
// Check if user can access a feature
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../constants/userRoles';

const { currentRole } = usePayrollAuth();
const canApprove = hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE_REQUESTS);

// Example in component:
{canApprove && (
  <Button title="Approve" onPress={handleApprove} />
)}
```

#### 5. **Role Switching**
```typescript
// User clicks role switcher button
const { switchRole } = usePayrollAuth();

// Switch from Employee to Manager
await switchRole('Manager');
// Updates user.role and saves to SecureStore
// UI automatically updates to show Manager features
```

#### 6. **Authentication Flow (Dummy Data)**
```
Login Screen → Enter Credentials
                     ↓
          Check against dummy users array
                     ↓
          Match found? → Create user object
                     ↓
          Store in SecureStore (payroll_user)
                     ↓
      PayrollAuthContext provides user data
                     ↓
      Components check currentRole for features
                     ↓
  User clicks Role Switcher → switchRole()
                     ↓
      Update user.role → Save to SecureStore
                     ↓
          UI re-renders with new permissions
```

### Dummy Data (For Development)
- **Client-side validation:** Hardcoded users in app
- **No real backend:** All auth logic in PayrollAuthContext
- **Simple storage:** Just user object in SecureStore
- **No token decoding:** Direct user object
- **Manual role switching:** User-triggered via UI

---

## 📊 Key Differences Summary

| Feature | Old LetlinkMobile App | New Payroll App |
|---------|----------------------|-----------------|
| **Number of Roles** | 4 roles | 2 roles |
| **Role Assignment** | Backend assigns | Hardcoded dummy data |
| **Multiple Roles** | Yes (stored as array in JWT) | Yes (stored as `availableRoles`) |
| **Active Role** | `ActiveRole` field in JWT | `role` field in user object |
| **Role Switching** | Not implemented (could be added) | Fully implemented with UI |
| **Authentication** | Real backend API with JWT | Dummy validation in app |
| **Token Management** | JWT decode, refresh tokens | Simple JSON storage |
| **Role Storage** | JWT token payload | SecureStore user object |
| **Permission Check** | `hasRoleAccess(user.role, allowedRoles)` | `hasRoleAccess(currentRole, allowedRoles)` |
| **Context Provider** | `AuthProvider` + `useAuth()` | `PayrollAuthProvider` + `usePayrollAuth()` |
| **Complexity** | High (real auth, API, tokens) | Low (dummy data, simple logic) |

---

## 🔄 How Role Switching Works (Payroll App Only)

### Step-by-Step Process

**Step 1: User Login**
```typescript
// User logs in with admin@test.com (has both roles)
User Object Created:
{
  uid: 'adm-001',
  name: 'Alex Smith',
  email: 'admin@test.com',
  role: 'Employee',  // ← Starts as Employee
  availableRoles: ['Employee', 'Manager']
}
```

**Step 2: Check Current Role**
```typescript
// Component checks role
const { currentRole } = usePayrollAuth();  // Returns 'Employee'

// Check permissions
const canApprove = hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE_REQUESTS);
// Returns false because Employee cannot approve
```

**Step 3: User Clicks Role Switcher**
```typescript
// RoleSwitcher component shows modal
// User selects "Manager"
await switchRole('Manager');
```

**Step 4: Role Updated**
```typescript
// PayrollAuthContext updates user
Updated User Object:
{
  uid: 'adm-001',
  name: 'Alex Smith',
  email: 'admin@test.com',
  role: 'Manager',  // ← Now Manager
  availableRoles: ['Employee', 'Manager']
}

// Save to SecureStore
await SecureStore.setItemAsync('payroll_user', JSON.stringify(updatedUser));
```

**Step 5: UI Updates Automatically**
```typescript
// React Context triggers re-render
const canApprove = hasRoleAccess('Manager', ROLE_GROUPS.CAN_APPROVE_REQUESTS);
// Returns true! Manager can approve

// Approve/Reject buttons now visible
{canApprove && (
  <>
    <Button title="Approve" />
    <Button title="Reject" />
  </>
)}
```

---

## 💡 Why Are They Different?

### Old LetlinkMobile App
- **Production app** with real users and backend
- Needs **secure JWT authentication**
- **Complex role hierarchy** (Admin, User, Lawyer, Law Firm)
- **Backend determines roles** (security requirement)
- No role switching needed (roles are tied to user type)

### New Payroll App
- **Development/testing phase** with dummy data
- Focuses on **UI/UX implementation** first
- **Simple 2-role system** (Employee/Manager)
- **Frontend-only for now** (will integrate backend later)
- **Role switching** is a key feature (one person can be both employee and manager)

---

## 🚀 Migration Path: Dummy → Real Auth

When you're ready to integrate with a real backend, here's what changes:

### 1. Update PayrollAuthContext
```typescript
// Replace dummy validation with API call
const login = async (email: string, password: string) => {
  // OLD: Check hardcoded array
  // NEW: Call backend API
  const response = await axios.post('/api/auth/login', { email, password });
  const { token, refreshToken } = response.data;
  
  // Decode JWT to get user info
  const userInfo = decodeToken(token);
  
  // Store tokens
  await SecureStore.setItemAsync('authToken', token);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  
  setUser(userInfo);
};
```

### 2. Add JWT Decoding
```typescript
// Decode token to extract user data
const decodeToken = (token: string): PayrollUser => {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    uid: payload.uid,
    name: payload.name,
    email: payload.email,
    role: payload.ActiveRole || payload.role[0],
    availableRoles: Array.isArray(payload.role) ? payload.role : [payload.role],
  };
};
```

### 3. Backend Role Switching
```typescript
// Call backend API to switch role
const switchRole = async (newRole: string) => {
  const response = await axios.post('/api/auth/switch-role', { role: newRole });
  const newToken = response.data.token;
  
  // Update stored token
  await SecureStore.setItemAsync('authToken', newToken);
  
  // Update user state
  const updatedUser = decodeToken(newToken);
  setUser(updatedUser);
};
```

---

## 📝 Code Examples

### Old App: Checking Role
```typescript
// src/navigation/guards/RoleGuard.tsx
import { useAuth } from '../features/auth/context/AuthContext';
import { USER_ROLES, hasRoleAccess, ROLE_GROUPS } from '../constants/userRoles';

const { user } = useAuth();
const userRole = user?.UserInfo?.role;  // Can be string[] or string

// Check if user can access cases
if (hasRoleAccess(userRole, ROLE_GROUPS.CASES_ACCESS)) {
  // Show cases screen
}
```

### New App: Checking Role
```typescript
// payroll/components/requests/RequestCard.tsx
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../constants/userRoles';

const { currentRole } = usePayrollAuth();

// Check if user can approve
const canApprove = hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE_REQUESTS);

{canApprove && (
  <View style={styles.actions}>
    <Button title="Approve" onPress={handleApprove} />
    <Button title="Reject" onPress={handleReject} />
  </View>
)}
```

---

## 🎯 Summary

### Old LetlinkMobile App (Production)
✅ Real backend authentication  
✅ JWT token with complex decoding  
✅ 4-role system (Admin, User, Lawyer, LawFirm)  
✅ Multiple roles per user supported  
✅ Backend-driven role assignment  
❌ No role switching UI  

### New Payroll App (Development)
✅ Dummy data for quick testing  
✅ Simple 2-role system (Employee, Manager)  
✅ Role switching with UI  
✅ Multiple roles per user supported  
✅ Easy to understand and debug  
⚠️ Ready to migrate to real backend  

---

## 🔗 Related Files

**Old App:**
- `src/constants/userRoles.ts` - Role definitions
- `src/features/auth/context/AuthContext.tsx` - Auth logic (1288 lines!)
- `src/navigation/guards/RoleGuard.tsx` - Role-based navigation
- `src/navigation/guards/AuthGuard.tsx` - Auth-based navigation

**New App:**
- `payroll/constants/userRoles.ts` - Role definitions
- `payroll/context/PayrollAuthContext.tsx` - Auth logic (160 lines)
- `payroll/components/RoleSwitcher.tsx` - Role switching UI
- `payroll/screens/LoginScreen.tsx` - Login with dummy data
- `payroll/screens/ProfileScreen.tsx` - Profile with logout

---

## ❓ FAQ

**Q: Why doesn't the old app have role switching?**  
A: In the legal services app, roles represent user types (customer, lawyer, firm). These are fixed identities, not permissions. A customer doesn't "switch" to being a lawyer.

**Q: Why does the new app have role switching?**  
A: In payroll, one person can be both an employee (viewing their own data) and a manager (approving others). The role switching lets them change their "hat" depending on what they're doing.

**Q: Can we add role switching to the old app?**  
A: Yes! The backend supports multiple roles (`role: ["User", "Lawyer"]`). You'd need to:
1. Create a RoleSwitcher component
2. Update the ActiveRole in the JWT
3. Call the backend to issue a new token with updated ActiveRole

**Q: When will the payroll app use real authentication?**  
A: When backend API is ready. The current structure makes migration easy - just replace the dummy validation with API calls.

**Q: How do I test different roles in the payroll app?**  
A: Use the test credentials:
- `employee@test.com` (123456) - Employee only
- `manager@test.com` (123456) - Manager only  
- `admin@test.com` (123456) - Both roles, can switch

**Q: Can I add more roles to the payroll app?**  
A: Yes! Just update:
1. `USER_ROLES` constant
2. `ROLE_GROUPS` permissions
3. Dummy users in `PayrollAuthContext`
4. `RoleSwitcher` UI
