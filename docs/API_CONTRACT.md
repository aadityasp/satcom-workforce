# API Contract Specification

## Satcom Workforce Visibility System

---

## Base URL

```
Development: http://localhost:3001/api/v1
Production: https://api.satcom.example/api/v1
```

---

## Authentication

All endpoints (except auth) require Bearer token:
```
Authorization: Bearer <access_token>
```

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Invalid email format"]
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or expired token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Request validation failed |
| CONFLICT | 409 | Resource conflict (duplicate) |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Authentication Endpoints

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@satcom.com",
  "password": "securePassword123",
  "deviceFingerprint": "abc123xyz"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "user@satcom.com",
      "role": "Employee",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "designation": "Developer"
      }
    },
    "requiresOtp": true
  }
}
```

### POST /auth/verify-otp

Verify OTP for new device.

**Request:**
```json
{
  "otpCode": "123456",
  "deviceFingerprint": "abc123xyz",
  "deviceName": "iPhone 15"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 3600
  }
}
```

### POST /auth/logout

Invalidate current session.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### POST /auth/password-reset

Request password reset.

**Request:**
```json
{
  "email": "user@satcom.com"
}
```

### POST /auth/password-reset/confirm

Confirm password reset.

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "newSecurePassword123"
}
```

---

## User Management Endpoints

### GET /users

List users (HR/SuperAdmin only).

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `role` (string): Filter by role
- `status` (string): Filter by status
- `search` (string): Search by name/email

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@satcom.com",
      "role": "Employee",
      "isActive": true,
      "profile": {
        "employeeCode": "SAT001",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

### POST /users

Create new user (SuperAdmin only).

**Request:**
```json
{
  "email": "newuser@satcom.com",
  "password": "tempPassword123",
  "phone": "+919876543210",
  "role": "Employee",
  "profile": {
    "employeeCode": "SAT050",
    "firstName": "Jane",
    "lastName": "Smith",
    "designation": "Designer",
    "department": "Engineering",
    "timezone": "Asia/Kolkata",
    "managerId": "manager-uuid",
    "joinDate": "2026-01-20"
  }
}
```

### GET /users/:id

Get user details.

### PATCH /users/:id

Update user (SuperAdmin only).

### GET /users/me

Get current user profile.

### PATCH /users/me/profile

Update own profile.

---

## Attendance Endpoints

### POST /attendance/check-in

Check in for the day.

**Request:**
```json
{
  "workMode": "Office",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "deviceFingerprint": "abc123xyz",
  "notes": "Starting work"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "type": "CheckIn",
      "timestamp": "2026-01-19T09:00:00Z",
      "workMode": "Office",
      "verificationStatus": "GeofencePassed"
    },
    "attendanceDay": {
      "id": "uuid",
      "date": "2026-01-19",
      "totalWorkMinutes": 0,
      "isComplete": false
    }
  }
}
```

### POST /attendance/check-out

Check out for the day.

**Request:**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "notes": "Day completed"
}
```

### POST /attendance/break/start

Start a break.

**Request:**
```json
{
  "type": "Break"
}
```

### POST /attendance/break/:breakId/end

End a break.

### GET /attendance/today

Get today's attendance.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2026-01-19",
    "totalWorkMinutes": 240,
    "totalBreakMinutes": 15,
    "overtimeMinutes": 0,
    "isComplete": false,
    "events": [
      {
        "id": "uuid",
        "type": "CheckIn",
        "timestamp": "2026-01-19T09:00:00Z",
        "workMode": "Office"
      }
    ],
    "breaks": [
      {
        "id": "uuid",
        "type": "Break",
        "startTime": "2026-01-19T11:00:00Z",
        "endTime": "2026-01-19T11:15:00Z",
        "durationMinutes": 15
      }
    ]
  }
}
```

### GET /attendance

Get attendance history.

**Query Parameters:**
- `userId` (uuid): Filter by user (HR/SuperAdmin)
- `startDate` (date): Start date
- `endDate` (date): End date
- `page`, `limit`: Pagination

### GET /attendance/summary

Get attendance summary.

