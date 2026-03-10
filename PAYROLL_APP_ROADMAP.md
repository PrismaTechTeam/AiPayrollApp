# Payroll Mobile App - Implementation Roadmap

## 📊 Current Status

### ✅ **What's Implemented (MVP Complete)**

| Feature | Status | Notes |
|---------|--------|-------|
| **UI/UX** | ✅ Complete | All screens designed and implemented |
| **Navigation** | ✅ Complete | Stack navigation with all routes |
| **Role System** | ✅ Complete | Employee/Manager role switching |
| **Mock Data** | ✅ Complete | All features have dummy data |
| **Authentication** | ✅ Basic | Simple auth with dummy users |
| **Screens** | ✅ Complete | 30+ screens implemented |
| **Components** | ✅ Complete | Reusable components library |
| **Theme System** | ✅ Complete | Light/Dark/High Contrast |
| **Language System** | ✅ Complete | i18n setup with 8 languages |
| **Safe Area** | ✅ Complete | Consistent across all screens |
| **Styling** | ✅ Complete | Flat design, consistent colors |

### **Feature Breakdown:**

#### **Core Features (100% Complete):**
- ✅ Leave Management (Request & Approval)
- ✅ Request Management (Submit & Approve)
- ✅ Payslip Management (View & Download)
- ✅ Attendance Tracking (Today's & History)
- ✅ Claims Management (Submit & Approve)
- ✅ Profile Management
- ✅ Settings & Preferences
- ✅ Help & Support
- ✅ Privacy Policy
- ✅ About Screen

#### **Secondary Features (100% Complete):**
- ✅ Role Switching (Employee ↔ Manager)
- ✅ Theme Switching (3 modes)
- ✅ Language Selection (8 languages)
- ✅ Notifications Screen
- ✅ Change Password Screen
- ✅ Edit Profile Screen
- ✅ Side Menu Navigation
- ✅ Bottom Tab Navigation

---

## 🎯 **Next Steps - Prioritized Roadmap**

### **Phase 1: Backend Integration (Weeks 1-3)**

This is the **MOST CRITICAL** next step to move from prototype to production.

#### **1.1 API Configuration (Week 1)**
**Priority: 🔴 CRITICAL**

**Tasks:**
```typescript
// 1. Create API configuration
// File: payroll/config/api.ts

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  register: '/api/auth/register',
  refreshToken: '/api/auth/refresh',
  switchRole: '/api/auth/switch-role',
  
  // Leaves
  leaves: '/api/leaves',
  leaveApprove: (id: string) => `/api/leaves/${id}/approve`,
  leaveReject: (id: string) => `/api/leaves/${id}/reject`,
  
  // Requests
  requests: '/api/requests',
  requestApprove: (id: string) => `/api/requests/${id}/approve`,
  requestReject: (id: string) => `/api/requests/${id}/reject`,
  
  // Payslips
  payslips: '/api/payslips',
  payslipDownload: (id: string) => `/api/payslips/${id}/download`,
  
  // Attendance
  attendance: '/api/attendance',
  attendanceToday: '/api/attendance/today',
  
  // Claims
  claims: '/api/claims',
  claimApprove: (id: string) => `/api/claims/${id}/approve`,
  claimReject: (id: string) => `/api/claims/${id}/reject`,
  
  // Profile
  profile: '/api/profile',
  profileUpdate: '/api/profile/update',
  profileAvatar: '/api/profile/avatar',
};
```

**Files to Create:**
- ✅ `payroll/config/api.ts` - API configuration
- ✅ `payroll/config/axios.ts` - Axios instance with interceptors
- ✅ `.env` - Environment variables

**Estimated Time:** 2-3 days

---

#### **1.2 Upgrade Authentication System (Week 1-2)**
**Priority: 🔴 CRITICAL**

**Replace:** Simple PayrollAuthContext  
**With:** JWT-based authentication (similar to LetlinkMobileApp)

**Tasks:**
1. Create JWT token decoder
2. Add refresh token flow
3. Add token expiration handling
4. Add device ID tracking
5. Implement proper login API call
6. Implement proper logout API call
7. Add token interceptors to axios

**Files to Update:**
- 🔄 `payroll/context/PayrollAuthContext.tsx` - Upgrade to JWT
- ✅ `payroll/services/authService.ts` - New API service
- ✅ `payroll/utils/jwtDecoder.ts` - JWT utility

**Code Example:**
```typescript
// payroll/services/authService.ts
import axios from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

export const authService = {
  login: async (email: string, password: string, deviceId: string) => {
    const response = await axios.post(API_ENDPOINTS.login, {
      email,
      password,
      deviceId,
    });
    return response.data; // { token, refreshToken, user }
  },
  
  logout: async (token: string) => {
    await axios.post(API_ENDPOINTS.logout, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await axios.post(API_ENDPOINTS.refreshToken, {
      refreshToken,
    });
    return response.data; // { token, refreshToken }
  },
  
  switchRole: async (token: string, roleName: string) => {
    const response = await axios.post(
      API_ENDPOINTS.switchRole,
      { roleName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data; // { token, refreshToken, user }
  },
};
```

**Estimated Time:** 4-5 days

---

#### **1.3 Create API Services for Each Feature (Week 2-3)**
**Priority: 🔴 CRITICAL**

**Tasks:**
1. Leave Service
2. Request Service
3. Payslip Service
4. Attendance Service
5. Claims Service
6. Profile Service

**Files to Create:**
- ✅ `payroll/services/leaveService.ts`
- ✅ `payroll/services/requestService.ts`
- ✅ `payroll/services/payslipService.ts`
- ✅ `payroll/services/attendanceService.ts`
- ✅ `payroll/services/claimService.ts`
- ✅ `payroll/services/profileService.ts`

**Code Example:**
```typescript
// payroll/services/leaveService.ts
import axios from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

export const leaveService = {
  // Get all leaves (with filters)
  getLeaves: async (filter?: 'all' | 'requested' | 'approved' | 'rejected') => {
    const response = await axios.get(API_ENDPOINTS.leaves, {
      params: { filter }
    });
    return response.data;
  },
  
  // Create leave request
  createLeave: async (leaveData: any) => {
    const response = await axios.post(API_ENDPOINTS.leaves, leaveData);
    return response.data;
  },
  
  // Approve leave (Manager only)
  approveLeave: async (leaveId: string) => {
    const response = await axios.post(API_ENDPOINTS.leaveApprove(leaveId));
    return response.data;
  },
  
  // Reject leave (Manager only)
  rejectLeave: async (leaveId: string, reason: string) => {
    const response = await axios.post(API_ENDPOINTS.leaveReject(leaveId), {
      reason
    });
    return response.data;
  },
};
```

**Estimated Time:** 5-7 days

---

### **Phase 2: Enhanced UX (Weeks 4-5)**

#### **2.1 Loading States & Skeletons**
**Priority: 🟡 HIGH**

**Tasks:**
1. Create skeleton components for each screen
2. Add loading states to all API calls
3. Add pull-to-refresh functionality
4. Add retry buttons for failed requests

**Files to Create:**
- ✅ `payroll/components/skeletons/LeaveListSkeleton.tsx`
- ✅ `payroll/components/skeletons/RequestListSkeleton.tsx`
- ✅ `payroll/components/skeletons/PayslipListSkeleton.tsx`
- ✅ `payroll/components/Loading.tsx`
- ✅ `payroll/components/ErrorState.tsx`

**Code Example:**
```typescript
// Before (no loading state)
const LeavesScreen = () => {
  const leaves = mockLeaves; // Static data
  
  return (
    <LeaveList leaves={leaves} />
  );
};

// After (with loading state)
const LeavesScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadLeaves();
  }, []);
  
  const loadLeaves = async () => {
    try {
      setIsLoading(true);
      const data = await leaveService.getLeaves();
      setLeaves(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) return <LeaveListSkeleton />;
  if (error) return <ErrorState onRetry={loadLeaves} />;
  
  return (
    <LeaveList 
      leaves={leaves}
      onRefresh={loadLeaves}
      refreshing={isLoading}
    />
  );
};
```

**Estimated Time:** 3-4 days

---

#### **2.2 Error Handling & User Feedback**
**Priority: 🟡 HIGH**

**Tasks:**
1. Create centralized error handler
2. Add toast notifications (success/error)
3. Add proper error messages for each scenario
4. Add network error detection
5. Add retry logic with exponential backoff

**Files to Create:**
- ✅ `payroll/utils/errorHandler.ts`
- ✅ `payroll/components/Toast.tsx`
- ✅ `payroll/hooks/useToast.ts`
- ✅ `payroll/hooks/useNetworkStatus.ts`

**Code Example:**
```typescript
// payroll/utils/errorHandler.ts
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error
    switch (error.response.status) {
      case 401:
        return 'Your session has expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.response.data?.message || 'An error occurred.';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
};
```

**Estimated Time:** 2-3 days

---

#### **2.3 Form Validation**
**Priority: 🟡 HIGH**

**Tasks:**
1. Add validation to CreateLeaveScreen
2. Add validation to CreateRequestScreen
3. Add validation to CreateClaimScreen
4. Add validation to EditProfileScreen
5. Add validation to ChangePasswordScreen
6. Show inline error messages
7. Disable submit until form is valid

**Consider using:** React Hook Form + Yup/Zod

**Files to Update:**
- 🔄 `payroll/screens/CreateLeaveScreen.tsx`
- 🔄 `payroll/screens/CreateRequestScreen.tsx`
- 🔄 `payroll/screens/CreateClaimScreen.tsx`
- 🔄 `payroll/screens/EditProfileScreen.tsx`
- 🔄 `payroll/screens/ChangePasswordScreen.tsx`

**Code Example:**
```typescript
// Before (basic validation)
const handleSubmit = () => {
  if (!leaveType.trim()) {
    Alert.alert('Error', 'Please select leave type');
    return;
  }
  // ... submit
};

// After (with react-hook-form + yup)
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const leaveSchema = yup.object({
  leaveType: yup.string().required('Leave type is required'),
  startDate: yup.date().required('Start date is required'),
  endDate: yup.date()
    .min(yup.ref('startDate'), 'End date must be after start date')
    .required('End date is required'),
  reason: yup.string()
    .min(10, 'Reason must be at least 10 characters')
    .required('Reason is required'),
});

const CreateLeaveScreen = () => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(leaveSchema)
  });
  
  const onSubmit = async (data) => {
    try {
      await leaveService.createLeave(data);
      Toast.success('Leave request submitted!');
      navigation.goBack();
    } catch (error) {
      Toast.error(handleApiError(error));
    }
  };
  
  return (
    <Controller
      control={control}
      name="reason"
      render={({ field }) => (
        <>
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Enter reason"
          />
          {errors.reason && (
            <Text style={styles.error}>{errors.reason.message}</Text>
          )}
        </>
      )}
    />
  );
};
```

**Estimated Time:** 4-5 days

---

### **Phase 3: Advanced Features (Weeks 6-8)**

#### **3.1 File Upload (Receipts, Documents)**
**Priority: 🟢 MEDIUM**

**Tasks:**
1. Add image picker for receipts
2. Add document picker for files
3. Implement file upload to server
4. Add file preview
5. Add multiple file upload
6. Add file size validation
7. Add file type validation

**Libraries Needed:**
- `expo-image-picker`
- `expo-document-picker`
- `react-native-fs` (for file operations)

**Files to Create:**
- ✅ `payroll/components/FileUpload.tsx`
- ✅ `payroll/components/ImagePicker.tsx`
- ✅ `payroll/services/uploadService.ts`
- ✅ `payroll/utils/fileValidator.ts`

**Estimated Time:** 3-4 days

---

#### **3.2 Push Notifications**
**Priority: 🟢 MEDIUM**

**Tasks:**
1. Setup Expo push notifications
2. Request notification permissions
3. Store device token on server
4. Handle notification received (foreground)
5. Handle notification opened (background)
6. Add notification settings in app
7. Add notification categories (leaves, requests, etc.)

**Libraries Needed:**
- `expo-notifications`
- `expo-device`

**Files to Create:**
- ✅ `payroll/services/notificationService.ts`
- ✅ `payroll/hooks/useNotifications.ts`
- ✅ `payroll/utils/notificationHandler.ts`

**Estimated Time:** 3-4 days

---

#### **3.3 Offline Support & Caching**
**Priority: 🟢 MEDIUM**

**Tasks:**
1. Add React Query for data caching
2. Implement optimistic updates
3. Add offline queue for actions
4. Show offline banner
5. Sync data when back online
6. Cache critical data locally

**Libraries Needed:**
- `@tanstack/react-query`
- `@react-native-async-storage/async-storage`
- `redux-persist` (optional)

**Files to Create:**
- ✅ `payroll/utils/queryClient.ts`
- ✅ `payroll/hooks/useOfflineQueue.ts`
- ✅ `payroll/components/OfflineBanner.tsx`

**Estimated Time:** 5-6 days

---

#### **3.4 Real-time Updates (WebSocket)**
**Priority: 🟠 LOW**

**Tasks:**
1. Setup WebSocket connection
2. Listen for leave approvals
3. Listen for request updates
4. Listen for new claims
5. Update UI in real-time
6. Handle connection lost/reconnect

**Libraries Needed:**
- `socket.io-client`

**Files to Create:**
- ✅ `payroll/services/websocketService.ts`
- ✅ `payroll/hooks/useWebSocket.ts`

**Estimated Time:** 4-5 days

---

### **Phase 4: Quality & Performance (Weeks 9-10)**

#### **4.1 Testing**
**Priority: 🟡 HIGH**

**Tasks:**
1. Unit tests for services
2. Unit tests for utils
3. Component tests with Testing Library
4. Integration tests for flows
5. E2E tests with Detox (optional)

**Libraries Needed:**
- `jest`
- `@testing-library/react-native`
- `detox` (optional)

**Estimated Time:** 7-10 days

---

#### **4.2 Performance Optimization**
**Priority: 🟡 HIGH**

**Tasks:**
1. Add React.memo to expensive components
2. Use useMemo/useCallback appropriately
3. Implement FlatList optimizations
4. Add image optimization
5. Lazy load screens
6. Profile and fix performance bottlenecks

**Estimated Time:** 3-4 days

---

#### **4.3 Analytics & Monitoring**
**Priority: 🟢 MEDIUM**

**Tasks:**
1. Add Firebase Analytics
2. Track screen views
3. Track button clicks
4. Track errors
5. Track user flows

**Libraries Needed:**
- `@react-native-firebase/analytics`
- `@react-native-firebase/crashlytics`

**Estimated Time:** 2-3 days

---

## 🚀 **Immediate Next Steps (Week 1 Action Plan)**

### **Day 1-2: API Configuration**
1. ✅ Create `payroll/config/api.ts`
2. ✅ Create `payroll/config/axios.ts` with interceptors
3. ✅ Setup environment variables
4. ✅ Test API connection

### **Day 3-5: Auth Upgrade**
1. ✅ Study LetlinkMobileApp AuthContext
2. ✅ Create JWT decoder utility
3. ✅ Create auth service with API calls
4. ✅ Upgrade PayrollAuthContext to use JWT
5. ✅ Test login/logout flow

### **Day 6-7: First Feature Integration**
1. ✅ Create Leave Service
2. ✅ Update LeavesScreen to use API
3. ✅ Add loading states
4. ✅ Add error handling
5. ✅ Test end-to-end

---

## 📦 **Required Backend APIs**

Your backend needs to provide these endpoints:

### **Auth APIs:**
```
POST   /api/auth/login          - Login with email/password
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh        - Refresh token
POST   /api/auth/switch-role    - Switch role (Employee ↔ Manager)
POST   /api/auth/register       - Register new user
POST   /api/auth/reset-password - Reset password
```

### **Leave APIs:**
```
GET    /api/leaves              - Get all leaves (with filters)
POST   /api/leaves              - Create leave request
GET    /api/leaves/:id          - Get leave details
POST   /api/leaves/:id/approve  - Approve leave (Manager)
POST   /api/leaves/:id/reject   - Reject leave (Manager)
DELETE /api/leaves/:id          - Delete leave
```

### **Request APIs:**
```
GET    /api/requests            - Get all requests
POST   /api/requests            - Create request
POST   /api/requests/:id/approve
POST   /api/requests/:id/reject
```

### **Payslip APIs:**
```
GET    /api/payslips            - Get payslips
GET    /api/payslips/:id        - Get payslip details
GET    /api/payslips/:id/download - Download PDF
```

### **Attendance APIs:**
```
GET    /api/attendance          - Get attendance (date range)
GET    /api/attendance/today    - Get today's attendance
GET    /api/attendance/:id      - Get attendance details
```

### **Claims APIs:**
```
GET    /api/claims              - Get claims
POST   /api/claims              - Create claim
POST   /api/claims/:id/approve
POST   /api/claims/:id/reject
POST   /api/claims/:id/upload   - Upload receipt
```

### **Profile APIs:**
```
GET    /api/profile             - Get user profile
PUT    /api/profile             - Update profile
POST   /api/profile/avatar      - Upload avatar
POST   /api/profile/change-password
```

---

## 📊 **Timeline Summary**

| Phase | Duration | Priority | Description |
|-------|----------|----------|-------------|
| **Phase 1** | 3 weeks | 🔴 CRITICAL | Backend Integration |
| **Phase 2** | 2 weeks | 🟡 HIGH | Enhanced UX |
| **Phase 3** | 3 weeks | 🟢 MEDIUM | Advanced Features |
| **Phase 4** | 2 weeks | 🟡 HIGH | Quality & Performance |
| **Total** | **10 weeks** | - | Full Production Ready |

---

## 🎯 **Success Metrics**

After completing all phases, your app should have:

- ✅ Real API integration (not mock data)
- ✅ JWT authentication with refresh tokens
- ✅ Proper loading states everywhere
- ✅ Error handling with user-friendly messages
- ✅ Form validation on all inputs
- ✅ File upload for receipts/documents
- ✅ Push notifications for approvals
- ✅ Offline support with data caching
- ✅ Real-time updates via WebSocket
- ✅ 80%+ test coverage
- ✅ Performance optimized (60fps)
- ✅ Analytics tracking
- ✅ Crash reporting

---

## 🔥 **Start Here:**

**Week 1 - Day 1 Task:**
```bash
# 1. Create API config
mkdir -p payroll/config
touch payroll/config/api.ts
touch payroll/config/axios.ts

# 2. Create services folder
mkdir -p payroll/services
touch payroll/services/authService.ts

# 3. Create utils folder
mkdir -p payroll/utils
touch payroll/utils/jwtDecoder.ts
touch payroll/utils/errorHandler.ts

# 4. Install required packages
npm install axios
npm install @react-native-async-storage/async-storage
```

**First Code to Write:**
```typescript
// payroll/config/api.ts
export const API_BASE_URL = 'http://localhost:5000'; // Change to your backend URL

export const API_ENDPOINTS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  // ... add more
};
```

---

## 📞 **Need Help?**

1. **API Integration:** Check `src/features/auth/context/AuthContext.tsx`
2. **Services Pattern:** Check `src/services/` folder
3. **Error Handling:** Check error handler in AuthContext
4. **Loading States:** Check any screen in `src/screens/`

---

*Last Updated: January 2026*
*Current Status: MVP Complete, Ready for Backend Integration*
