# Request Submission Integration Guide

## 🎯 Problem

Currently, when employees submit requests, they don't appear in the manager's approval list because:
1. No backend API integration
2. Using static mock data
3. No state management between screens

---

## ✅ Solutions

### **Option 1: Local State Management (Quick Fix)**

Use React Context to share request data across screens.

#### Step 1: Create Request Context

```typescript
// File: payroll/context/RequestContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Request {
  id: string;
  name: string;
  dateRange: string;
  type: string;
  daysAgo: string;
  status: 'requested' | 'active' | 'cancelled';
  requestType?: string;
  startDate?: string;
  additionalNote?: string;
  submittedAt?: string;
}

interface RequestContextType {
  requests: Request[];
  addRequest: (request: Omit<Request, 'id' | 'daysAgo'>) => void;
  updateRequestStatus: (id: string, status: Request['status']) => void;
  getRequestsByStatus: (status: Request['status']) => Request[];
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export const RequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<Request[]>([
    // Import initial mock data
    {
      id: '1',
      name: 'John Doe',
      dateRange: '27 Aug - 28 Aug, 2021',
      type: 'Document Request',
      daysAgo: '2 Days Ago',
      status: 'requested',
    },
    // ... more mock data
  ]);

  const addRequest = (newRequest: Omit<Request, 'id' | 'daysAgo'>) => {
    const request: Request = {
      ...newRequest,
      id: Date.now().toString(),
      daysAgo: 'Just now',
    };
    setRequests((prev) => [request, ...prev]);
  };

  const updateRequestStatus = (id: string, status: Request['status']) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req))
    );
  };

  const getRequestsByStatus = (status: Request['status']) => {
    return requests.filter((req) => req.status === status);
  };

  return (
    <RequestContext.Provider
      value={{ requests, addRequest, updateRequestStatus, getRequestsByStatus }}
    >
      {children}
    </RequestContext.Provider>
  );
};

export const useRequests = () => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequests must be used within RequestProvider');
  }
  return context;
};
```

#### Step 2: Wrap App with Provider

```typescript
// File: App.tsx

import { RequestProvider } from './payroll/context/RequestContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <PayrollAuthProvider>
        <RequestProvider>  {/* ← Add this */}
          <AuthenticatedApp />
        </RequestProvider>
      </PayrollAuthProvider>
    </SafeAreaProvider>
  );
}
```

#### Step 3: Update CreateRequestScreen

```typescript
// File: payroll/screens/CreateRequestScreen.tsx

import { useRequests } from '../context/RequestContext';
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const CreateRequestScreen: React.FC = () => {
  const { addRequest } = useRequests();  // ← Add this
  const { user } = usePayrollAuth();     // ← Add this
  
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Add to local state
      addRequest({
        name: user?.name || 'Unknown',
        dateRange: formatDate(startDate),
        type: requestType,
        status: 'requested',
        requestType,
        startDate: startDate?.toISOString(),
        additionalNote,
        submittedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Your request has been submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };
};
```

#### Step 4: Update RequestsScreen

```typescript
// File: payroll/screens/RequestsScreen.tsx

import { useRequests } from '../context/RequestContext';

export const RequestsScreen: React.FC = ({ navigation }) => {
  const { getRequestsByStatus, updateRequestStatus } = useRequests();  // ← Add this
  const [activeTab, setActiveTab] = useState<RequestStatus>('requested');

  // Use context data instead of mock data
  const requests = getRequestsByStatus(activeTab);

  const handleApprove = (requestId: string) => {
    updateRequestStatus(requestId, 'active');
    Alert.alert('Success', 'Request approved!');
  };

  const handleReject = (requestId: string) => {
    updateRequestStatus(requestId, 'cancelled');
    Alert.alert('Success', 'Request rejected!');
  };

  // ... rest of component
};
```

#### Step 5: Test the Flow

```bash
# 1. Login as Employee
employee@test.com / 123456

# 2. Click "Request Application" (Blue card)
# 3. Fill form and submit
# 4. Logout

# 5. Login as Manager
manager@test.com / 123456

# 6. Click "Request Approval" (Green card)
# 7. See new request at top with "Just now" ✅
# 8. Click approve
# 9. Request moves to "Active" tab ✅
```

