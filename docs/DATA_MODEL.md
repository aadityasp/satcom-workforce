# Data Model Specification

## Satcom Workforce Visibility System

---

## Entity Relationship Overview

```
Company (1) ──┬── User (N)
              │    └── EmployeeProfile (1:1)
              │         └── DeviceRecord (N)
              │
              ├── Project (N)
              │    └── Task (N)
              │
              ├── LeaveTypeConfig (N)
              │    └── LeaveBalance (N per User)
              │
              ├── OfficeLocation (N)
              │    └── GeofencePolicy (1)
              │
              ├── AnomalyRule (N)
              │
              ├── WorkPolicy (1)
              │
              └── RetentionPolicy (1)

User ──┬── AttendanceDay (N)
       │    ├── AttendanceEvent (N)
       │    └── BreakSegment (N)
       │
       ├── TimesheetEntry (N)
       │    └── TimesheetAttachment (N)
       │
       ├── LeaveRequest (N)
       │
       ├── ChatMember (N)
       │    └── ChatThread (N:M)
       │         └── ChatMessage (N)
       │
       ├── AnomalyEvent (N)
       │
       └── AuditLog (N)
```

---

## Core Entities

### Company

Single company entity (single-tenant MVP).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required | Company name |
| domain | String | Optional | Email domain |
| logoUrl | String | Optional | Company logo |
| timezone | String | Default: 'Asia/Kolkata' | Default timezone |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### User

Authentication and role assignment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | String | Unique, Required | Login email |
| passwordHash | String | Required | Bcrypt hash |
| phone | String | Optional | Phone for OTP |
| role | Enum | Required | Employee/Manager/HR/SuperAdmin |
| isActive | Boolean | Default: true | Account status |
| lastLoginAt | DateTime | Optional | Last successful login |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relations**:
- Has one EmployeeProfile
- Has many DeviceRecords
- Has many AttendanceDays
- Has many TimesheetEntries
- Has many LeaveRequests
- Has many ChatMembers
- Has many AnomalyEvents (as subject)
- Has many AuditLogs (as actor)

---

### EmployeeProfile

Employee details and settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK, Unique | Reference to User |
| employeeCode | String | Unique, Required | Employee ID (e.g., SAT001) |
| firstName | String | Required | First name |
| lastName | String | Required | Last name |
| designation | String | Required | Job title |
| department | String | Optional | Department name |
| timezone | String | Default: 'Asia/Kolkata' | User timezone |
| status | Enum | Required | Active/Inactive/OnLeave/Terminated |
| managerId | UUID | FK, Optional | Direct manager |
| avatarUrl | String | Optional | Profile picture URL |
| joinDate | Date | Required | Employment start date |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### DeviceRecord

Verified devices for authentication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Reference to User |
| fingerprint | String | Required | Device fingerprint hash |
| deviceName | String | Required | User-friendly name |
| platform | String | Required | iOS/Android/Web |
| isVerified | Boolean | Default: false | OTP verified |
| lastUsedAt | DateTime | Required | Last authentication |
| createdAt | DateTime | Auto | Creation timestamp |

---

### Project

Work project for timesheet categorization.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required | Project name |
| code | String | Unique, Required | Short code (e.g., PROJ01) |
| description | String | Optional | Project description |
| isActive | Boolean | Default: true | Active status |
| managerId | UUID | FK, Optional | Project manager |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relations**:
- Has many Tasks
- Has many TimesheetEntries (via Task)
- Has many ChatThreads (project-based)

---

### Task

Work task within a project.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| projectId | UUID | FK | Reference to Project |
| name | String | Required | Task name |
| code | String | Required | Short code |
| description | String | Optional | Task description |
| isActive | Boolean | Default: true | Active status |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Constraints**:
- (projectId, code) must be unique

---

## Attendance Entities

### AttendanceDay

