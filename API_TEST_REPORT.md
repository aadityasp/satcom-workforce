# API End-to-End Test Report
**Test Date:** 2026-02-01
**API Base URL:** http://localhost:3003/api/v1
**Test Executor:** QA Engineer (Claude)

## Executive Summary
- **Total Tests Executed:** 18
- **Passed:** 15
- **Failed:** 3
- **Pass Rate:** 83.3%

### Critical Issues Found
1. GET /users returns 500 Internal Server Error
2. GET /anomalies returns 500 Internal Server Error
3. GET /chat/threads/{threadId}/messages returns 500 Internal Server Error

---

## Test Results by Category

### 1. Authentication Flow (4/4 PASSED)

#### 1.1 Login as SuperAdmin
- **Endpoint:** POST /auth/login
- **Credentials:** admin@satcom.com / Password123!
- **Status:** PASS
- **Response:** `{"success":true,"data":{"accessToken":"eyJhbGci...","refreshToken":"eyJhbGci...","expiresIn":900,"user":{"id":"43894994-7278-469a-a734-d2e0a036118e","email":"admin@satcom.com","role":"SuperAdmin","profile":{"firstName":"Vijay","lastName":"Kumar"...`
- **Verified:** accessToken, refreshToken, user.role="SuperAdmin" present

#### 1.2 Login as HR
- **Endpoint:** POST /auth/login
- **Credentials:** hr@satcom.com / Password123!
- **Status:** PASS
- **Response:** `{"success":true,"data":{"accessToken":"eyJhbGci...","refreshToken":"eyJhbGci...","expiresIn":900,"user":{"id":"e96be87d-4bdb-4c07-bc56-3fbae1ea9071","email":"hr@satcom.com","role":"HR","profile":{"firstName":"Priya"...`
- **Verified:** accessToken, refreshToken, user.role="HR" present

#### 1.3 Login as Manager
- **Endpoint:** POST /auth/login
- **Credentials:** manager@satcom.com / Password123!
- **Status:** PASS
- **Response:** `{"success":true,"data":{"accessToken":"eyJhbGci...","refreshToken":"eyJhbGci...","expiresIn":900,"user":{"id":"a7cc4771-1080-41e1-b3d5-6dd5a3bcb4f1","email":"manager@satcom.com","role":"Manager","profile":{"firstName":"Vikram"...`
- **Verified:** accessToken, refreshToken, user.role="Manager" present

#### 1.4 Login as Employee
- **Endpoint:** POST /auth/login
- **Credentials:** john@satcom.com / Password123!
- **Status:** PASS
- **Response:** `{"success":true,"data":{"accessToken":"eyJhbGci...","refreshToken":"eyJhbGci...","expiresIn":900,"user":{"id":"c7c5fa20-31fb-4a86-b8f1-0f30473ca091","email":"john@satcom.com","role":"Employee","profile":{"firstName":"John"...`
- **Verified:** accessToken, refreshToken, user.role="Employee" present

---

### 2. SuperAdmin Dashboard (3/5 PASSED)

#### 2.1 Dashboard Summary
- **Endpoint:** GET /admin/dashboard/summary
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":{"onlineCount":1,"checkedInCount":1,"onLeaveCount":0,"openAnomalies":2,"pendingLeaveRequests":1,"todayAttendanceRate":16.7}}`
- **Verified:** All expected dashboard metrics returned

#### 2.2 Get Users List
- **Endpoint:** GET /users
- **Token:** SuperAdmin
- **Status:** FAIL
- **Response:** `{"statusCode":500,"message":"Internal server error"}`
- **Error:** 500 Internal Server Error
- **Impact:** SuperAdmin cannot view users list
- **Root Cause:** Unknown - requires server log investigation

#### 2.3 Get Presence List
- **Endpoint:** GET /presence/list
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":{"users":[{"userId":"43894994-7278-469a-a734-d2e0a036118e","status":"Away","lastSeenAt":"2026-02-01T03:06:49.819Z","currentWorkMode":null,"statusMessage":null,...`
- **Verified:** Returns 6 users with profile information (Vijay Kumar, Priya Patel, Vikram Singh, John Doe, Jane Smith, Bob Johnson)