---

### **Option 2: Backend API Integration (Production)**

Connect to a real backend to persist data.

#### Backend API Endpoints Needed:

```typescript
// Required API endpoints:

POST   /api/requests              // Create new request
GET    /api/requests?status=...   // Get requests by status
PUT    /api/requests/:id          // Update request status
DELETE /api/requests/:id          // Delete request
```

#### Update CreateRequestScreen

```typescript
// File: payroll/screens/CreateRequestScreen.tsx

import axios from 'axios';

const API_URL = 'https://your-api.com/api';

export const CreateRequestScreen: React.FC = () => {
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const requestData = {
        requestType,
        startDate: startDate?.toISOString(),
        additionalNote,
        status: 'requested',
        submittedAt: new Date().toISOString(),
      };

      // API call
      const response = await axios.post(`${API_URL}/requests`, requestData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Your request has been submitted!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
};
```

#### Update RequestsScreen

```typescript
// File: payroll/screens/RequestsScreen.tsx

import axios from 'axios';
import { useEffect } from 'react';

const API_URL = 'https://your-api.com/api';

export const RequestsScreen: React.FC = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<RequestStatus>('requested');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch requests when tab changes
  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/requests`, {
        params: { status: activeTab },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await axios.put(`${API_URL}/requests/${requestId}`, {
        status: 'active',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      Alert.alert('Success', 'Request approved!');
      fetchRequests(); // Refresh list
    } catch (error) {
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await axios.put(`${API_URL}/requests/${requestId}`, {
        status: 'cancelled',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      Alert.alert('Success', 'Request rejected!');
      fetchRequests(); // Refresh list
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  // ... rest of component
};
```

---

## 📊 Comparison

| Feature | Option 1: Local State | Option 2: Backend API |
|---------|----------------------|---------------------|
| **Implementation Time** | 1-2 hours | 1-2 days |
| **Data Persistence** | ❌ Lost on app restart | ✅ Persisted in database |
| **Multi-device Sync** | ❌ No | ✅ Yes |
| **Scalability** | ⚠️ Limited | ✅ Unlimited |
| **Production Ready** | ❌ No | ✅ Yes |
| **Best For** | Testing/Demo | Production |

---

## 🎯 Recommended Approach

### **For Development/Testing:**
Use **Option 1** (Local State) to test the flow immediately.

### **For Production:**
Use **Option 2** (Backend API) for real data persistence.

---

## 🧪 Testing the Integration

### With Local State (Option 1):

```bash
# Test 1: Submit as Employee
1. Login: employee@test.com
2. Click "Request Application" (Blue)
3. Fill: Type = "Document Request", Date = Tomorrow, Note = "Test"
4. Submit
5. Logout

# Test 2: View as Manager
1. Login: manager@test.com
2. Click "Request Approval" (Green)
3. Check "Requested" tab
4. See new request with "Just now" ✅
5. Click approve ✓
6. Check "Active" tab
7. See request moved there ✅
```

### With Backend API (Option 2):

```bash
# Test 1: Submit as Employee
1. Login: employee@test.com
2. Submit request
3. Check backend database: Request created ✅
4. Logout

# Test 2: View as Manager (Different Device)
1. Login: manager@test.com (on different device)
2. Open Request Approval
3. See new request ✅
4. Approve request
5. Check backend database: Status = 'active' ✅
```

---

## 📝 Summary

**Current State:**
- ❌ Requests don't sync between screens
- ❌ Using static mock data
- ❌ No persistence

**After Option 1 (Local State):**
- ✅ Requests appear in manager's list
- ✅ Data shared between screens
- ⚠️ Data lost on app restart

**After Option 2 (Backend API):**
- ✅ Full production-ready solution
- ✅ Data persisted in database
- ✅ Multi-device sync
- ✅ Real-time updates

---

## 🚀 Quick Start

**To implement Option 1 now:**
1. Create `RequestContext.tsx`
2. Wrap `App.tsx` with `RequestProvider`
3. Update `CreateRequestScreen` to use `addRequest()`
4. Update `RequestsScreen` to use `getRequestsByStatus()`
5. Test: Submit as employee → View as manager ✅

**Time: ~1-2 hours**

Would you like me to implement Option 1 for you now?
