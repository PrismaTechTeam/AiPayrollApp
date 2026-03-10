# SecureStore Quick Reference Cheat Sheet

## 🚀 Basic Operations

```typescript
import * as SecureStore from 'expo-secure-store';

// ✅ STORE
await SecureStore.setItemAsync('key', 'value');

// ✅ GET
const value = await SecureStore.getItemAsync('key');  // Returns: string | null

// ✅ DELETE
await SecureStore.deleteItemAsync('key');

// ✅ CHECK AVAILABILITY
const isAvailable = await SecureStore.isAvailableAsync();  // Returns: boolean
```

---

## 📦 Storing Objects

```typescript
// ❌ WRONG
await SecureStore.setItemAsync('user', { name: 'John' });  // ERROR!

// ✅ CORRECT
const user = { name: 'John', age: 30 };
await SecureStore.setItemAsync('user', JSON.stringify(user));

// Retrieve
const userJson = await SecureStore.getItemAsync('user');
const user = JSON.parse(userJson);
```

---

## 🎯 Real-World Examples

### Login & Store Token
```typescript
const login = async (email: string, password: string) => {
  const response = await api.post('/login', { email, password });
  const { token, refreshToken } = response.data;
  
  // Store tokens
  await SecureStore.setItemAsync('authToken', token);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
};
```

### Check if Logged In
```typescript
const checkAuth = async () => {
  const token = await SecureStore.getItemAsync('authToken');
  
  if (token) {
    // User is logged in
    return true;
  } else {
    // User is not logged in
    return false;
  }
};
```

### Logout & Clear Data
```typescript
const logout = async () => {
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('userId');
};
```

### Update User Data
```typescript
const updateUser = async (newData: any) => {
  // Get existing data
  const userJson = await SecureStore.getItemAsync('user');
  const user = JSON.parse(userJson);
  
  // Update
  const updatedUser = { ...user, ...newData };
  
  // Save
  await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
};
```

---

## 🔄 Comparison with AsyncStorage

```typescript
// SECURESTORE (for sensitive data)
await SecureStore.setItemAsync('authToken', token);      // ✅ Encrypted
const token = await SecureStore.getItemAsync('authToken');
await SecureStore.deleteItemAsync('authToken');

// ASYNCSTORAGE (for non-sensitive data)
await AsyncStorage.setItem('theme', 'dark');             // ❌ Not encrypted
const theme = await AsyncStorage.getItem('theme');
await AsyncStorage.removeItem('theme');
```

---

## ⚠️ Error Handling

```typescript
try {
  const token = await SecureStore.getItemAsync('authToken');
  
  if (!token) {
    console.log('No token found');
    return null;
  }
  
  return token;
} catch (error) {
  console.error('SecureStore error:', error);
  return null;
}
```

---

## 🔐 Security Options (iOS)

```typescript
// When can data be accessed?
await SecureStore.setItemAsync('key', 'value', {
  keychainAccessible: SecureStore.WHEN_UNLOCKED  // Most secure
});

// Options:
// - WHEN_UNLOCKED              → Only when device is unlocked
// - AFTER_FIRST_UNLOCK         → After first unlock (default)
// - ALWAYS                     → Anytime (least secure)
// - WHEN_PASSCODE_SET_THIS...  → Requires device passcode
```

---

## 📱 Platform Check

```typescript
const storeToken = async (token: string) => {
  const isAvailable = await SecureStore.isAvailableAsync();
  
  if (isAvailable) {
    // iOS/Android - use SecureStore
    await SecureStore.setItemAsync('token', token);
  } else {
    // Web - use fallback
    localStorage.setItem('token', token);
  }
};
```

---

## 🎭 Keys Used in Apps

### Payroll App
```typescript
'payroll_user'  // User object (uid, name, email, role, availableRoles)
```