#### 2.4 Get Anomalies
- **Endpoint:** GET /anomalies
- **Token:** SuperAdmin
- **Status:** FAIL
- **Response:** `{"statusCode":500,"message":"Internal server error"}`
- **Error:** 500 Internal Server Error
- **Impact:** SuperAdmin cannot view system anomalies
- **Root Cause:** Unknown - requires server log investigation

#### 2.5 Get Pending Leave Requests
- **Endpoint:** GET /leaves/requests/pending
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":[{"id":"d431a113-d1eb-4e8d-ae30-cb7651cea932","userId":"c7c5fa20-31fb-4a86-b8f1-0f30473ca091","leaveTypeId":"39d2995f-6ed0-4670-9f1a-6ef9ff01b67e","startDate":"2026-02-08T00:00:00.000Z","endDate":"2026-02-09T00:00:00.000Z","totalDays":"2","reason":"Family function","status":"Pending"...`
- **Verified:** Returns 1 pending leave request from John Doe for 2 days Casual Leave

---

### 3. Team/Presence (1/1 PASSED)

#### 3.1 Manager - Get Presence List
- **Endpoint:** GET /presence/list
- **Token:** Manager (Vikram Singh)
- **Status:** PASS
- **Response:** `{"success":true,"data":{"users":[{"userId":"43894994-7278-469a-a734-d2e0a036118e","status":"Away","lastSeenAt":"2026-02-01T03:06:49.819Z"...`
- **Verified:** Manager can see all 6 team members with their status and profiles

---

### 4. Attendance Flow (4/4 PASSED)

#### 4.1 Get Today's Attendance (Before Check-in)
- **Endpoint:** GET /attendance/today
- **Token:** Employee (John Doe)
- **Status:** PASS
- **Response:** `{"success":true,"data":{"date":"2026-02-01T00:00:00.000Z","status":"not_checked_in","totalWorkMinutes":0,"totalBreakMinutes":0,"totalLunchMinutes":0,"overtimeMinutes":0,"events":[],"breaks":[],"policy":{"breakDurationMinutes":15,"lunchDurationMinutes":60...`
- **Verified:** Status is "not_checked_in", no events, policy details included

#### 4.2 Check In to Office
- **Endpoint:** POST /attendance/check-in
- **Token:** Employee (John Doe)
- **Payload:** `{"workMode": "Office", "latitude": 0, "longitude": 0}`
- **Status:** PASS
- **Response:** `{"success":true,"data":{"event":{"id":"233a65f4-eb51-45b2-bcdf-b3dc5586fafb","attendanceDayId":"924388a4-fc09-4d63-8cd6-7d94fe00ed8f","type":"CheckIn","timestamp":"2026-02-01T03:21:07.970Z","workMode":"Office","latitude":"0","longitude":"0","verificationStatus":"GeofenceFailed"...`
- **Verified:** Check-in successful with timestamp, workMode=Office
- **Note:** verificationStatus="GeofenceFailed" as expected (coordinates 0,0 outside geofence)

#### 4.3 Get Today's Attendance (After Check-in)
- **Endpoint:** GET /attendance/today
- **Token:** Employee (John Doe)
- **Status:** PASS
- **Response:** `{"success":true,"data":{"id":"924388a4-fc09-4d63-8cd6-7d94fe00ed8f","date":"2026-02-01T00:00:00.000Z","status":"working","checkInTime":"2026-02-01T03:21:07.970Z","workMode":"Office","totalWorkMinutes":0,"totalBreakMinutes":0,"totalLunchMinutes":0,"overtimeMinutes":0,"events":[{"id":"233a65f4-eb51-45b2-bcdf-b3dc5586fafb","type":"CheckIn","timestamp":"2026-02-01T03:21:07.970Z"...`
- **Verified:** Status changed to "working", checkInTime recorded, 1 CheckIn event in events array