**Query Parameters:**
- `userId` (uuid): Filter by user
- `startDate`, `endDate`: Date range

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalDays": 20,
    "presentDays": 18,
    "absentDays": 0,
    "leaveDays": 2,
    "totalWorkHours": 160,
    "totalOvertimeHours": 10,
    "averageCheckInTime": "09:15:00",
    "averageCheckOutTime": "18:30:00"
  }
}
```

### POST /attendance/:eventId/override

Override attendance event (HR/SuperAdmin).

**Request:**
```json
{
  "timestamp": "2026-01-19T09:00:00Z",
  "workMode": "Remote",
  "reason": "Employee forgot to check in, verified via Slack"
}
```

---

## Timesheet Endpoints

### POST /timesheets

Create timesheet entry.

**Request:**
```json
{
  "date": "2026-01-19",
  "projectId": "project-uuid",
  "taskId": "task-uuid",
  "minutes": 240,
  "notes": "Implemented user authentication"
}
```

### GET /timesheets

Get timesheet entries.

**Query Parameters:**
- `userId` (uuid): Filter by user
- `projectId` (uuid): Filter by project
- `startDate`, `endDate`: Date range
- `page`, `limit`: Pagination

### PATCH /timesheets/:id

Update timesheet entry.

### DELETE /timesheets/:id

Delete timesheet entry.

### POST /timesheets/:id/attachments/upload-url

Get signed URL for attachment upload.

**Request:**
```json
{
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "fileSize": 102400
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://minio.../upload?signature=...",
    "attachmentId": "uuid"
  }
}
```

### GET /timesheets/summary

Get timesheet summary.

---

## Leave Endpoints

### GET /leaves/types

Get available leave types.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sick Leave",
      "code": "Sick",
      "defaultDays": 12,
      "isPaid": true
    }
  ]
}
```

### GET /leaves/balance

Get current user's leave balances.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "id": "uuid",
        "leaveTypeId": "uuid",
        "leaveTypeName": "Sick Leave",
        "year": 2026,
        "allocated": 12,
        "used": 2,
        "pending": 1,
        "remaining": 9
      }
    ],
    "holidays": [
      {
        "id": "uuid",
        "name": "Republic Day",
        "date": "2026-01-26",
        "isOptional": false
      }
    ]
  }
}
```

### POST /leaves/request

Create leave request.

**Request:**
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2026-01-25",
  "endDate": "2026-01-26",
  "reason": "Family function"
}
```

### GET /leaves/requests

Get leave requests.

**Query Parameters:**
- `userId` (uuid): Filter by user
- `status` (string): Filter by status
- `startDate`, `endDate`: Date range

### POST /leaves/requests/:id/approve

Approve leave request (HR/SuperAdmin).

### POST /leaves/requests/:id/reject

Reject leave request (HR/SuperAdmin).

**Request:**
```json
{
  "reason": "Insufficient leave balance"
}
```

### POST /leaves/requests/:id/cancel

Cancel own pending request.

### GET /leaves/holidays

Get holiday calendar.

**Query Parameters:**
- `year` (int): Calendar year

---

## Project & Task Endpoints

### GET /projects

List projects.

### POST /projects

Create project (Manager/HR/SuperAdmin).

**Request:**
```json
{
  "name": "Website Redesign",
  "code": "WEBR01",
  "description": "Company website redesign project"
}
```

### PATCH /projects/:id

Update project.

### GET /projects/:id/tasks

Get project tasks.

### POST /projects/:id/tasks

Create task.

**Request:**
```json
{
  "name": "Homepage Design",
  "code": "HPD",
  "description": "Design new homepage"
}
```

---

## Presence & Availability Endpoints

### GET /presence/list

Get all users' availability.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "uuid",
        "status": "Online",
        "lastSeenAt": "2026-01-19T10:30:00Z",
        "currentWorkMode": "Office",
        "currentProjectId": "uuid",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "designation": "Developer",
          "avatarUrl": "https://..."
        }
      }
    ]
  }
}
```

### POST /presence/heartbeat

Send presence heartbeat.

**Request:**
```json
{
  "currentProjectId": "uuid",
  "currentTaskId": "uuid"
}
```

---

## Chat Endpoints

### GET /chat/threads

Get user's chat threads.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "Direct",
      "lastMessageAt": "2026-01-19T10:30:00Z",
      "unreadCount": 2,
      "members": [
        {
          "userId": "uuid",
          "firstName": "Jane"
        }
      ],
      "lastMessage": {
        "content": "Hey, can we sync?",
        "senderId": "uuid"
      }
    }
  ]
}
```

### POST /chat/threads/direct

Create direct message thread.

**Request:**
```json
{
  "userId": "other-user-uuid"
}
```

### POST /chat/threads/group

Create group thread.

**Request:**
```json
{
  "name": "Project Alpha Team",
  "memberIds": ["uuid1", "uuid2"],
  "projectId": "project-uuid"
}
```

### GET /chat/threads/:threadId/messages

Get messages in thread.

**Query Parameters:**
- `before` (uuid): Cursor for pagination
- `limit` (int): Messages per page

### POST /chat/threads/:threadId/messages

Send message.

**Request:**
```json
{
  "type": "Text",
  "content": "Hello team!"
}
```

### POST /chat/threads/:threadId/voice-note/upload-url

Get signed URL for voice note upload.

**Request:**
```json
{
  "fileName": "voice_note.webm",
  "durationSeconds": 45
}
```