### Old LetlinkMobile App
```typescript
'authToken'      // JWT access token
'refreshToken'   // Refresh token
'deviceId'       // Device identifier
'temp2FAToken'   // 2FA temporary token
'temp2FAUserId'  // 2FA user ID
'userId'         // User ID
'phoneNumber'    // Phone number
'userType'       // User type
'fullName'       // User name
```

---

## ✅ Best Practices Checklist

- [ ] Use for **sensitive data only** (tokens, keys, credentials)
- [ ] Always **wrap in try-catch**
- [ ] **Convert objects to JSON** before storing
- [ ] **Check platform availability** for web support
- [ ] **Clear on logout** (delete all sensitive keys)
- [ ] **Use consistent key names** across app
- [ ] **Don't store large data** (> 2KB)
- [ ] **Don't store passwords** (use backend auth)

---

## 🚫 Common Mistakes

```typescript
// ❌ Storing objects directly
await SecureStore.setItemAsync('user', userObject);

// ✅ Convert to JSON first
await SecureStore.setItemAsync('user', JSON.stringify(userObject));

// ❌ Not handling null
const token = await SecureStore.getItemAsync('token');
console.log(token.length);  // Error if token is null!

// ✅ Check for null
const token = await SecureStore.getItemAsync('token');
if (token) {
  console.log(token.length);
}

// ❌ Not using try-catch
const token = await SecureStore.getItemAsync('token');

// ✅ Always use try-catch
try {
  const token = await SecureStore.getItemAsync('token');
} catch (error) {
  console.error(error);
}

// ❌ Storing non-sensitive data
await SecureStore.setItemAsync('theme', 'dark');

// ✅ Use AsyncStorage for non-sensitive
await AsyncStorage.setItem('theme', 'dark');
```

---

## 🧪 Quick Test

```typescript
// Test in your app
const testSecureStore = async () => {
  console.log('🧪 Testing SecureStore...');
  
  // 1. Store
  await SecureStore.setItemAsync('test', 'hello');
  console.log('✅ Stored: test = hello');
  
  // 2. Retrieve
  const value = await SecureStore.getItemAsync('test');
  console.log('✅ Retrieved:', value);  // 'hello'
  
  // 3. Delete
  await SecureStore.deleteItemAsync('test');
  console.log('✅ Deleted');
  
  // 4. Check (should be null)
  const deleted = await SecureStore.getItemAsync('test');
  console.log('✅ After delete:', deleted);  // null
  
  console.log('✅ SecureStore working correctly!');
};
```

---

## 📊 When to Use What?

```
┌─────────────────────────────────────────────────────────┐
│              DATA TYPE DECISION TREE                     │
└─────────────────────────────────────────────────────────┘

Is the data sensitive?
    ├─ YES → Is it larger than 2KB?
    │        ├─ YES → Use File System with encryption
    │        └─ NO  → Use SecureStore ✅
    │
    └─ NO  → Does it need to persist?
             ├─ YES → Use AsyncStorage
             └─ NO  → Use React State (useState)

Examples:

SecureStore:        AsyncStorage:       State:
• Auth tokens      • User preferences  • Form inputs
• API keys         • App settings      • UI toggles
• Refresh tokens   • Cache data        • Temp data
• Credentials      • Theme choice      • Loading states
• Device ID        • Language          • Modal open/close
```

---

## 🎯 Summary

| Action | Code |
|--------|------|
| **Import** | `import * as SecureStore from 'expo-secure-store';` |
| **Store** | `await SecureStore.setItemAsync('key', 'value')` |
| **Get** | `await SecureStore.getItemAsync('key')` |
| **Delete** | `await SecureStore.deleteItemAsync('key')` |
| **Check** | `await SecureStore.isAvailableAsync()` |

**Remember:** 
- ✅ **DO** use for tokens, keys, credentials
- ❌ **DON'T** use for preferences, cache, large data

---

## 📚 Full Guide

For detailed explanations, security features, and advanced usage, see:
- [`SECURESTORE_IMPLEMENTATION_GUIDE.md`](./SECURESTORE_IMPLEMENTATION_GUIDE.md)