#### 4.4 Check Out
- **Endpoint:** POST /attendance/check-out
- **Token:** Employee (John Doe)
- **Payload:** `{"latitude": 0, "longitude": 0}`
- **Status:** PASS
- **Response:** `{"success":true,"data":{"event":{"id":"ea2c7f2a-3204-4363-b813-37019572b4dc","attendanceDayId":"924388a4-fc09-4d63-8cd6-7d94fe00ed8f","type":"CheckOut","timestamp":"2026-02-01T03:21:18.828Z","workMode":"Office","latitude":"0","longitude":"0","verificationStatus":"None"...`
- **Verified:** Check-out successful, status changed to "checked_out", 2 events (CheckIn + CheckOut), summary includes workedMinutes=0 (short duration)

---

### 5. Chat Flow (4/5 PASSED)

#### 5.1 Get Chat Threads (Initial)
- **Endpoint:** GET /chat/threads
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":[]}`
- **Verified:** Empty array returned as expected (no threads yet)

#### 5.2 Search Users
- **Endpoint:** GET /chat/users/search?q=john
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":[{"id":"7d0fb49c-1377-46a2-a72c-4d2838a67dd9","companyId":"5725ce92-8bff-4ce0-b692-f0e5565bfb9d","email":"bob@satcom.com","role":"Employee","profile":{"firstName":"Bob","lastName":"Johnson"...`
- **Verified:** Search returns 2 users: Bob Johnson and John Doe (both contain "john")

#### 5.3 Create Direct Message Thread
- **Endpoint:** POST /chat/threads/direct
- **Token:** SuperAdmin
- **Payload:** `{"userId": "c7c5fa20-31fb-4a86-b8f1-0f30473ca091"}`
- **Status:** PASS
- **Response:** `{"success":true,"data":{"id":"dcd12070-078f-412c-a5dd-a03b29eb697e","type":"Direct","name":null,"projectId":null,"lastMessageAt":null,"createdAt":"2026-02-01T03:21:59.647Z","updatedAt":"2026-02-01T03:21:59.647Z","members":[{"userId":"43894994-7278-469a-a734-d2e0a036118e"...`
- **Verified:** Thread created with 2 members (admin + john), type="Direct"
- **Note:** Initial API request with "participantId" failed, corrected to "userId" field

#### 5.4 Get Chat Threads (After Creation)
- **Endpoint:** GET /chat/threads
- **Token:** SuperAdmin
- **Status:** PASS
- **Response:** `{"success":true,"data":[{"id":"dcd12070-078f-412c-a5dd-a03b29eb697e","type":"Direct","name":null,"projectId":null,"lastMessageAt":null,"createdAt":"2026-02-01T03:21:59.647Z","updatedAt":"2026-02-01T03:21:59.647Z","members":[...`
- **Verified:** 1 thread now exists with correct member details

#### 5.5 Send Message to Thread
- **Endpoint:** POST /chat/threads/{threadId}/messages
- **Token:** SuperAdmin
- **Payload:** `{"content": "Hello from admin", "type": "Text"}`
- **Status:** PASS
- **Response:** `{"success":true,"data":{"id":"d7703aaf-4a19-4e93-a78c-14492a5d048d","threadId":"dcd12070-078f-412c-a5dd-a03b29eb697e","senderId":"43894994-7278-469a-a734-d2e0a036118e","type":"Text","content":"Hello from admin","attachmentUrl":null,"attachmentType":null,"durationSeconds":null,"isEdited":false...`
- **Verified:** Message created successfully with content, sender details included

#### 5.6 Get Messages from Thread
- **Endpoint:** GET /chat/threads/{threadId}/messages
- **Token:** SuperAdmin
- **Status:** FAIL
- **Response:** `{"statusCode":500,"message":"Internal server error"}`
- **Error:** 500 Internal Server Error
- **Impact:** Cannot retrieve messages from thread despite successful message creation
- **Root Cause:** Unknown - requires server log investigation

---

### 6. Timesheets (1/1 PASSED)

