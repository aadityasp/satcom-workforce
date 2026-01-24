# Role-Based Access Control (RBAC)

## Satcom Workforce Visibility System

---

## Role Hierarchy

```
Super Admin
    ├── HR
    │   ├── Manager
    │   │   └── Employee
```

Higher roles inherit all permissions of lower roles plus additional capabilities.

---

## Role Definitions

### Employee (Base Role)

**Description**: Standard workforce member with self-service capabilities.

**Permissions**:

| Module | Capabilities |
|--------|-------------|
| **Attendance** | Check-in/out for self, start/end breaks, view own history |
| **Timesheets** | CRUD own entries, upload attachments |
| **Leaves** | Request leaves, cancel pending requests, view own balance/history |
| **Availability** | View all users' presence status |
| **Chat** | Create/participate in 1:1 and group chats, send voice notes |
| **Profile** | View/edit own profile (limited fields) |

**Restrictions**:
- Cannot view other users' attendance/timesheet details
- Cannot approve/reject any requests
- Cannot access admin screens
- Cannot modify system settings

---

### Manager

**Description**: Team lead with visibility into direct reports.

**Inherits**: All Employee permissions

**Additional Permissions**:

| Module | Capabilities |
|--------|-------------|
| **Team** | View direct reports' attendance summary |
| **Projects** | Create/edit projects, manage tasks |
| **Timesheets** | View team timesheet summary (no individual details) |
| **Chat** | Create project-based group chats |
| **Availability** | Filter by team/department |

**Restrictions**:
- Cannot approve leave requests (HR only)
- Cannot override attendance
- Cannot manage users or roles
- Cannot configure policies

---

### HR

**Description**: Human resources with workforce management capabilities.

**Inherits**: All Manager permissions

**Additional Permissions**:

| Module | Capabilities |
|--------|-------------|
| **Attendance** | View all users' attendance, override with reason |
| **Timesheets** | View all users' timesheets and summaries |
| **Leaves** | Approve/reject leave requests, adjust balances |
| **Anomalies** | View all anomalies, acknowledge, resolve, dismiss |
| **Reports** | Access dashboard with workforce metrics |
| **Users** | View all user profiles |

**Restrictions**:
- Cannot create/delete users
- Cannot change user roles
- Cannot modify system policies
- Cannot configure geofence settings
- Cannot access audit logs (beyond own actions)

---

### Super Admin

**Description**: Full system administrator with complete access.

**Inherits**: All HR permissions

**Additional Permissions**:

| Module | Capabilities |
|--------|-------------|
| **Users** | Create, update, delete users, change roles |
| **Policies** | Configure work hours, overtime, break rules |
| **Leave Types** | Create/modify leave types, set allocations |
| **Holiday Calendar** | Manage holiday list per year |
| **Geofence** | Enable/disable, configure office locations |
| **Anomaly Rules** | Configure detection rules and thresholds |
| **Retention** | Set data retention policies |
| **Audit Logs** | View complete audit trail |
| **Email Settings** | Configure SMTP for notifications |

---

## Permission Matrix

### Attendance Module

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| Check-in/out self | ✅ | ✅ | ✅ | ✅ |
| View own attendance | ✅ | ✅ | ✅ | ✅ |
| View team attendance | ❌ | Summary | Full | Full |
| View all attendance | ❌ | ❌ | ✅ | ✅ |
| Override attendance | ❌ | ❌ | ✅ | ✅ |

### Timesheet Module

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| CRUD own timesheets | ✅ | ✅ | ✅ | ✅ |
| View team timesheets | ❌ | Summary | Full | Full |
| View all timesheets | ❌ | ❌ | ✅ | ✅ |

### Leave Module

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| Request leave | ✅ | ✅ | ✅ | ✅ |
| Cancel own pending | ✅ | ✅ | ✅ | ✅ |
| View own balance | ✅ | ✅ | ✅ | ✅ |
| Approve/reject | ❌ | ❌ | ✅ | ✅ |
| Adjust balances | ❌ | ❌ | ✅ | ✅ |
| Manage leave types | ❌ | ❌ | ❌ | ✅ |

### Project/Task Module

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| Create/edit projects | ❌ | ✅ | ✅ | ✅ |
| Manage tasks | ❌ | ✅ | ✅ | ✅ |
| Delete projects | ❌ | ❌ | ❌ | ✅ |

### Anomaly Module

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| View own anomalies | ❌ | ❌ | ❌ | ❌ |
| View all anomalies | ❌ | ❌ | ✅ | ✅ |
| Acknowledge | ❌ | ❌ | ✅ | ✅ |
| Resolve/dismiss | ❌ | ❌ | ✅ | ✅ |
| Configure rules | ❌ | ❌ | ❌ | ✅ |

### Administration

| Action | Employee | Manager | HR | Super Admin |
|--------|----------|---------|-----|-------------|
| View audit logs | ❌ | ❌ | Own | All |
| User management | ❌ | ❌ | View | Full |
| Policy configuration | ❌ | ❌ | ❌ | ✅ |
| Geofence configuration | ❌ | ❌ | ❌ | ✅ |
| Holiday calendar | ❌ | ❌ | ❌ | ✅ |

---

## Implementation Details

### Role Storage

```typescript
enum UserRole {
  Employee = 'Employee',
  Manager = 'Manager',
  HR = 'HR',
  SuperAdmin = 'SuperAdmin',
}
```

Roles are stored as a single enum value on the User entity. Role hierarchy is enforced in application logic.

### Authorization Guards

```typescript
// NestJS guard example
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SuperAdmin)
@Post('approve')
async approveLeave() {}
```

### Frontend Gating

```typescript
// React component example
{hasRole(user, [UserRole.HR, UserRole.SuperAdmin]) && (
  <ApproveButton onClick={handleApprove} />
)}
```

### API Response Filtering

Certain endpoints return filtered data based on role:
- Managers see aggregated team data, not individual records
- Employees see only their own data
- HR/SuperAdmin see full details

---

## Role Assignment

### Initial Setup
- First user registered is automatically Super Admin
- Subsequent users are created by Super Admin

### Role Changes
- Only Super Admin can change roles
- Role changes are logged in audit trail
- Active sessions are invalidated on role change

### Manager Assignment
- `managerId` field on EmployeeProfile
- Managers can only see their direct reports
- Used for team-based filtering

---

## Security Considerations

### Defense in Depth
1. **JWT Claims**: Role embedded in token
2. **API Guards**: Validate on every request
3. **Database Queries**: Filter by user context
4. **UI Gating**: Hide unauthorized elements

### Audit Trail
All role-sensitive actions are logged with:
- Actor identity
- Action performed
- Target resource
- Before/after state

### Session Handling
- Role changes invalidate refresh tokens
- Forced re-login required
- Token refresh validates current role

---

## Future Considerations

### Potential Enhancements
- Granular permissions per resource
- Custom role creation
- Department-based access
- Temporary role elevation
- Approval workflows for role changes

### Not in MVP
- Multi-tenant role isolation
- Role delegation
- Permission groups
- Time-bounded permissions
