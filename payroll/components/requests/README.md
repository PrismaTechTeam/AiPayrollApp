# Requests Components

This directory contains reusable components for the Requests feature.

## Components

### 1. `Header.tsx`
Reusable header component with back button and title.

**Props:**
- `title: string` - Header title text
- `onBackPress?: () => void` - Callback when back button is pressed
- `showBackButton?: boolean` - Whether to show back button (default: true)

**Usage:**
```tsx
<Header
  title="Requests"
  onBackPress={() => navigation.goBack()}
  showBackButton={true}
/>
```

---

### 2. `FilterTabs.tsx`
Tab switcher component for filtering requests by status.

**Props:**
- `activeTab: RequestStatus` - Currently active tab ('requested' | 'active' | 'cancelled')
- `onTabChange: (tab: RequestStatus) => void` - Callback when tab changes

**Usage:**
```tsx
<FilterTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

---

### 3. `RequestCard.tsx`
Individual request card component displaying request details.

**Props:**
- `request: Request` - Request object with id, name, dateRange, type, daysAgo, status
- `onApprove?: (requestId: string) => void` - Callback when approve button is clicked
- `onReject?: (requestId: string) => void` - Callback when reject button is clicked

**Features:**
- Shows avatar with initial letter
- Displays request details (name, date range, type)
- Shows action buttons (approve/reject) only for 'requested' status
- Shows status badge for 'active' and 'cancelled' requests

**Usage:**
```tsx
<RequestCard
  request={request}
  onApprove={(id) => handleApprove(id)}
  onReject={(id) => handleReject(id)}
/>
```

---

### 4. `RequestList.tsx`
List component that renders multiple request cards.

**Props:**
- `requests: Request[]` - Array of request objects
- `onApprove?: (requestId: string) => void` - Callback for approve action
- `onReject?: (requestId: string) => void` - Callback for reject action

**Features:**
- Automatically renders all requests as cards
- Shows empty state when no requests
- Scrollable list

**Usage:**
```tsx
<RequestList
  requests={requests}
  onApprove={handleApprove}
  onReject={handleReject}
/>
```

---

## Data

Mock data is stored in `payroll/data/mockRequests.ts`:

- `mockRequestedRequests` - Requests pending approval
- `mockActiveRequests` - Approved and ongoing requests
- `mockCancelledRequests` - Cancelled requests
- `getRequestsByStatus(status)` - Helper function to get requests by status

---

## Types

All types are defined in `payroll/types/request.types.ts`:

- `Request` - Request object interface
- `RequestStatus` - Type for request status
- `RequestCardProps` - Props for RequestCard component
- `FilterTabsProps` - Props for FilterTabs component
- `RequestListProps` - Props for RequestList component

---

## Reusability

These components are designed to be reusable across the application:

1. **Header** - Can be used in any screen that needs a header with back button
2. **FilterTabs** - Can be used for any tab-based filtering UI
3. **RequestCard** - Can be used in notifications, dashboards, or other screens showing requests
4. **RequestList** - Can be used anywhere you need to display a list of requests

---

## Example: Using Components in Another Screen

```tsx
import { RequestList, Header } from '../components/requests';
import { getRequestsByStatus } from '../data/mockRequests';

export const DashboardScreen = () => {
  const requests = getRequestsByStatus('active');
  
  return (
    <View>
      <Header title="Active Requests" />
      <RequestList requests={requests} />
    </View>
  );
};
```