#### 6.1 Get Projects List
- **Endpoint:** GET /timesheets/projects
- **Token:** Employee (John Doe)
- **Status:** PASS
- **Response:** `{"success":true,"data":[{"id":"d949d0ad-34f2-4067-94de-969857405d50","companyId":"5725ce92-8bff-4ce0-b692-f0e5565bfb9d","name":"Customer Support","code":"SUPP","description":"Customer support and tickets","isActive":true,"managerId":"e96be87d-4bdb-4c07-bc56-3fbae1ea9071","tasks":[{"id":"b701ed62-1c0a-43c7-afa1-416703ed2f9c","name":"Ticket Resolution","code":"TKT"}...`
- **Verified:** Returns 3 projects with tasks:
  - Customer Support (SUPP) - 2 tasks
  - Internal Tools (INTL) - 3 tasks
  - Website Redesign (WEBR) - 3 tasks

---

### 7. Leaves (1/1 PASSED)

#### 7.1 Get Leave Balance
- **Endpoint:** GET /leaves/balance
- **Token:** Employee (John Doe)
- **Status:** PASS
- **Response:** `{"success":true,"data":{"balances":[{"id":"22744141-5fb2-4273-9f84-409ba10c5e76","userId":"c7c5fa20-31fb-4a86-b8f1-0f30473ca091","leaveTypeId":"446a9fce-8985-4ba7-9dc8-0c6046a9e806","year":2026,"allocated":"12","used":"0","pending":"0","leaveType":{"name":"Sick Leave","code":"Sick"...`
- **Verified:** Returns 6 leave types with balances:
  - Sick Leave: 12 allocated, 0 used
  - Casual Leave: 12 allocated, 0 used
  - Earned Leave: 15 allocated, 0 used
  - Work From Home: 365 allocated, 0 used
  - Comp Off: 0 allocated, 0 used
  - Loss of Pay (LOP): 0 allocated, 0 used (isPaid=false)

---

## Critical Findings

### High Priority Issues

#### Issue 1: GET /users Endpoint Failure
- **Severity:** HIGH
- **Endpoint:** GET /users
- **Error:** 500 Internal Server Error
- **Impact:** SuperAdmin cannot manage or view users list
- **Affected Roles:** SuperAdmin
- **Repro Steps:**
  1. Login as admin@satcom.com
  2. Call GET /users with SuperAdmin token
  3. Observe 500 error
- **Expected:** Should return list of all company users
- **Actual:** Returns `{"statusCode":500,"message":"Internal server error"}`

#### Issue 2: GET /anomalies Endpoint Failure
- **Severity:** HIGH
- **Endpoint:** GET /anomalies
- **Error:** 500 Internal Server Error
- **Impact:** SuperAdmin cannot view or manage system anomalies
- **Affected Roles:** SuperAdmin, possibly HR
- **Repro Steps:**
  1. Login as admin@satcom.com
  2. Call GET /anomalies with SuperAdmin token
  3. Observe 500 error
- **Expected:** Should return list of anomalies (dashboard shows 2 open anomalies)
- **Actual:** Returns `{"statusCode":500,"message":"Internal server error"}`

#### Issue 3: GET /chat/threads/{threadId}/messages Endpoint Failure
- **Severity:** MEDIUM-HIGH
- **Endpoint:** GET /chat/threads/{threadId}/messages
- **Error:** 500 Internal Server Error
- **Impact:** Users cannot retrieve chat messages from threads
- **Affected Roles:** All roles
- **Repro Steps:**
  1. Login as admin@satcom.com
  2. Create a direct message thread with another user
  3. Send a message to the thread (succeeds)
  4. Try to GET messages from the thread
  5. Observe 500 error
- **Expected:** Should return array of messages
- **Actual:** Returns `{"statusCode":500,"message":"Internal server error"}`
- **Note:** Message creation works, but retrieval fails

---

## Positive Findings

### Working Features
1. Authentication system fully functional for all roles
2. SuperAdmin dashboard summary displays correctly
3. Presence/team list works for both SuperAdmin and Manager roles
4. Attendance check-in/check-out flow complete and functional
5. Geofence verification properly detects failures
6. Chat thread creation and user search working
7. Message sending functional
8. Timesheets project list retrieval working
9. Leave balance retrieval working with all leave types
10. Pending leave requests visible to SuperAdmin

