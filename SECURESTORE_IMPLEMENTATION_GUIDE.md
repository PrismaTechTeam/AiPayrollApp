# SecureStore Implementation Guide

## 📦 What is SecureStore?

**`expo-secure-store`** is a library that provides a way to **encrypt and securely store key-value pairs** on the device. It uses the device's secure storage mechanisms:

- **iOS:** Uses **Keychain Services** (hardware-backed encryption)
- **Android:** Uses **EncryptedSharedPreferences** backed by **Keystore System**
- **Web:** Uses browser's **localStorage** (not encrypted, for development only)

---

## 🔐 Why Use SecureStore?

### ✅ Use SecureStore For:
- Authentication tokens (JWT, refresh tokens)
- API keys
- User credentials (if absolutely necessary)
- Encryption keys
- Session data
- Sensitive user information
- Device identifiers

### ❌ Don't Use SecureStore For:
- Large data (has size limits: ~2KB per entry)
- Frequently changing data (slower than AsyncStorage)
- Non-sensitive data (user preferences, cache)
- Complex objects (must serialize to string first)

---

## 📚 Installation

Already installed in your project:

```json
// package.json
{
  "dependencies": {
    "expo-secure-store": "~13.0.2"
  }
}
```

---

## 🛠️ API Methods

### 1. **`setItemAsync(key, value, options?)`**
Stores a value securely.

```typescript
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('myKey', 'myValue');
```

**Parameters:**
- `key` (string): The key to store the value under
- `value` (string): The value to store (must be a string!)
- `options` (object, optional): Additional options

**Returns:** `Promise<void>`

---

### 2. **`getItemAsync(key, options?)`**
Retrieves a value from secure storage.

```typescript
const value = await SecureStore.getItemAsync('myKey');
console.log(value); // 'myValue' or null if not found
```

**Parameters:**
- `key` (string): The key to retrieve

**Returns:** `Promise<string | null>` - The value or `null` if not found

---

### 3. **`deleteItemAsync(key, options?)`**
Deletes a value from secure storage.

```typescript
await SecureStore.deleteItemAsync('myKey');
```

**Parameters:**
- `key` (string): The key to delete

**Returns:** `Promise<void>`

---

### 4. **`isAvailableAsync()`**
Checks if SecureStore is available on the current platform.

```typescript
const isAvailable = await SecureStore.isAvailableAsync();
console.log(isAvailable); // true on iOS/Android, false on web
```

**Returns:** `Promise<boolean>`

---

## 💼 Implementation in Payroll App (Simple)

### File: `payroll/context/PayrollAuthContext.tsx`

```typescript
import * as SecureStore from 'expo-secure-store';

// 1. STORING DATA (Login)
const login = async (email: string, password: string) => {
  // Create user object
  const mockUser: PayrollUser = {
    uid: 'emp-001',
    name: 'John Employee',
    email: email,
    role: 'Employee',
    availableRoles: ['Employee'],
  };

  // STORE: Convert object to JSON string
  await SecureStore.setItemAsync(
    'payroll_user',                      // Key
    JSON.stringify(mockUser)              // Value (must be string!)
  );
  
  setUser(mockUser);
};

// 2. RETRIEVING DATA (Check Auth on App Start)
const checkStoredAuth = async () => {
  try {
    // GET: Retrieve JSON string
    const storedUser = await SecureStore.getItemAsync('payroll_user');
    
    if (storedUser) {
      // PARSE: Convert JSON string back to object
      const userData = JSON.parse(storedUser);
      setUser(userData);
      console.log('✅ Loaded stored user:', userData.name);
    } else {
      console.log('❌ No stored user found');
    }
  } catch (error) {
    console.error('Error checking stored auth:', error);
  }
};

// 3. UPDATING DATA (Switch Role)
const switchRole = async (newRole: string) => {
  const updatedUser = { ...user, role: newRole };
  
  // UPDATE: Store updated object
  await SecureStore.setItemAsync(
    'payroll_user',
    JSON.stringify(updatedUser)
  );
  
  setUser(updatedUser);
};

// 4. DELETING DATA (Logout)
const logout = async () => {
  try {
    // DELETE: Remove from secure storage
    await SecureStore.deleteItemAsync('payroll_user');
    setUser(null);
    console.log('✅ User logged out');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## 🏢 Implementation in Old LetlinkMobile App (Complex)

### File: `src/features/auth/context/AuthContext.tsx`

```typescript
import * as SecureStore from 'expo-secure-store';