### POST /chat/threads/:threadId/trigger-email

Send chat via email.

**Request:**
```json
{
  "messageIds": ["uuid1", "uuid2"],
  "recipients": ["external@example.com"],
  "subject": "Chat Summary"
}
```

---

## Anomaly Endpoints

### GET /anomalies

Get anomaly events (HR/SuperAdmin).

**Query Parameters:**
- `userId` (uuid): Filter by user
- `status` (string): Filter by status
- `type` (string): Filter by anomaly type
- `severity` (string): Filter by severity
- `startDate`, `endDate`: Date range

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "type": "RepeatedLateCheckIn",
      "severity": "Medium",
      "status": "Open",
      "title": "Repeated Late Check-Ins",
      "description": "5 late check-ins in the last 7 days",
      "detectedAt": "2026-01-19T10:00:00Z"
    }
  ]
}
```

### GET /anomalies/summary

Get anomaly summary.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "open": 10,
    "acknowledged": 8,
    "resolved": 7,
    "bySeverity": [
      { "severity": "High", "count": 5 },
      { "severity": "Medium", "count": 15 }
    ],
    "byType": [
      { "type": "RepeatedLateCheckIn", "count": 8 }
    ]
  }
}
```

### POST /anomalies/:id/acknowledge

Acknowledge anomaly.

**Request:**
```json
{
  "notes": "Will discuss with employee"
}
```

### POST /anomalies/:id/resolve

Resolve anomaly.

**Request:**
```json
{
  "notes": "Discussed with employee, issue addressed"
}
```

### POST /anomalies/:id/dismiss

Dismiss anomaly.

**Request:**
```json
{
  "reason": "False positive - approved overtime"
}
```

---

## Admin Endpoints

### GET /admin/policies/work

Get work policy.

### PATCH /admin/policies/work

Update work policy (SuperAdmin).

**Request:**
```json
{
  "standardWorkHours": 8,
  "overtimeThresholdMinutes": 480,
  "graceMinutesLate": 15
}
```

### GET /admin/policies/geofence

Get geofence policy.

### PATCH /admin/policies/geofence

Update geofence policy (SuperAdmin).

### GET /admin/office-locations

List office locations.

### POST /admin/office-locations

Create office location (SuperAdmin).

**Request:**
```json
{
  "name": "Bangalore HQ",
  "address": "123 Tech Park, Bangalore",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "radiusMeters": 100
}
```

### GET /admin/anomaly-rules

Get anomaly rules.

### PATCH /admin/anomaly-rules/:id

Update anomaly rule (SuperAdmin).

### GET /admin/audit-logs

Get audit logs (SuperAdmin).

**Query Parameters:**
- `actorId` (uuid): Filter by actor
- `action` (string): Filter by action
- `entityType` (string): Filter by entity type
- `startDate`, `endDate`: Date range

---

## Dashboard Endpoints

### GET /dashboard/summary

Get dashboard summary (HR/SuperAdmin).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "onlineCount": 25,
    "checkedInCount": 28,
    "onLeaveCount": 2,
    "openAnomalies": 5,
    "pendingLeaveRequests": 3,
    "todayAttendanceRate": 93.3,
    "workModeBreakdown": [
      { "mode": "Office", "count": 20 },
      { "mode": "Remote", "count": 8 }
    ]
  }
}
```

### GET /dashboard/project-time

Get time by project.

**Query Parameters:**
- `startDate`, `endDate`: Date range

---

## WebSocket Events

### Connection

```javascript
const socket = io('ws://localhost:3001', {
  auth: { token: accessToken }
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `presence:heartbeat` | `{ projectId?, taskId? }` | Update presence |
| `chat:typing:start` | `{ threadId }` | Start typing indicator |
| `chat:typing:stop` | `{ threadId }` | Stop typing indicator |
| `chat:read` | `{ threadId, messageId }` | Mark messages read |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `presence:update` | `{ userId, status, lastSeenAt }` | Presence change |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `chat:message` | `{ threadId, message }` | New message |
| `chat:typing:start` | `{ threadId, userId, userName }` | User typing |
| `chat:typing:stop` | `{ threadId, userId }` | User stopped typing |
| `attendance:checkin` | `{ userId, event }` | User checked in |
| `attendance:checkout` | `{ userId, event }` | User checked out |
| `anomaly:new` | `{ anomaly }` | New anomaly detected |
| `notification` | `{ id, type, title, body }` | General notification |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 5 requests/minute |
| File Upload | 10 requests/minute |
| General API | 100 requests/minute |
| WebSocket Messages | 30 messages/minute |

---

## Versioning

API version is included in the URL path (`/api/v1`). Breaking changes will increment the version number. Deprecated endpoints will be announced 30 days before removal.