### Notable Features
- Geofence verification status properly recorded ("GeofenceFailed" when outside radius)
- Attendance policy details included in responses (break/lunch durations, overtime thresholds)
- Leave types include LOP (Loss of Pay) with isPaid=false flag
- User search is partial match (searching "john" returns "Bob Johnson")
- Work From Home has 365 days allocated by default

---

## Recommendations

### Immediate Actions Required
1. **Fix GET /users endpoint** - Check server logs, likely database query or join issue
2. **Fix GET /anomalies endpoint** - Critical for monitoring system health
3. **Fix GET /chat/threads/{threadId}/messages endpoint** - Message retrieval broken despite creation working

### Investigation Steps
1. Check API server logs at time of failures (around 2026-02-01T03:19-03:22 UTC)
2. Verify database queries for /users, /anomalies, and chat messages endpoints
3. Check for missing joins or null reference errors
4. Verify pagination/limit parameters if applicable

### Future Testing Recommendations
1. Test attendance flow with valid geofence coordinates
2. Test break start/end functionality
3. Test overtime calculation edge cases
4. Test leave request approval workflow
5. Test anomaly creation and resolution
6. Test chat with voice notes (file upload)
7. Test timesheet entry creation and editing
8. Test RBAC restrictions (Employee trying HR-only actions)

---

## Test Environment Details
- **API Version:** v1
- **Base URL:** http://localhost:3003/api/v1
- **Database:** Populated with seed data
- **Test Users:**
  - SuperAdmin: admin@satcom.com (Vijay Kumar)
  - HR: hr@satcom.com (Priya Patel)
  - Manager: manager@satcom.com (Vikram Singh)
  - Employee: john@satcom.com (John Doe)
- **Company:** Satcom (ID: 5725ce92-8bff-4ce0-b692-f0e5565bfb9d)

---

## Appendix: Test Tokens

### SuperAdmin Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Mzg5NDk5NC03Mjc4LTQ2OWEtYTczNC1kMmUwYTAzNjExOGUiLCJlbWFpbCI6ImFkbWluQHNhdGNvbS5jb20iLCJyb2xlIjoiU3VwZXJBZG1pbiIsImlhdCI6MTc2OTkxNTk5MywiZXhwIjoxNzY5OTE2ODkzfQ.Hqw26npHS4G3GVSfIUZiNNv7Sr3TgCV2hdtP2XqZNSQ
```

### HR Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlOTZiZTg3ZC00YmRiLTRjMDctYmM1Ni0zZmJhZTFlYTkwNzEiLCJlbWFpbCI6ImhyQHNhdGNvbS5jb20iLCJyb2xlIjoiSFIiLCJpYXQiOjE3Njk5MTU5OTQsImV4cCI6MTc2OTkxNjg5NH0.a2SXOlGIuwVUhPDCUshNAmJzhqmD8eEVP5YKrIBP4Ls
```

### Manager Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhN2NjNDc3MS0xMDgwLTQxZTEtYjNkNS02ZGQ1YTNiY2I0ZjEiLCJlbWFpbCI6Im1hbmFnZXJAc2F0Y29tLmNvbSIsInJvbGUiOiJNYW5hZ2VyIiwiaWF0IjoxNzY5OTE1OTk1LCJleHAiOjE3Njk5MTY4OTV9.-fmCgpDMld5J13KT5p3qPj5nxPAAjG6Pd36_wq7kyBk
```

### Employee Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjN2M1ZmEyMC0zMWZiLTRhODYtYjhmMS0wZjMwNDczY2EwOTEiLCJlbWFpbCI6ImpvaG5Ac2F0Y29tLmNvbSIsInJvbGUiOiJFbXBsb3llZSIsImlhdCI6MTc2OTkxNTk5NiwiZXhwIjoxNzY5OTE2ODk2fQ.4TqHfGDQKHeLqO5kXBEnoogGh6pDH9Fd0EfRYs5XAVM
```

---

**Report Generated:** 2026-02-01T03:23:00Z
**Test Duration:** ~4 minutes
**Tester:** QA Engineer (Claude)