// 1. STORING MULTIPLE KEYS (Login)
const signin = async (email: string, password: string) => {
  const response = await axios.post('/api/auth/login', { email, password });
  const { token, refreshToken } = response.data.content;
  
  // Store JWT token
  await SecureStore.setItemAsync('authToken', token);
  
  // Store refresh token
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  
  console.log('💾 Tokens stored in SecureStore');
};

// 2. DEVICE ID MANAGEMENT (Get or Create)
const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    let deviceId = await SecureStore.getItemAsync('deviceId');
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Store for future use
      await SecureStore.setItemAsync('deviceId', deviceId);
      console.log('📱 Generated new device ID:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting/creating device ID:', error);
    // Fallback if SecureStore fails
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
};

// 3. RETRIEVING TOKEN FOR API CALLS
const checkAuthentication = async () => {
  try {
    // Get token from secure storage
    const token = await SecureStore.getItemAsync('authToken');
    
    if (token) {
      // Decode JWT token
      const UserInfo = decodeToken(token);
      
      // Update auth state
      dispatch({
        type: 'AUTH_STATE_CHANGED',
        payload: {
          isAuthenticated: true,
          user: { UserInfo },
        },
      });
    } else {
      console.log('❌ No token found');
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    // Clear invalid token
    await SecureStore.deleteItemAsync('authToken');
  }
};

// 4. TOKEN REFRESH
const RenewToken = async () => {
  try {
    // Get refresh token
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const deviceId = await SecureStore.getItemAsync('deviceId');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Call refresh endpoint
    const response = await axios.post('/api/auth/refresh-token', {
      refreshToken,
      deviceId,
      clientType: 'mobile',
    });
    
    const { token, refreshToken: newRefreshToken } = response.data.content;
    
    // Update stored tokens
    await SecureStore.setItemAsync('authToken', token);
    if (newRefreshToken) {
      await SecureStore.setItemAsync('refreshToken', newRefreshToken);
    }
    
    console.log('✅ Token refreshed successfully');
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
  }
};

// 5. LOGOUT (Clear All Tokens)
const logout = async () => {
  try {
    // Delete all auth-related keys
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('temp2FAToken');
    await SecureStore.deleteItemAsync('temp2FAUserId');
    // Note: Keep deviceId for future logins
    
    dispatch({
      type: 'AUTH_STATE_CHANGED',
      payload: {
        isAuthenticated: false,
        user: null,
      },
    });
    
    console.log('✅ Logout completed');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// 6. STORING PHONE LOGIN DATA
const verifyPhoneOtp = async (phoneNumber: string, otp: string) => {
  const response = await axios.post('/api/auth/phone-auth', {
    phoneNumber,
    otp,
  });
  
  const userData = response.data.content;
  
  // Store multiple pieces of data
  if (userData.token) {
    await SecureStore.setItemAsync('authToken', userData.token);
  }
  if (userData.userId) {
    await SecureStore.setItemAsync('userId', userData.userId);
  }
  if (userData.phoneNumber) {
    await SecureStore.setItemAsync('phoneNumber', userData.phoneNumber);
  }
  if (userData.userType) {
    await SecureStore.setItemAsync('userType', userData.userType);
  }
  if (userData.fullName) {
    await SecureStore.setItemAsync('fullName', userData.fullName);
  }
  
  console.log('✅ Phone login data stored');
};
```

---

## 🔧 Using SecureStore in API Client

### File: `src/services/api/client/index.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// REQUEST INTERCEPTOR
// Automatically add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get token from SecureStore
      const token = await SecureStore.getItemAsync('authToken');
      
      if (token) {
        // Add to Authorization header
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Auth token added to request');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // Call refresh endpoint
        const response = await axios.post('/api/auth/refresh-token', {
          refreshToken,
        });
        
        const { token } = response.data.content;
        
        // Store new token
        await SecureStore.setItemAsync('authToken', token);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('refreshToken');
        
        // Redirect to login
        console.error('❌ Session expired');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🎯 Common Patterns

### Pattern 1: Storing Objects

```typescript
// ❌ WRONG - Can't store objects directly
await SecureStore.setItemAsync('user', { name: 'John' }); // ERROR!

// ✅ CORRECT - Convert to JSON string first
await SecureStore.setItemAsync('user', JSON.stringify({ name: 'John' }));

// Retrieve and parse
const userJson = await SecureStore.getItemAsync('user');
if (userJson) {
  const user = JSON.parse(userJson);
  console.log(user.name); // 'John'
}
```

---

### Pattern 2: Checking if Key Exists

```typescript
// Check if key exists
const token = await SecureStore.getItemAsync('authToken');

if (token) {
  console.log('✅ Token exists:', token);
} else {
  console.log('❌ No token found');
}
```

---

### Pattern 3: Try-Catch for Error Handling

```typescript
try {
  const token = await SecureStore.getItemAsync('authToken');
  
  if (!token) {
    throw new Error('No token found');
  }
  
  // Use token
  console.log('Token:', token);
} catch (error) {
  console.error('Error reading token:', error);
  // Handle error (show login screen, etc.)
}
```

---

### Pattern 4: Conditional Storage

```typescript
// Only store if value exists
const storeTokens = async (token: string, refreshToken?: string) => {
  // Always store auth token
  await SecureStore.setItemAsync('authToken', token);
  
  // Only store refresh token if provided
  if (refreshToken) {
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    console.log('💾 Refresh token stored');
  }
};
```

---

### Pattern 5: Batch Operations

```typescript
// Store multiple keys
const storeUserData = async (userData: any) => {
  await Promise.all([
    SecureStore.setItemAsync('authToken', userData.token),
    SecureStore.setItemAsync('refreshToken', userData.refreshToken),
    SecureStore.setItemAsync('userId', userData.userId),
    SecureStore.setItemAsync('userName', userData.userName),
  ]);
  
  console.log('✅ All user data stored');
};

// Delete multiple keys
const clearUserData = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync('authToken'),
    SecureStore.deleteItemAsync('refreshToken'),
    SecureStore.deleteItemAsync('userId'),
    SecureStore.deleteItemAsync('userName'),
  ]);
  
  console.log('✅ All user data cleared');
};
```

---

## 🔐 Security Features

### 1. **Hardware-Backed Encryption (iOS)**
- Uses **Keychain Services**
- Data is encrypted with device-specific keys
- Keys are stored in **Secure Enclave** (hardware chip)
- Data survives app reinstall (if backup is enabled)

### 2. **EncryptedSharedPreferences (Android)**
- Uses **Android Keystore System**
- Data is encrypted with AES-256
- Keys are stored in hardware security module (if available)
- Protected by device lock screen

### 3. **Protection Levels**

```typescript
// iOS: Set when data can be accessed
await SecureStore.setItemAsync('key', 'value', {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
  // Options:
  // - WHEN_UNLOCKED: Only when device is unlocked
  // - AFTER_FIRST_UNLOCK: After first unlock (default)
  // - ALWAYS: Anytime (less secure)
  // - WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: Requires passcode
});
```

---

## ⚠️ Important Considerations

### 1. **Size Limits**
- **iOS:** ~2KB per key
- **Android:** No strict limit, but keep small
- For large data, use AsyncStorage or file system

### 2. **Performance**
- **Slower than AsyncStorage** (encryption overhead)
- Use for sensitive data only
- Don't call in rapid succession

### 3. **Persistence**
- Data **survives app updates**
- Data **survives app reinstall** (on iOS with backup enabled)
- Data is **deleted when app is uninstalled** (usually)

### 4. **Web Support**
- Falls back to **localStorage** (NOT encrypted!)
- Only use for development
- Production apps should detect platform

### 5. **Error Handling**
- Always wrap in try-catch
- Handle SecureStore unavailability
- Provide fallback for web

```typescript
const storeToken = async (token: string) => {
  try {
    // Check if available (important for web)
    const isAvailable = await SecureStore.isAvailableAsync();
    
    if (!isAvailable) {
      console.warn('⚠️ SecureStore not available, using fallback');
      // Use AsyncStorage as fallback
      await AsyncStorage.setItem('authToken', token);
      return;
    }
    
    await SecureStore.setItemAsync('authToken', token);
  } catch (error) {
    console.error('Error storing token:', error);
    // Handle error
  }
};
```

---

## 📊 Comparison: SecureStore vs AsyncStorage

| Feature | SecureStore | AsyncStorage |
|---------|-------------|--------------|
| **Encryption** | ✅ Yes (hardware-backed) | ❌ No (plain text) |
| **Use For** | Tokens, credentials, keys | Preferences, cache, UI state |
| **Speed** | 🐢 Slower (encryption) | 🚀 Faster |
| **Size Limit** | ~2KB per key | ~6MB total |
| **Platform** | iOS, Android (not web) | iOS, Android, Web |
| **Security** | 🔐 High | 🔓 Low |
| **When to Use** | Sensitive data | Non-sensitive data |

---

## 🎯 Best Practices

### ✅ DO:
1. **Use for sensitive data only** (tokens, keys, credentials)
2. **Always wrap in try-catch** (handle errors gracefully)
3. **Serialize objects to JSON** before storing
4. **Check availability** on web platforms
5. **Clear on logout** (delete all sensitive keys)
6. **Use consistent key names** (e.g., 'authToken', not 'auth_token' or 'token')

### ❌ DON'T:
1. **Don't store large data** (use AsyncStorage or file system)
2. **Don't store non-sensitive data** (wastes encryption overhead)
3. **Don't call excessively** (cache in memory when possible)
4. **Don't forget to handle web** (SecureStore not available)
5. **Don't store passwords** (use backend authentication)
6. **Don't rely on SecureStore for user session** alone (always validate with backend)

---

## 🧪 Testing SecureStore

```typescript
// Example test
describe('SecureStore', () => {
  beforeEach(async () => {
    // Clear all keys before each test
    await SecureStore.deleteItemAsync('testKey');
  });
  
  it('should store and retrieve value', async () => {
    await SecureStore.setItemAsync('testKey', 'testValue');
    const value = await SecureStore.getItemAsync('testKey');
    expect(value).toBe('testValue');
  });
  
  it('should return null for missing key', async () => {
    const value = await SecureStore.getItemAsync('missingKey');
    expect(value).toBeNull();
  });
  
  it('should delete value', async () => {
    await SecureStore.setItemAsync('testKey', 'testValue');
    await SecureStore.deleteItemAsync('testKey');
    const value = await SecureStore.getItemAsync('testKey');
    expect(value).toBeNull();
  });
});
```

---

## 📝 Summary

### Payroll App Uses SecureStore For:
```typescript
'payroll_user' → Entire user object (uid, name, email, role, availableRoles)
```

### Old LetlinkMobile App Uses SecureStore For:
```typescript
'authToken'      → JWT access token
'refreshToken'   → Refresh token for token renewal
'deviceId'       → Unique device identifier
'temp2FAToken'   → Temporary token for 2FA flow
'temp2FAUserId'  → User ID during 2FA
'userId'         → User ID from phone login
'phoneNumber'    → User's phone number
'userType'       → User type from phone login
'fullName'       → User's full name
```

### Key Difference:
- **Payroll App:** Simple, stores 1 key (user object as JSON)
- **Old App:** Complex, stores multiple keys (tokens, user data, device info)

---

## 🔗 Related Documentation

- [Expo SecureStore Official Docs](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - App security architecture
- [ROLE_SYSTEM_COMPARISON.md](./ROLE_SYSTEM_COMPARISON.md) - How roles are stored

---

## ❓ FAQ

**Q: Is SecureStore really secure?**  
A: Yes, on iOS/Android. It uses hardware-backed encryption. On web, it falls back to localStorage (not secure).

**Q: What happens if I store large data?**  
A: iOS has a ~2KB limit per key. Android is more flexible, but encryption is slow for large data. Use AsyncStorage or file system instead.

**Q: Does data survive app reinstall?**  
A: On iOS with backup enabled, yes. On Android, usually no (unless backup is configured).

**Q: Can users access SecureStore data?**  
A: Not easily. On iOS, data is in Keychain (encrypted). On Android, it's in encrypted SharedPreferences. Requires jailbreak/root + advanced tools.

**Q: Should I store passwords?**  
A: No! Use backend authentication. SecureStore is for storing tokens received after successful authentication, not passwords.

**Q: What if SecureStore fails?**  
A: Always wrap in try-catch. Check availability first. Provide fallback (AsyncStorage for non-sensitive data, or show error for sensitive data).

**Q: Can I use SecureStore on web?**  
A: It falls back to localStorage (not encrypted). For production web apps, use backend session management instead.