Daily attendance record per user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Reference to User |
| date | Date | Required | Calendar date (YYYY-MM-DD) |
| totalWorkMinutes | Int | Default: 0 | Computed work time |
| totalBreakMinutes | Int | Default: 0 | Computed break time |
| totalLunchMinutes | Int | Default: 0 | Computed lunch time |
| overtimeMinutes | Int | Default: 0 | Computed overtime |
| isComplete | Boolean | Default: false | Day completed (checkout done) |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Constraints**:
- (userId, date) must be unique

**Relations**:
- Has many AttendanceEvents
- Has many BreakSegments

---

### AttendanceEvent

Check-in and check-out events.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| attendanceDayId | UUID | FK | Reference to AttendanceDay |
| type | Enum | Required | CheckIn/CheckOut |
| timestamp | DateTime | Required | Event time (UTC) |
| workMode | Enum | Required | Office/Remote/CustomerSite/FieldVisit/Travel |
| latitude | Decimal(10,8) | Optional | GPS latitude |
| longitude | Decimal(11,8) | Optional | GPS longitude |
| verificationStatus | Enum | Default: None | Geofence/QR/Device verification |
| deviceFingerprint | String | Optional | Device identifier |
| notes | String | Optional | User notes |
| isOverride | Boolean | Default: false | Admin override flag |
| overrideReason | String | Optional | Reason for override |
| overrideBy | UUID | FK, Optional | Admin who overrode |
| createdAt | DateTime | Auto | Creation timestamp |

---

### BreakSegment

Break and lunch tracking.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| attendanceDayId | UUID | FK | Reference to AttendanceDay |
| type | Enum | Required | Break/Lunch |
| startTime | DateTime | Required | Start time (UTC) |
| endTime | DateTime | Optional | End time (UTC) |
| durationMinutes | Int | Optional | Computed on end |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

## Timesheet Entities

### TimesheetEntry

Manual time tracking per task.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Reference to User |
| date | Date | Required | Work date |
| projectId | UUID | FK | Reference to Project |
| taskId | UUID | FK | Reference to Task |
| minutes | Int | Required, > 0 | Duration in minutes |
| notes | String | Optional | Work description |
| status | Enum | Default: Draft | Draft/Submitted/Approved/Rejected |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relations**:
- Has many TimesheetAttachments

---

### TimesheetAttachment

File attachments for timesheets.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| timesheetEntryId | UUID | FK | Reference to TimesheetEntry |
| fileName | String | Required | Original file name |
| fileUrl | String | Required | MinIO object URL |
| fileType | String | Required | MIME type |
| fileSize | Int | Required | Size in bytes |
| createdAt | DateTime | Auto | Creation timestamp |

---

## Leave Entities

### LeaveTypeConfig

Leave type definitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required | Display name |
| code | Enum | Required | Leave type code |
| description | String | Optional | Description |
| defaultDays | Int | Required | Annual allocation |
| carryForward | Boolean | Default: false | Allow carry forward |
| maxCarryForward | Int | Default: 0 | Max carry forward days |
| requiresApproval | Boolean | Default: true | Needs HR approval |
| isPaid | Boolean | Default: true | Paid leave |
| isActive | Boolean | Default: true | Available for request |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### LeaveBalance

Per-user leave balances.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Reference to User |
| leaveTypeId | UUID | FK | Reference to LeaveTypeConfig |
| year | Int | Required | Calendar year |
| allocated | Decimal(4,1) | Required | Total allocated days |
| used | Decimal(4,1) | Default: 0 | Used days |
| pending | Decimal(4,1) | Default: 0 | Pending approval |
| remaining | Decimal(4,1) | Computed | Remaining balance |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Constraints**:
- (userId, leaveTypeId, year) must be unique

---

### LeaveRequest

