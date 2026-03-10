# Request Card Behavior Explanation

## Current Design Logic

The `RequestCard` component uses **conditional rendering** based on request status:

### Requested Status (Pending Approval)
- ✅ Shows **Approve** and **Reject** buttons
- Reason: These requests need action (approve or reject)

### Active Status (Already Approved)
- ✅ Shows **Status Badge** ("Active")
- ❌ No action buttons
- Reason: Already approved, no need to approve/reject again

### Cancelled Status (Already Rejected)
- ✅ Shows **Status Badge** ("Cancelled")
- ❌ No action buttons
- Reason: Already rejected, no need to approve/reject again

---

## Code Logic

```typescript
// Line 17 in RequestCard.tsx
const showActions = request.status === 'requested';

// Lines 44-59: Show buttons only if showActions is true
{showActions && (
  <View style={styles.actionButtons}>
    {/* Approve/Reject buttons */}
  </View>
)}

// Lines 60-66: Show status badge if no actions
{!showActions && (
  <View style={styles.statusBadge}>
    <Text>{request.status === 'active' ? 'Active' : 'Cancelled'}</Text>
  </View>
)}
```

---

## Why This Design?

**Business Logic:**
- **Requested** = Needs decision → Show action buttons
- **Active** = Already approved → Show status only
- **Cancelled** = Already rejected → Show status only

This prevents:
- Approving an already approved request
- Rejecting an already rejected request
- Confusion about request state

---

## Possible Enhancements

If you want different actions for Active/Cancelled requests:

### Option 1: Add "Cancel" button for Active requests
```typescript
{request.status === 'active' && (
  <TouchableOpacity onPress={() => onCancel?.(request.id)}>
    <Text>Cancel</Text>
  </TouchableOpacity>
)}
```

### Option 2: Add "Restore" button for Cancelled requests
```typescript
{request.status === 'cancelled' && (
  <TouchableOpacity onPress={() => onRestore?.(request.id)}>
    <Text>Restore</Text>
  </TouchableOpacity>
)}
```

### Option 3: Add "View Details" button for all statuses
```typescript
<TouchableOpacity onPress={() => onViewDetails?.(request.id)}>
  <Text>View Details</Text>
</TouchableOpacity>
```

---

## Current Architecture

**Shared Components:**
- ✅ `RequestCard` - Used for ALL statuses (requested, active, cancelled)
- ✅ `RequestList` - Used for ALL statuses
- ✅ `FilterTabs` - Used for ALL statuses

**Separate Data:**
- ✅ `mockRequestedRequests` - Data for requested tab
- ✅ `mockActiveRequests` - Data for active tab
- ✅ `mockCancelledRequests` - Data for cancelled tab

**Shared Types:**
- ✅ `Request` interface - Used for all statuses
- ✅ `RequestStatus` type - Defines all statuses

---

## Summary

**Why Active/Cancelled don't have approve/reject buttons:**
- ✅ They're already processed (approved/rejected)
- ✅ No need to approve/reject again
- ✅ Shows status badge instead (better UX)

**This is correct behavior!** But if you want different actions for active/cancelled requests, we can add them.

