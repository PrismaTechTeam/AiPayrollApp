# Payroll App - 2-Role System Implementation

## Overview
Implemented a simplified 2-role authentication system for the payroll application with role switching capability.

## Roles
1. **Employee** - Regular employees who can:
   - View their own payslips
   - View their own attendance
   - Submit requests and leave applications
   - View own data

2. **Manager** - HR/Payroll managers who can:
   - All Employee permissions
   - Approve/reject requests
   - Approve/reject leave applications
   - Approve/reject payslips
   - View all employee data
   - Restore cancelled items

## Files Created

### 1. Role Constants (`payroll/constants/userRoles.ts`)
- Defines the two roles: `EMPLOYEE` and `MANAGER`
- Contains role groups for feature-based access control
- Helper function `hasRoleAccess()` to check permissions

### 2. Auth Context (`payroll/context/PayrollAuthContext.tsx`)
- Manages user authentication state
- Stores user data in SecureStore
- Handles role switching
- Provides `usePayrollAuth()` hook

### 3. Role Switcher Component (`payroll/components/RoleSwitcher.tsx`)
- UI component for switching between roles
- Only shows if user has multiple roles
- Modal popup with role selection
- Visual distinction between Employee (blue) and Manager (orange)

## Integration

### App.tsx
Wrapped the entire app with `PayrollAuthProvider`:
```typescript
<PayrollAuthProvider>
  <NavigationContainer>
    {/* screens */}
  </NavigationContainer>
</PayrollAuthProvider>
```

### PayrollHomeScreen.tsx
- Added `RoleSwitcher` component in the header
- Displays current user name from auth context
- Role switcher appears below the greeting

### RequestCard.tsx
- Updated to check user role before showing approve/reject buttons
- Only Managers can see approve/reject/restore buttons
- Employees see read-only view

## Usage Examples

### Check if user can approve
```typescript
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../constants/userRoles';

const { currentRole } = usePayrollAuth();
const canApprove = hasRoleAccess(currentRole, ROLE_GROUPS.CAN_APPROVE_REQUESTS);

{canApprove && (
  <TouchableOpacity onPress={handleApprove}>
    <Text>Approve</Text>
  </TouchableOpacity>
)}
```

### Get current user
```typescript
const { user, currentRole } = usePayrollAuth();

console.log('User:', user?.name);
console.log('Current Role:', currentRole); // "Employee" or "Manager"
```

### Switch role programmatically
```typescript
const { switchRole } = usePayrollAuth();

await switchRole('Manager');
```

## Role Groups

Available role groups for access control:
- `MANAGER_ONLY` - Manager-only features
- `EMPLOYEE_ONLY` - Employee-only features
- `ALL_USERS` - All users can access
- `CAN_APPROVE_REQUESTS` - Can approve requests (Manager)
- `CAN_APPROVE_LEAVES` - Can approve leaves (Manager)
- `CAN_APPROVE_PAYSLIPS` - Can approve payslips (Manager)
- `CAN_VIEW_ALL_ATTENDANCE` - Can view all attendance (Manager)
- `CAN_SUBMIT_REQUESTS` - Can submit requests (All)
- `CAN_VIEW_OWN_PAYSLIPS` - Can view own payslips (All)
- `CAN_VIEW_OWN_ATTENDANCE` - Can view own attendance (All)

## Testing

Currently uses mock data:
- Default user: Alex Smith
- Available roles: Both Employee and Manager
- Stored in SecureStore: `payroll_user`

To test:
1. Open the app
2. Click on the role badge below "Good Morning"
3. Select a different role
4. Observe how approve/reject buttons appear/disappear based on role

## Future Enhancements

1. **API Integration**: Replace mock auth with actual API calls
2. **Token-based Auth**: Integrate with JWT tokens
3. **Role Persistence**: Sync with backend on role switch
4. **Audit Logging**: Track role switches and actions
5. **More Granular Permissions**: Add department-level access control

## Security Notes

- User data stored securely in SecureStore
- Role checks performed on every action
- Role switching requires valid available roles
- All sensitive operations protected by role checks