Leave applications.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Reference to User |
| leaveTypeId | UUID | FK | Reference to LeaveTypeConfig |
| startDate | Date | Required | Leave start date |
| endDate | Date | Required | Leave end date |
| totalDays | Decimal(4,1) | Required | Number of days |
| reason | String | Required | Leave reason |
| status | Enum | Default: Pending | Pending/Approved/Rejected/Cancelled |
| approvedBy | UUID | FK, Optional | Approver user |
| approvedAt | DateTime | Optional | Approval timestamp |
| rejectionReason | String | Optional | Rejection reason |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### Holiday

Company holiday calendar.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required | Holiday name |
| date | Date | Required | Holiday date |
| isOptional | Boolean | Default: false | Optional holiday |
| year | Int | Required | Calendar year |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Constraints**:
- (date, year) must be unique

---

## Chat Entities

### ChatThread

Conversation threads.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| type | Enum | Required | Direct/Group/Project |
| name | String | Optional | Group/project name |
| projectId | UUID | FK, Optional | Associated project |
| lastMessageAt | DateTime | Optional | Last message time |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relations**:
- Has many ChatMembers
- Has many ChatMessages

---

### ChatMember

Thread membership.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| threadId | UUID | FK | Reference to ChatThread |
| userId | UUID | FK | Reference to User |
| joinedAt | DateTime | Required | Join timestamp |
| lastReadAt | DateTime | Optional | Last read timestamp |
| unreadCount | Int | Default: 0 | Unread message count |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Constraints**:
- (threadId, userId) must be unique

---

### ChatMessage

Individual messages.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| threadId | UUID | FK | Reference to ChatThread |
| senderId | UUID | FK | Reference to User |
| type | Enum | Required | Text/VoiceNote/File/System |
| content | String | Optional | Text content |
| attachmentUrl | String | Optional | File/voice URL |
| attachmentType | String | Optional | MIME type |
| durationSeconds | Int | Optional | Voice note duration |
| isEdited | Boolean | Default: false | Message edited |
| editedAt | DateTime | Optional | Edit timestamp |
| createdAt | DateTime | Auto | Creation timestamp |

---

## Geofence Entities

### OfficeLocation

Office locations for geofencing.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required | Location name |
| address | String | Required | Full address |
| latitude | Decimal(10,8) | Required | GPS latitude |
| longitude | Decimal(11,8) | Required | GPS longitude |
| radiusMeters | Int | Required, > 0 | Geofence radius |
| isActive | Boolean | Default: true | Active status |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### GeofencePolicy

Geofence settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| isEnabled | Boolean | Default: false | Feature enabled |
| requireGeofenceForOffice | Boolean | Default: false | Require for office mode |
| allowBypassWithReason | Boolean | Default: true | Allow bypass |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

## Anomaly Entities

### AnomalyRule

Detection rule configuration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| type | Enum | Required | Anomaly type |
| name | String | Required | Rule name |
| description | String | Required | Rule description |
| isEnabled | Boolean | Default: true | Rule active |
| severity | Enum | Required | Low/Medium/High/Critical |
| threshold | Int | Required | Trigger threshold |
| windowDays | Int | Required | Rolling window days |
| config | JSON | Default: {} | Additional config |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### AnomalyEvent

Detected anomalies.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK | Subject user |
| ruleId | UUID | FK | Triggering rule |
| type | Enum | Required | Anomaly type |
| severity | Enum | Required | Severity level |
| status | Enum | Default: Open | Open/Acknowledged/Resolved/Dismissed |
| title | String | Required | Alert title |
| description | String | Required | Alert description |
| data | JSON | Required | Context data |
| detectedAt | DateTime | Required | Detection timestamp |
| acknowledgedBy | UUID | FK, Optional | Acknowledger |
| acknowledgedAt | DateTime | Optional | Acknowledge timestamp |
| resolvedBy | UUID | FK, Optional | Resolver |
| resolvedAt | DateTime | Optional | Resolution timestamp |
| resolutionNotes | String | Optional | Resolution notes |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

## Policy Entities

### WorkPolicy

