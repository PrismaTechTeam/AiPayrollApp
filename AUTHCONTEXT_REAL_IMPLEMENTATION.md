# PayrollAuthContext - Real Implementation in Files

## 📋 Table of Contents
1. [Setup in App.tsx](#1-setup-in-apptsx---wrapping-the-entire-app)
2. [LoginScreen Usage](#2-loginscreen---user-login)
3. [PayrollHomeScreen Usage](#3-payrollhomescreen---displaying-user-data)
4. [ProfileScreen Usage](#4-profilescreen---logout-functionality)
5. [RoleSwitcher Usage](#5-roleswitcher---switching-roles)
6. [RequestCard Usage](#6-requestcard---role-based-permissions)
7. [Complete Data Flow](#7-complete-data-flow-visual)

---

## 📁 Quick File Reference

| Section | File Path | What It Does |
|---------|-----------|--------------|
| **Context Provider** | `LetlinkMobileApp/payroll/context/PayrollAuthContext.tsx` | Contains all auth logic (login, logout, switchRole) |
| **App Setup** | `LetlinkMobileApp/App.tsx` | Wraps app with provider, handles navigation |
| **Login** | `LetlinkMobileApp/payroll/screens/LoginScreen.tsx` | User login form, calls `login()` |
| **Home Screen** | `LetlinkMobileApp/payroll/screens/PayrollHomeScreen.tsx` | Displays user name, shows role switcher |
| **Profile** | `LetlinkMobileApp/payroll/screens/ProfileScreen.tsx` | Shows user info, handles logout |
| **Role Switcher** | `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx` | Switch between Employee/Manager roles |
| **Request Card** | `LetlinkMobileApp/payroll/components/requests/RequestCard.tsx` | Shows/hides approve buttons based on role |

---

## 1. Setup in App.tsx - Wrapping the Entire App

### 📁 File: `App.tsx`

This is where PayrollAuthContext is set up to provide auth data to the entire app.

### Step 1: Import the Provider and Hook

**File:** `LetlinkMobileApp/App.tsx`

```typescript
// Line 15
import { PayrollAuthProvider } from './payroll/context/PayrollAuthContext';

// Line 30
import { usePayrollAuth } from './payroll/context/PayrollAuthContext';
```

### Step 2: Create a Component That Uses Auth

**File:** `LetlinkMobileApp/App.tsx`

```typescript
// Lines 48-94
function AuthenticatedApp() {
  // ⬇️ THIS IS WHERE WE ACCESS THE CONTEXT
  const { user, isLoading } = usePayrollAuth();

  // Show loading while checking if user is logged in
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'PayrollHome' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          // ⬇️ NOT LOGGED IN → Show Login Screen
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // ⬇️ LOGGED IN → Show All App Screens
          <>
            <Stack.Screen name="PayrollHome" component={PayrollHomeScreen} />
            <Stack.Screen name="Requests" component={RequestsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            {/* ... more screens */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Step 3: Wrap Everything with the Provider

**File:** `LetlinkMobileApp/App.tsx`

```typescript
// Lines 148-154
export default function App() {
  return (
    <SafeAreaProvider>
      {/* ⬇️ THIS MAKES AUTH AVAILABLE TO ALL COMPONENTS */}
      <PayrollAuthProvider>
        <AuthenticatedApp />
      </PayrollAuthProvider>
    </SafeAreaProvider>
  );
}
```

### 🔍 What's Happening Here:

```
App.tsx
   ↓
<PayrollAuthProvider>  ← Creates auth context (user, login, logout, etc.)
   ↓
<AuthenticatedApp>     ← Uses usePayrollAuth() to access context
   ↓
Checks: user === null?
   ↓
   ├─ YES → Show LoginScreen
   └─ NO  → Show PayrollHomeScreen + other screens
```

---

## 2. LoginScreen - User Login

### 📁 File: `payroll/screens/LoginScreen.tsx`

This screen lets users log in and uses the `login()` function from context.

### Step 1: Import the Hook

**File:** `LetlinkMobileApp/payroll/screens/LoginScreen.tsx`

```typescript
// Line 20
import { usePayrollAuth } from '../context/PayrollAuthContext';
```

### Step 2: Access the login() Function

**File:** `LetlinkMobileApp/payroll/screens/LoginScreen.tsx`

```typescript
// Lines 50-51
export const LoginScreen: React.FC = () => {
  const { login } = usePayrollAuth();  // ⬅️ Get login function from context
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
```

### Step 3: Call login() When User Submits

**File:** `LetlinkMobileApp/payroll/screens/LoginScreen.tsx`

```typescript
// Lines 57-71
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter email and password');
    return;
  }

  setLoading(true);
  try {
    // ⬇️ CALL THE CONTEXT FUNCTION
    await login(email, password);
    // If successful, App.tsx will automatically navigate to PayrollHome
  } catch (error: any) {
    Alert.alert('Login Failed', error.message || 'Invalid credentials');
  } finally {
    setLoading(false);
  }
};
```

### 🔍 What's Happening Here:

```
User enters email/password
   ↓
User clicks "Sign In"
   ↓
handleLogin() is called
   ↓
await login(email, password)  ← Calls PayrollAuthContext.login()
   ↓
Context validates credentials (dummy users)
   ↓
✅ Success → Context saves user to SecureStore
   ↓
Context calls setUser(userData)  ← Updates state
   ↓
ALL components using usePayrollAuth() re-render
   ↓
App.tsx sees user !== null
   ↓
Navigates to PayrollHomeScreen ✨
```

---

## 3. PayrollHomeScreen - Displaying User Data

### 📁 File: `payroll/screens/PayrollHomeScreen.tsx`

This screen displays the logged-in user's name.

### Step 1: Import the Hook

**File:** `LetlinkMobileApp/payroll/screens/PayrollHomeScreen.tsx`

```typescript
// Line 17
import { usePayrollAuth } from '../context/PayrollAuthContext';
```

### Step 2: Access User Data

**File:** `LetlinkMobileApp/payroll/screens/PayrollHomeScreen.tsx`

```typescript
// Lines 23-24
export const PayrollHomeScreen: React.FC = ({ navigation }) => {
  const { user } = usePayrollAuth();  // ⬅️ Get user data from context
```

### Step 3: Display User Data in UI

**File:** `LetlinkMobileApp/payroll/screens/PayrollHomeScreen.tsx`

```typescript
// Lines 42-45
<View style={styles.userInfo}>
  <Text style={styles.greetingTitle}>
    Hi {user?.name || 'Alex Smith'}  {/* ⬅️ Display user name */}
  </Text>
  <Text style={styles.greetingSub}>Good Morning</Text>
</View>

{/* Role Switcher */}
<RoleSwitcher />  {/* ⬅️ This also uses usePayrollAuth() */}
```

### 🔍 What's Happening Here:

```
Component renders
   ↓
const { user } = usePayrollAuth()
   ↓
Gets current user from context
   ↓
Displays: "Hi John Employee!"  ← Shows user.name
   ↓
If user changes (login/logout/role switch)
   ↓
Component automatically re-renders with new data ✨
```

---

## 4. ProfileScreen - Logout Functionality

### 📁 File: `payroll/screens/ProfileScreen.tsx`

This screen shows user profile and has a logout button.

### Step 1: Import the Hook

**File:** `LetlinkMobileApp/payroll/screens/ProfileScreen.tsx`

```typescript
// Line 19
import { usePayrollAuth } from '../context/PayrollAuthContext';
```

### Step 2: Access User Data and Logout Function

**File:** `LetlinkMobileApp/payroll/screens/ProfileScreen.tsx`

```typescript
// Lines 22-24
export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, currentRole, logout } = usePayrollAuth();  // ⬅️ Get data and functions
```

### Step 3: Use User Data in UI

**File:** `LetlinkMobileApp/payroll/screens/ProfileScreen.tsx`

```typescript
// Lines 72-80
<View style={styles.profileCard}>
  <View style={styles.avatarContainer}>
    <View style={[styles.avatar, { backgroundColor: getRoleColor(currentRole || '') }]}>
      <MaterialCommunityIcons
        name={getRoleIcon(currentRole || '')}  {/* ⬅️ Icon based on role */}
        size={48}
        color="#FFFFFF"
      />
    </View>
  </View>
  
  <Text style={styles.userName}>{user?.name || 'User'}</Text>  {/* ⬅️ User name */}
  <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>  {/* ⬅️ Email */}
  
  <View style={styles.roleBadge}>
    <Text style={styles.roleText}>{currentRole}</Text>  {/* ⬅️ Current role */}
  </View>
</View>
```

### Step 4: Handle Logout

**File:** `LetlinkMobileApp/payroll/screens/ProfileScreen.tsx`

```typescript
// Lines 26-44
const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();  // ⬅️ CALL THE CONTEXT FUNCTION
          // App.tsx will automatically navigate to LoginScreen
        },
      },
    ]
  );
};
```

### 🔍 What's Happening Here:

```
User clicks "Logout" button
   ↓
handleLogout() shows confirmation
   ↓
User confirms
   ↓
await logout()  ← Calls PayrollAuthContext.logout()
   ↓
Context deletes user from SecureStore
   ↓
Context calls setUser(null)  ← Updates state
   ↓
ALL components using usePayrollAuth() re-render
   ↓
App.tsx sees user === null
   ↓
Navigates to LoginScreen ✨
```

---

## 5. RoleSwitcher - Switching Roles

### 📁 File: `payroll/components/RoleSwitcher.tsx`

This component lets users switch between Employee and Manager roles.

### Step 1: Import the Hook

**File:** `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx`

```typescript
// Line 9
import { usePayrollAuth } from '../context/PayrollAuthContext';
```

### Step 2: Access Role Data and Switch Function

**File:** `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx`

```typescript
// Lines 12-15
export const RoleSwitcher: React.FC = () => {
  const { currentRole, availableRoles, switchRole } = usePayrollAuth();  // ⬅️ Get data
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);
```

### Step 3: Check if User Can Switch Roles

**File:** `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx`

```typescript
// Lines 17-20
// Don't show if user doesn't have multiple roles
if (!availableRoles || availableRoles.length <= 1) {
  return null;  // ⬅️ Hide component if user has only one role
}
```

### Step 4: Handle Role Switch

**File:** `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx`

```typescript
// Lines 30-46
const handleSwitchRole = async (newRole: string) => {
  if (newRole === currentRole) {
    setModalVisible(false);
    return;  // Already on this role
  }

  setSwitching(true);
  try {
    await switchRole(newRole);  // ⬅️ CALL THE CONTEXT FUNCTION
    setModalVisible(false);
    Alert.alert('Success', `Switched to ${newRole} role`);
  } catch (error) {
    Alert.alert('Error', 'Failed to switch role. Please try again.');
  } finally {
    setSwitching(false);
  }
};
```

### Step 5: Display Current Role and Available Roles

**File:** `LetlinkMobileApp/payroll/components/RoleSwitcher.tsx`

```typescript
// Lines 50-63
<TouchableOpacity
  style={styles.button}
  onPress={() => setModalVisible(true)}
>
  <MaterialCommunityIcons
    name={getRoleIcon(currentRole || '')}
    size={20}
    color={getRoleColor(currentRole || '')}
  />
  <Text style={styles.roleText}>
    {currentRole}  {/* ⬅️ Display current role */}
  </Text>
  <MaterialCommunityIcons name="chevron-down" size={16} color="#666" />
</TouchableOpacity>

{/* Modal showing all available roles */}
<Modal visible={modalVisible}>
  {availableRoles.map((role) => (  /* ⬅️ Show all available roles */
    <TouchableOpacity onPress={() => handleSwitchRole(role)}>
      <Text>{role}</Text>
    </TouchableOpacity>
  ))}
</Modal>
```

### 🔍 What's Happening Here:

```
Component renders
   ↓
const { currentRole, availableRoles, switchRole } = usePayrollAuth()
   ↓
Shows role badge: "Employee ▼"
   ↓
User clicks badge
   ↓
Modal opens showing:
  ● Employee (current)
  ○ Manager
   ↓
User selects "Manager"
   ↓
await switchRole('Manager')  ← Calls PayrollAuthContext.switchRole()
   ↓
Context updates user.role to 'Manager'
   ↓
Context saves to SecureStore
   ↓
Context calls setUser(updatedUser)  ← Updates state
   ↓
ALL components using usePayrollAuth() re-render
   ↓
Components re-check permissions
   ↓
Approve buttons now visible! ✨
```

---

## 6. RequestCard - Role-Based Permissions

### 📁 File: `payroll/components/requests/RequestCard.tsx`

This component shows/hides approve buttons based on user's role.

### Step 1: Import the Hook and Permission Helper

**File:** `LetlinkMobileApp/payroll/components/requests/RequestCard.tsx`

```typescript
// Lines 10-11
import { usePayrollAuth } from '../../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../../constants/userRoles';
```

### Step 2: Check User's Role

**File:** `LetlinkMobileApp/payroll/components/requests/RequestCard.tsx`

```typescript
// Lines 22-24
export const RequestCard: React.FC<RequestCardProps> = ({ request, ... }) => {
  // Check user role for permissions
  const { currentRole } = usePayrollAuth();  // ⬅️ Get current role
  const canApprove = hasRoleAccess(currentRole || undefined, ROLE_GROUPS.CAN_APPROVE_REQUESTS);
```

### Step 3: Conditionally Show Approve/Reject Buttons

**File:** `LetlinkMobileApp/payroll/components/requests/RequestCard.tsx`

```typescript
// Lines 26-30
// Determine if action buttons should be shown based on status AND role
const showActions = request.status === 'requested' && canApprove;
const isCancelled = request.status === 'cancelled';
const showRestoreButton = isCancelled && canApprove;
```

### Step 4: Render Buttons Based on Permissions

**File:** `LetlinkMobileApp/payroll/components/requests/RequestCard.tsx`

```typescript
// Lines 75-90
{showActions && (  /* ⬅️ ONLY SHOW IF USER IS MANAGER */
  <View style={styles.actionButtons}>
    <TouchableOpacity
      style={styles.rejectButton}
      onPress={() => onReject?.(request.id)}
    >
      <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.approveButton}
      onPress={() => onApprove?.(request.id)}
    >
      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
)}
```

### 🔍 What's Happening Here:

```
Component renders
   ↓
const { currentRole } = usePayrollAuth()  ← Get role: "Employee"
   ↓
const canApprove = hasRoleAccess('Employee', ['Manager'])
   ↓
Returns: false  ← Employee cannot approve
   ↓
showActions = false
   ↓
Approve/Reject buttons HIDDEN 🚫

───────────────────────────────

User switches to Manager role
   ↓
Context calls setUser({ ...user, role: 'Manager' })
   ↓
Component re-renders
   ↓
const { currentRole } = usePayrollAuth()  ← Get role: "Manager"
   ↓
const canApprove = hasRoleAccess('Manager', ['Manager'])
   ↓
Returns: true  ← Manager CAN approve
   ↓
showActions = true
   ↓
Approve/Reject buttons VISIBLE ✅
```

---

## 7. Complete Data Flow Visual

### Flow: Login → Display User → Logout

```
┌────────────────────────────────────────────────────────────────┐
│                     APP ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  App.tsx                                                       │
│  ┌───────────────────────────────────────────────────── ─────┐ │
│  │ <PayrollAuthProvider>                                     │ │
│  │   - State: user, isLoading                                │ │
│  │   - Functions: login(), logout(), switchRole()            │ │
│  │   - Storage: SecureStore ('payroll_user')                 │ │
│  └────────────────┬──────────────────────────────────────── ─┘ │
│                   │                                            │
│                   ▼                                            │
│  ┌──────────────────────────────────────────────────────── ──┐ │
│  │ <AuthenticatedApp>                                        │ │
│  │   const { user, isLoading } = usePayrollAuth()            │ │
│  │                                                           │ │
│  │   if (!user) → <LoginScreen />                            │ │
│  │   else       → <PayrollHomeScreen /> + other screens      │ │
│  └──────────────────────────────────────────────────── ──────┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  STEP 1: USER NOT LOGGED IN                                    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  LoginScreen                                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ const { login } = usePayrollAuth()                        │ │
│  │                                                            │ │
│  │ User enters: employee@test.com / 123456                   │ │
│  │ User clicks: "Sign In"                                    │ │
│  │                                                            │ │
│  │ await login(email, password)  ← Calls context function   │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  PayrollAuthContext.login() executes                           │
│  ┌────────────────────────────────────────────────────── ────┐ │
│  │ 1. Validate credentials (check DUMMY_USERS)               │ │
│  │ 2. Create user object: { uid, name, email, role }         │ │
│  │ 3. Save to SecureStore                                    │ │
│  │ 4. setUser(userData) ← UPDATES STATE                      │ │
│  └───────────────────────────────────────────────────── ─────┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  ALL COMPONENTS RE-RENDER                                      │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  STEP 2: USER LOGGED IN                                        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  App.tsx → AuthenticatedApp                                    │
│  ┌─────────────────────────────────────────────────────── ───┐ │
│  │ const { user } = usePayrollAuth()                         │ │
│  │                                                           │ │
│  │ user !== null ✅                                          │ │
│  │                                                           │ │
│  │ Navigate to: <PayrollHomeScreen />                        │ │
│  └──────────────────────────────────────────────────────── ──┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  PayrollHomeScreen                                             │
│  ┌──────────────────────────────────────────────────── ──────┐ │
│  │ const { user } = usePayrollAuth()                         │ │
│  │                                                           │ │
│  │ Displays:                                                 │ │
│  │ "Hi John Employee!"  ← user.name                          │ │
│  │ "Good Morning"                                            │ │
│  │ <RoleSwitcher />     ← Also uses context                  │ │
│  └───────────────────────────────────────────────────── ─────┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  STEP 3: USER VIEWS PROFILE                                    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ProfileScreen                                                 │
│  ┌─────────────────────────────────────────────────────── ───┐ │
│  │ const { user, currentRole, logout } = usePayrollAuth()    │ │
│  │                                                           │ │
│  │ Displays:                                                 │ │
│  │ Name: John Employee  ← user.name                          │ │
│  │ Email: employee@test.com  ← user.email                    │ │
│  │ Role: Employee  ← currentRole                             │ │
│  │                                                           │ │
│  │ [Logout Button]                                           │ │
│  └─────────────────────────────────────────────────────── ───┘ │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  STEP 4: USER LOGS OUT                                         │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ProfileScreen                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ User clicks: "Logout"                                    │  │
│  │                                                          │  │
│  │ await logout()  ← Calls context function                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  PayrollAuthContext.logout() executes                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Delete from SecureStore                               │  │
│  │ 2. setUser(null) ← UPDATES STATE                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  ALL COMPONENTS RE-RENDER                                      │
└────────────────────────────────────────────────────────────────┘

                              ↓

┌────────────────────────────────────────────────────────────────┐
│  App.tsx → AuthenticatedApp                                    │
│  ┌─────────────────────────────────────────── ───────────────┐ │
│  │ const { user } = usePayrollAuth()                         │ │
│  │                                                           │ │
│  │ user === null ✅                                         │ │
│  │                                                           │ │
│  │ Navigate to: <LoginScreen />                              │ │
│  └────────────────────────────────────────────────────── ────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Summary: How Each File Uses Context

| File | Import | What It Uses | What It Does |
|------|--------|--------------|--------------|
| **App.tsx** | `PayrollAuthProvider`<br>`usePayrollAuth` | `user`<br>`isLoading` | Wraps app<br>Conditional navigation |
| **LoginScreen** | `usePayrollAuth` | `login()` | Logs in user |
| **PayrollHomeScreen** | `usePayrollAuth` | `user` | Shows user name |
| **ProfileScreen** | `usePayrollAuth` | `user`<br>`currentRole`<br>`logout()` | Shows profile<br>Logs out user |
| **RoleSwitcher** | `usePayrollAuth` | `currentRole`<br>`availableRoles`<br>`switchRole()` | Switches between roles |
| **RequestCard** | `usePayrollAuth` | `currentRole` | Shows/hides approve buttons |

---

## 🎯 Key Takeaways

### 1. **One Import, Everywhere**
```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
```

### 2. **Access What You Need**
```typescript
const { user, currentRole, login, logout, switchRole } = usePayrollAuth();
```

### 3. **Automatic Updates**
When you call `login()`, `logout()`, or `switchRole()`:
- Context updates its state
- ALL components using `usePayrollAuth()` re-render
- UI updates automatically ✨

### 4. **No Prop Drilling**
You don't need to pass user data through props:
```typescript
// ❌ DON'T NEED THIS:
<Screen1 user={user}>
  <Screen2 user={user}>
    <Screen3 user={user}>

// ✅ DO THIS INSTEAD:
function Screen3() {
  const { user } = usePayrollAuth();  // Direct access!
}
```

---

## 🔗 File Paths Reference

```
LetlinkMobileApp/
├── App.tsx                                    → Setup & conditional navigation
├── payroll/
│   ├── context/
│   │   └── PayrollAuthContext.tsx             → THE BRAIN (all auth logic)
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx                    → Uses: login()
│   │   ├── PayrollHomeScreen.tsx              → Uses: user
│   │   └── ProfileScreen.tsx                  → Uses: user, logout()
│   │
│   └── components/
│       ├── RoleSwitcher.tsx                   → Uses: currentRole, switchRole()
│       └── requests/
│           └── RequestCard.tsx                → Uses: currentRole
```

---

That's it! Every component imports `usePayrollAuth()` and gets instant access to user data and functions. Simple! 🎉
