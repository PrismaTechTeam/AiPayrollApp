# How PayrollAuthContext Works - Complete Guide

## 📍 Quick Navigation

- [File Locations](#-file-locations) - Where everything is
- [What is React Context?](#-what-is-react-context) - Basic concept
- [Structure Overview](#-structure-of-payrollauthcontext) - Code organization
- [Line-by-Line Breakdown](#-line-by-line-breakdown) - Detailed explanation
- [Complete Flow Diagrams](#-complete-flow-diagram) - Visual flows
- [How Components Use It](#-how-components-use-the-context) - Real examples
- [Quick Reference](#-quick-reference-all-file-paths) - File paths cheat sheet

---

## 🎯 What is React Context?

**React Context** is a way to share data across your entire app **without passing props** through every component.

### The Problem Without Context:

```
App
 └─ Screen1
     └─ Screen2
         └─ Screen3
             └─ Screen4
                 └─ Button (needs user data)

// You'd have to pass user through EVERY level:
<Screen1 user={user}>
  <Screen2 user={user}>
    <Screen3 user={user}>
      <Screen4 user={user}>
        <Button user={user} />
```

**This is called "Prop Drilling" and it's annoying!**

### The Solution With Context:

```
App (wraps with PayrollAuthProvider)
 └─ Screen1
     └─ Screen2
         └─ Screen3
             └─ Screen4
                 └─ Button (directly accesses user via usePayrollAuth())

// ANY component can access user:
const { user } = usePayrollAuth();
```

**Context makes user data available EVERYWHERE!**

---

## 📁 File Locations

### Main AuthContext File
```
LetlinkMobileApp/
└── payroll/
    └── context/
        └── PayrollAuthContext.tsx  ← ALL AUTH LOGIC HERE (160 lines)
```

### Files That Use PayrollAuthContext
```
LetlinkMobileApp/
├── App.tsx                          ← Wraps app with PayrollAuthProvider
│
└── payroll/
    ├── screens/
    │   ├── LoginScreen.tsx          ← Uses: login()
    │   ├── PayrollHomeScreen.tsx    ← Uses: user, currentRole
    │   └── ProfileScreen.tsx        ← Uses: user, logout()
    │
    └── components/
        ├── RoleSwitcher.tsx         ← Uses: currentRole, switchRole()
        └── requests/
            └── RequestCard.tsx      ← Uses: currentRole (for permissions)
```

### Related Files
```
LetlinkMobileApp/payroll/
└── constants/
    └── userRoles.ts                 ← Role definitions & permissions
```

---

## 📦 Structure of PayrollAuthContext

**File:** `payroll/context/PayrollAuthContext.tsx` (160 lines)

```typescript
PayrollAuthContext
├─ 1. Types/Interfaces (Lines 9-25)
│  ├─ PayrollUser (what user data looks like)
│  └─ PayrollAuthContextType (what context provides)
│
├─ 2. Context Creation (Line 27)
│  └─ createContext() (creates the "box" for data)
│
├─ 3. Provider Component (Lines 29-151)
│  ├─ State (user, isLoading) - Lines 30-31
│  ├─ useEffect (check auth on app start) - Lines 34-52
│  ├─ checkStoredAuth() - Lines 38-52
│  ├─ login() - Lines 54-112
│  ├─ logout() - Lines 114-122
│  ├─ switchRole() - Lines 124-138
│  ├─ Context value object - Lines 140-148
│  └─ Provider return - Line 150
│
└─ 4. Hook for Components (Lines 153-159)
   └─ usePayrollAuth() (easy way to access context)
```

---

## 🔍 Line-by-Line Breakdown

### Part 1: Types (Lines 9-25)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 9-25)

```typescript
// What a user looks like
export interface PayrollUser {
  uid: string;              // Unique ID: "emp-001"
  name: string;             // Name: "John Employee"
  email: string;            // Email: "employee@test.com"
  role: string;             // Current role: "Employee"
  availableRoles?: string[]; // Roles they can switch to: ["Employee", "Manager"]
}

// What the context provides to components
interface PayrollAuthContextType {
  user: PayrollUser | null;              // Current user (or null if logged out)
  isLoading: boolean;                    // Is app checking auth?
  currentRole: string | null;            // Current active role
  availableRoles: string[];              // Roles user can switch to
  switchRole: (newRole: string) => Promise<void>;  // Function to switch roles
  login: (email: string, password: string) => Promise<void>;  // Function to login
  logout: () => Promise<void>;           // Function to logout
}
```

**Think of this as a contract:** "Here's what data you'll get from the context!"

**Where is this used?**
- Defines the structure of user data throughout the app
- Any component importing `usePayrollAuth()` gets these types

---

### Part 2: Create Context (Line 27)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (line 27)

```typescript
const PayrollAuthContext = createContext<PayrollAuthContextType | undefined>(undefined);
```

**What this does:**
- Creates an empty "box" that will hold user data
- This box can be accessed by any component in the app
- Initially empty (undefined)

**Where is this used?**
- Internal to the context file
- Used by `PayrollAuthProvider` and `usePayrollAuth()`

---

### Part 3: Provider Component (Lines 29-151)

This is the **BRAIN** of the auth system. It manages everything!

#### 3.1: State Variables (Lines 30-31)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 30-31)

```typescript
const [user, setUser] = useState<PayrollUser | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

**What these do:**
- `user`: Stores current logged-in user (or null if logged out)
- `isLoading`: Shows if app is still checking if user is logged in

**Think of state as variables that trigger UI updates when they change.**

**Where is this used?**
- `user` → Accessed by all components via `usePayrollAuth()`
- `isLoading` → Used by `App.tsx` to show loading screen

---

#### 3.2: Check Auth on App Start (Lines 34-52)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 34-52)

```typescript
// This runs ONCE when app starts
useEffect(() => {
  checkStoredAuth();
}, []);

const checkStoredAuth = async () => {
  try {
    // Look in SecureStore for saved user
    const storedUser = await SecureStore.getItemAsync('payroll_user');
    
    if (storedUser) {
      // Found a user! Parse JSON and set state
      const userData = JSON.parse(storedUser);
      setUser(userData);  // ← This makes user available to entire app
      console.log('✅ Loaded stored user:', userData.name);
    }
    // If no user found, they need to login
  } catch (error) {
    console.error('Error checking stored auth:', error);
  } finally {
    setIsLoading(false);  // ← Done checking, show app
  }
};
```

**Flow:**
```
App Starts
    ↓
useEffect runs checkStoredAuth()
    ↓
Check SecureStore for 'payroll_user'
    ↓
┌─────────────────┬─────────────────┐
│ User Found      │ No User Found   │
│ ↓               │ ↓               │
│ Parse JSON      │ user = null     │
│ setUser(data)   │                 │
│ ↓               │ ↓               │
│ Show App        │ Show Login      │
└─────────────────┴─────────────────┘
```

---

#### 3.3: Login Function (Lines 54-112)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 54-112)

```typescript
const login = async (email: string, password: string) => {
  setIsLoading(true);  // Show loading
  
  try {
    // Dummy users array (for testing only)
    const DUMMY_USERS = [
      { email: 'employee@test.com', password: '123456', ... },
      { email: 'manager@test.com', password: '123456', ... },
      { email: 'admin@test.com', password: '123456', ... },
    ];

    // Find matching user by email & password
    const matchedUser = DUMMY_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!matchedUser) {
      throw new Error('Invalid email or password');  // No match found
    }

    // Create user object
    const mockUser: PayrollUser = {
      uid: matchedUser.uid,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      availableRoles: matchedUser.availableRoles,
    };

    // Save to SecureStore (encrypted storage)
    await SecureStore.setItemAsync('payroll_user', JSON.stringify(mockUser));
    
    // Update state (triggers UI re-render)
    setUser(mockUser);  // ← User is now available to entire app!
    
    console.log('✅ User logged in:', mockUser.name);
  } catch (error) {
    console.error('Login error:', error);
    throw error;  // Let LoginScreen handle error
  } finally {
    setIsLoading(false);  // Hide loading
  }
};
```

**Flow:**
```
User enters email/password on LoginScreen
    ↓
LoginScreen calls: login('employee@test.com', '123456')
    ↓
setIsLoading(true) → Show "Logging in..."
    ↓
Search DUMMY_USERS for matching email/password
    ↓
┌─────────────────────┬─────────────────────┐
│ Match Found         │ No Match            │
│ ↓                   │ ↓                   │
│ Create user object  │ Throw error         │
│ ↓                   │ ↓                   │
│ Save to SecureStore │ Show "Invalid"      │
│ ↓                   │                     │
│ setUser(mockUser)   │                     │
│ ↓                   │                     │
│ Navigate to Home    │                     │
└─────────────────────┴─────────────────────┘
```

---

#### 3.4: Logout Function (Lines 114-122)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 114-122)

```typescript
const logout = async () => {
  try {
    // Delete user from SecureStore
    await SecureStore.deleteItemAsync('payroll_user');
    
    // Clear user state
    setUser(null);  // ← User is now null, triggers redirect to login
    
    console.log('✅ User logged out');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

**Flow:**
```
User clicks "Logout" button
    ↓
Component calls: logout()
    ↓
Delete 'payroll_user' from SecureStore
    ↓
setUser(null)
    ↓
App.tsx sees user = null
    ↓
Navigate to LoginScreen
```

---

#### 3.5: Switch Role Function (Lines 124-138)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 124-138)

```typescript
const switchRole = async (newRole: string) => {
  // Validation: Check if user can switch to this role
  if (!user || !user.availableRoles?.includes(newRole)) {
    throw new Error('Invalid role or user not authorized');
  }

  try {
    // Create updated user object with new role
    const updatedUser = { ...user, role: newRole };
    
    // Save to SecureStore
    await SecureStore.setItemAsync('payroll_user', JSON.stringify(updatedUser));
    
    // Update state
    setUser(updatedUser);  // ← All components re-render with new role!
    
    console.log(`✅ Role switched to: ${newRole}`);
  } catch (error) {
    console.error('Error switching role:', error);
    throw error;
  }
};
```

**Flow:**
```
User clicks role badge "Employee ▼"
    ↓
Modal shows: ● Employee  ○ Manager
    ↓
User selects "Manager"
    ↓
Component calls: switchRole('Manager')
    ↓
Validate: Does user.availableRoles include 'Manager'? YES
    ↓
Create updatedUser = { ...user, role: 'Manager' }
    ↓
Save to SecureStore
    ↓
setUser(updatedUser)
    ↓
ALL components re-render
    ↓
Components check: hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE)
    ↓
Approve buttons now visible! ✅
```

---

#### 3.6: Context Value (Lines 140-148)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 140-148)

```typescript
const value = {
  user,                                 // Current user object
  isLoading,                            // Loading state
  currentRole: user?.role || null,      // Shortcut to current role
  availableRoles: user?.availableRoles || [],  // Shortcut to available roles
  switchRole,                           // Function reference
  login,                                // Function reference
  logout,                               // Function reference
};
```

**What this does:**
- Bundles all data and functions into one object
- This is what components receive when they call `usePayrollAuth()`

---

#### 3.7: Provider Return (Line 150)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (line 150)

```typescript
return <PayrollAuthContext.Provider value={value}>{children}</PayrollAuthContext.Provider>;
```

**What this does:**
- Wraps the entire app with the context
- Makes `value` available to all child components
- `children` = all your app screens

**Where is this used?**
- In `App.tsx`, wrapping the entire app:
  ```typescript
  <PayrollAuthProvider>
    <NavigationContainer>
      <Stack.Navigator>...</Stack.Navigator>
    </NavigationContainer>
  </PayrollAuthProvider>
  ```

---

### Part 4: Custom Hook (Lines 153-159)

**📁 File:** `payroll/context/PayrollAuthContext.tsx` (lines 153-159)

```typescript
export const usePayrollAuth = () => {
  const context = useContext(PayrollAuthContext);
  if (!context) {
    throw new Error('usePayrollAuth must be used within PayrollAuthProvider');
  }
  return context;
};
```

**What this does:**
- Provides an easy way for components to access the context
- Validates that component is inside the Provider
- Returns the context value (user, login, logout, etc.)

**Usage in components:**
```typescript
const { user, currentRole, login, logout } = usePayrollAuth();
```

**Where is this used?**
- Imported in **every component** that needs auth data:
  - `payroll/screens/LoginScreen.tsx`
  - `payroll/screens/PayrollHomeScreen.tsx`
  - `payroll/screens/ProfileScreen.tsx`
  - `payroll/components/RoleSwitcher.tsx`
  - `payroll/components/requests/RequestCard.tsx`
  - And more...

---

## 🔄 Complete Flow Diagram

### Flow 1: App Start (First Time, No User)

```
┌─────────────────────────────────────────────────────────────┐
│                    APP STARTS (First Time)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ App.tsx renders                                              │
│ <PayrollAuthProvider>                                        │
│   <AuthenticatedApp />                                       │
│ </PayrollAuthProvider>                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PayrollAuthProvider initializes                              │
│ - user = null                                                │
│ - isLoading = true                                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ useEffect runs → checkStoredAuth()                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ SecureStore.getItemAsync('payroll_user')                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                    Returns null
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ setIsLoading(false)                                          │
│ user remains null                                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AuthenticatedApp checks: user === null ?                     │
│ YES → Show LoginScreen                                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 2: User Logs In

```
┌─────────────────────────────────────────────────────────────┐
│               USER ON LOGIN SCREEN                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
User enters: employee@test.com / 123456
                          ↓
User clicks "Sign In"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ LoginScreen calls:                                           │
│ const { login } = usePayrollAuth();                          │
│ await login(email, password);                                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PayrollAuthContext.login() executes                          │
│ 1. setIsLoading(true) → Show "Signing in..."                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Search DUMMY_USERS array                                  │
│    Find: { email: 'employee@test.com', password: '123456' } │
│    Found! ✅                                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Create mockUser object:                                   │
│    {                                                         │
│      uid: 'emp-001',                                         │
│      name: 'John Employee',                                  │
│      email: 'employee@test.com',                             │
│      role: 'Employee',                                       │
│      availableRoles: ['Employee']                            │
│    }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SecureStore.setItemAsync('payroll_user', JSON.stringify) │
│    Saved to encrypted storage! 🔐                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. setUser(mockUser)                                         │
│    Context value updates!                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ALL COMPONENTS RE-RENDER                                  │
│    AuthenticatedApp sees: user !== null                      │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Navigate to PayrollHomeScreen                             │
│    User sees: "Good Morning, John! 👋"                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 3: App Restart (User Already Logged In)

```
┌─────────────────────────────────────────────────────────────┐
│              APP STARTS (User previously logged in)          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PayrollAuthProvider initializes                              │
│ - user = null (initially)                                    │
│ - isLoading = true                                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ useEffect → checkStoredAuth()                                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ SecureStore.getItemAsync('payroll_user')                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
Returns: '{"uid":"emp-001","name":"John Employee",...}'
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ JSON.parse(storedUser)                                       │
│ userData = {                                                 │
│   uid: 'emp-001',                                            │
│   name: 'John Employee',                                     │
│   ...                                                        │
│ }                                                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ setUser(userData)                                            │
│ setIsLoading(false)                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AuthenticatedApp sees: user !== null                         │
│ Navigate directly to PayrollHomeScreen                       │
│ User doesn't need to login again! ✅                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Role Switching

```
┌─────────────────────────────────────────────────────────────┐
│            USER ON HOME SCREEN (Alex Smith)                  │
│            Current role: Employee                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
User clicks: "👤 Employee ▼"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ RoleSwitcher modal opens                                     │
│ ● Employee (current)                                         │
│ ○ Manager                                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
User selects "Manager" → Clicks "Switch Role"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ RoleSwitcher calls:                                          │
│ const { switchRole } = usePayrollAuth();                     │
│ await switchRole('Manager');                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PayrollAuthContext.switchRole('Manager') executes            │
│ 1. Validate: availableRoles.includes('Manager') ? YES ✅     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Create updatedUser:                                       │
│    { ...user, role: 'Manager' }                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SecureStore.setItemAsync('payroll_user', updated)         │
│    Saved! 🔐                                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. setUser(updatedUser)                                      │
│    Context updates! All components re-render                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Components check permissions:                             │
│    const canApprove = hasRoleAccess('Manager', ...)          │
│    Returns TRUE! ✅                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. UI Updates:                                               │
│    - Role badge: "👤 Manager ▼"                             │
│    - Approve/Reject buttons now visible on cards             │
│    - Restore buttons now visible                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 5: Logout

```
┌─────────────────────────────────────────────────────────────┐
│               USER ON PROFILE SCREEN                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
User scrolls down → Clicks "Logout" button
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Confirmation dialog:                                         │
│ "Are you sure you want to logout?"                          │
│ [Cancel] [Logout]                                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
User clicks "Logout"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ ProfileScreen calls:                                         │
│ const { logout } = usePayrollAuth();                         │
│ await logout();                                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ PayrollAuthContext.logout() executes                         │
│ 1. SecureStore.deleteItemAsync('payroll_user')              │
│    Deleted from storage! 🗑️                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. setUser(null)                                             │
│    Context updates! All components re-render                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AuthenticatedApp sees: user === null                      │
│    Navigate to LoginScreen                                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ User sees LoginScreen                                        │
│ Must login again to access app                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 How Components Use the Context

### Example 1: LoginScreen

**📁 File:** `payroll/screens/LoginScreen.tsx`

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const LoginScreen = () => {
  const { login } = usePayrollAuth();  // Get login function
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);  // Call context function
      // If successful, App.tsx will navigate to home automatically
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};
```

---

### Example 2: PayrollHomeScreen

**📁 File:** `payroll/screens/PayrollHomeScreen.tsx`

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const PayrollHomeScreen = () => {
  const { user, currentRole } = usePayrollAuth();  // Get user and role

  return (
    <View>
      <Text>Good Morning, {user?.name}! 👋</Text>
      <Text>Current Role: {currentRole}</Text>
      <RoleSwitcher />
    </View>
  );
};
```

---

### Example 3: RoleSwitcher

**📁 File:** `payroll/components/RoleSwitcher.tsx`

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const RoleSwitcher = () => {
  const { currentRole, availableRoles, switchRole } = usePayrollAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const handleRoleSwitch = async (newRole: string) => {
    try {
      await switchRole(newRole);  // Call context function
      setModalVisible(false);
      // UI will automatically update!
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text>{currentRole} ▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible}>
        {availableRoles.map((role) => (
          <TouchableOpacity key={role} onPress={() => handleRoleSwitch(role)}>
            <Text>{role}</Text>
          </TouchableOpacity>
        ))}
      </Modal>
    </View>
  );
};
```

---

### Example 4: RequestCard (with Role Permissions)

**📁 File:** `payroll/components/requests/RequestCard.tsx`

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../constants/userRoles';

export const RequestCard = ({ request }) => {
  const { currentRole } = usePayrollAuth();  // Get current role
  
  // Check if user can approve
  const canApprove = hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE_REQUESTS);

  return (
    <View>
      <Text>{request.title}</Text>
      
      {/* Only show if user is Manager */}
      {canApprove && (
        <View>
          <Button title="Approve" onPress={handleApprove} />
          <Button title="Reject" onPress={handleReject} />
        </View>
      )}
    </View>
  );
};
```

---

### Example 5: ProfileScreen (Logout)

**📁 File:** `payroll/screens/ProfileScreen.tsx`

```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const ProfileScreen = () => {
  const { user, logout } = usePayrollAuth();  // Get user and logout function

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout',
        onPress: async () => {
          await logout();  // Call context function
          // App.tsx will navigate to LoginScreen automatically
        }
      },
    ]);
  };

  return (
    <View>
      <Text>{user?.name}</Text>
      <Text>{user?.email}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};
```

---

## 🎯 Key Concepts Summary

### 1. **Provider Pattern**
```typescript
<PayrollAuthProvider>  ← Wraps entire app
  <App />              ← All children can access context
</PayrollAuthProvider>
```

### 2. **State Management**
```typescript
const [user, setUser] = useState(null);

// When setUser() is called:
// 1. State updates
// 2. ALL components using usePayrollAuth() re-render
// 3. UI updates automatically
```

### 3. **Persistent Storage**
```typescript
// Login: Save to SecureStore
await SecureStore.setItemAsync('payroll_user', JSON.stringify(user));

// App restart: Load from SecureStore
const storedUser = await SecureStore.getItemAsync('payroll_user');
```

### 4. **Custom Hook**
```typescript
// Instead of this:
const context = useContext(PayrollAuthContext);
if (!context) throw new Error(...);
const { user } = context;

// Use this:
const { user } = usePayrollAuth();  // Much cleaner!
```

---

## 🔄 Data Flow Visualization

```
┌─────────────────────────────────────────────────────────┐
│                  PAYROLL AUTH CONTEXT                   │
│                                                         │
│  ┌─────────────────────────────────────────────── ─┐    │
│  │  STATE                                          │    │
│  │  - user: PayrollUser | null                     │    │
│  │  - isLoading: boolean                           │    │
│  └────────────────────────────────────────────── ──┘    │
│                                                         │
│  ┌────────────────────────────────────────────── ──┐    │
│  │  FUNCTIONS                                      │    │
│  │  - login(email, password)                       │    │
│  │  - logout()                                     │    │
│  │  - switchRole(newRole)                          │    │
│  │  - checkStoredAuth()                            │    │
│  └───────────────────────────────────────────── ───┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │  STORAGE                                       │     │
│  │  SecureStore: 'payroll_user' (encrypted)       │     │
│  └────────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Login    │  │ Home     │  │ Request  │
│ Screen   │  │ Screen   │  │ Card     │
│          │  │          │  │          │
│ Calls    │  │ Displays │  │ Checks   │
│ login()  │  │ user.name│  │ role     │
└──────────┘  └──────────┘  └──────────┘
```

---

## ❓ FAQ

**Q: Why use Context instead of just passing props?**
A: Context avoids "prop drilling" - you don't have to pass user through every component.

**Q: When does checkStoredAuth() run?**
A: Once, when the app starts. It checks if a user was previously logged in.

**Q: What happens when setUser() is called?**
A: React triggers a re-render of ALL components using `usePayrollAuth()`, so UI updates automatically.

**Q: Where is the user data stored?**
A: In SecureStore (encrypted) with key 'payroll_user'. It persists even when app is closed.

**Q: Can I use usePayrollAuth() in any component?**
A: Yes, as long as that component is a child of `PayrollAuthProvider`.

**Q: What happens if I try to use usePayrollAuth() outside the Provider?**
A: You'll get an error: "usePayrollAuth must be used within PayrollAuthProvider"

**Q: How does role switching update the UI?**
A: `switchRole()` calls `setUser()` with updated role, triggering re-render. Components re-check permissions and show/hide features.

**Q: Is the dummy user validation secure?**
A: NO! It's only for development. In production, you'd call a backend API for real authentication.

---

## 📋 Quick Reference: All File Paths

### Core Auth File
```
payroll/context/PayrollAuthContext.tsx  (160 lines)
├─ Types: PayrollUser, PayrollAuthContextType
├─ State: user, isLoading
├─ Functions: login(), logout(), switchRole(), checkStoredAuth()
└─ Export: PayrollAuthProvider, usePayrollAuth()
```

### Components Using Auth (Import: `usePayrollAuth()`)
```
1. App.tsx                                 → Wraps with <PayrollAuthProvider>
2. payroll/screens/LoginScreen.tsx         → login()
3. payroll/screens/ProfileScreen.tsx       → user, logout()
4. payroll/screens/PayrollHomeScreen.tsx   → user, currentRole
5. payroll/components/RoleSwitcher.tsx     → currentRole, availableRoles, switchRole()
6. payroll/components/requests/RequestCard.tsx → currentRole
```

### Related Configuration
```
payroll/constants/userRoles.ts  → USER_ROLES, ROLE_GROUPS, hasRoleAccess()
```

### Storage Location
```
SecureStore (encrypted)
└─ Key: 'payroll_user'
   Value: JSON.stringify({
     uid: string,
     name: string,
     email: string,
     role: string,
     availableRoles: string[]
   })
```

---

## 🎓 Summary

**PayrollAuthContext is like a "brain" for your app:**

1. **Stores** who is logged in
2. **Provides** login/logout functions to any component
3. **Persists** data in SecureStore (encrypted)
4. **Checks** on app start if user was previously logged in
5. **Updates** all components automatically when user changes
6. **Manages** role switching for Employee/Manager permissions

**All this in just 160 lines of code!** 🎉

**Main File:** `payroll/context/PayrollAuthContext.tsx`  
**Hook to use:** `usePayrollAuth()`  
**Storage:** SecureStore key `'payroll_user'`