Work hours and rules.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| standardWorkHours | Int | Default: 8 | Daily work hours |
| maxWorkHours | Int | Default: 12 | Max daily hours |
| overtimeThresholdMinutes | Int | Default: 480 | OT starts after (8h) |
| maxOvertimeMinutes | Int | Default: 240 | Max daily OT (4h) |
| breakDurationMinutes | Int | Default: 15 | Standard break |
| lunchDurationMinutes | Int | Default: 60 | Standard lunch |
| graceMinutesLate | Int | Default: 15 | Grace period late |
| graceMinutesEarly | Int | Default: 15 | Grace period early |
| requireTimesheetNotes | Boolean | Default: false | Notes required |
| maxTimesheetMinutesPerDay | Int | Default: 1440 | Max 24h |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

### RetentionPolicy

Data retention settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| chatRetentionDays | Int | Default: 365 | Chat message retention |
| attachmentRetentionDays | Int | Default: 365 | File retention |
| anomalyRetentionDays | Int | Default: 730 | Anomaly retention |
| auditLogRetentionDays | Int | Default: 2555 | Audit log retention (7y) |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

---

## Audit Entity

### AuditLog

Action audit trail.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| actorId | UUID | FK | Acting user |
| action | Enum | Required | Action type |
| entityType | Enum | Required | Affected entity type |
| entityId | UUID | Required | Affected entity ID |
| before | JSON | Optional | State before change |
| after | JSON | Optional | State after change |
| reason | String | Optional | Action reason |
| ipAddress | String | Optional | Client IP |
| userAgent | String | Optional | Client user agent |
| createdAt | DateTime | Auto | Action timestamp |

**Indexes**:
- actorId
- entityType, entityId
- action
- createdAt

---

## Indexes

### Performance Indexes

```sql
-- Attendance queries
CREATE INDEX idx_attendance_day_user_date ON AttendanceDay(userId, date);
CREATE INDEX idx_attendance_event_day ON AttendanceEvent(attendanceDayId);

-- Timesheet queries
CREATE INDEX idx_timesheet_user_date ON TimesheetEntry(userId, date);
CREATE INDEX idx_timesheet_project ON TimesheetEntry(projectId);

-- Leave queries
CREATE INDEX idx_leave_request_user ON LeaveRequest(userId);
CREATE INDEX idx_leave_request_status ON LeaveRequest(status);
CREATE INDEX idx_leave_balance_user_year ON LeaveBalance(userId, year);

-- Chat queries
CREATE INDEX idx_chat_message_thread ON ChatMessage(threadId, createdAt);
CREATE INDEX idx_chat_member_user ON ChatMember(userId);

-- Anomaly queries
CREATE INDEX idx_anomaly_status ON AnomalyEvent(status);
CREATE INDEX idx_anomaly_user ON AnomalyEvent(userId);
CREATE INDEX idx_anomaly_detected ON AnomalyEvent(detectedAt);

-- Audit queries
CREATE INDEX idx_audit_actor ON AuditLog(actorId);
CREATE INDEX idx_audit_entity ON AuditLog(entityType, entityId);
CREATE INDEX idx_audit_created ON AuditLog(createdAt);
```

---

## Data Integrity

### Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | EmployeeProfile | CASCADE |
| User | DeviceRecord | CASCADE |
| User | AttendanceDay | RESTRICT |
| AttendanceDay | AttendanceEvent | CASCADE |
| AttendanceDay | BreakSegment | CASCADE |
| Project | Task | RESTRICT |
| TimesheetEntry | TimesheetAttachment | CASCADE |
| ChatThread | ChatMessage | CASCADE |
| ChatThread | ChatMember | CASCADE |

### Soft Deletes

Entities with `isActive` flag use soft deletes:
- User (via isActive)
- Project (via isActive)
- Task (via isActive)
- LeaveTypeConfig (via isActive)
- OfficeLocation (via isActive)
- AnomalyRule (via isEnabled)
