# Requirements: Satcom Workforce

**Defined:** 2026-01-24
**Core Value:** Management sees real-time employee location, activity, and productivity — employees have a fast, friction-free app for daily work tasks.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User session persists across browser/app refresh (JWT with refresh tokens)
- [ ] **AUTH-03**: User can log out from any device
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: All 4 roles have correct permissions (SuperAdmin, HR, Manager, Employee)
- [ ] **AUTH-06**: Protected routes redirect unauthenticated users to login

### Attendance

- [ ] **ATTN-01**: User can check in with work mode selection (Office, Remote, CustomerSite, FieldVisit, Travel)
- [ ] **ATTN-02**: User can check out with automatic work duration calculation
- [ ] **ATTN-03**: User can start/end breaks (Break, Lunch) with duration tracking
- [ ] **ATTN-04**: System enforces break policy (max duration, overlap prevention)
- [ ] **ATTN-05**: System calculates overtime based on configured threshold
- [ ] **ATTN-06**: User sees today's attendance timeline (check-in, breaks, check-out)
- [ ] **ATTN-07**: GPS coordinates captured at check-in (mobile only, foreground permission)

### Location & Geofence

- [ ] **LOCN-01**: Super Admin can configure office locations with name, coordinates, and radius
- [ ] **LOCN-02**: Super Admin can manage multiple geofence locations
- [ ] **LOCN-03**: System verifies check-in location against geofence (Office work mode only)
- [ ] **LOCN-04**: Check-in shows verification status (Verified/Unverified/Not Required)
- [ ] **LOCN-05**: System creates anomaly alert when check-in fails geofence verification
- [ ] **LOCN-06**: Super Admin can view check-in locations (other roles cannot)
- [ ] **LOCN-07**: Super Admin can view map with all users' check-in locations
- [ ] **LOCN-08**: Super Admin can view map with users' activity update locations

### Timesheets

- [ ] **TIME-01**: User can create timesheet entry with project and task selection
- [ ] **TIME-02**: User can enter hours/minutes worked on each entry
- [ ] **TIME-03**: User can add notes to timesheet entries
- [ ] **TIME-04**: User can attach files/photos to timesheet entries (via MinIO)
- [ ] **TIME-05**: System validates max 24 hours per day
- [ ] **TIME-06**: System validates task belongs to selected project
- [ ] **TIME-07**: User can edit/delete own timesheet entries (same day only)
- [ ] **TIME-08**: User can view timesheet history with filters

### Activity Tracking

- [ ] **ACTV-01**: User can set current task/project they're working on
- [ ] **ACTV-02**: User can post status updates (brief "what I'm doing" notes)
- [ ] **ACTV-03**: Current activity displays alongside presence status
- [ ] **ACTV-04**: User can view task time breakdown (time spent per task/project today)
- [ ] **ACTV-05**: Manager can view team's current activities
- [ ] **ACTV-06**: GPS coordinates captured when user updates task/status (mobile only)

### Presence & Availability

- [ ] **PRES-01**: System tracks Online/Away/Offline status via heartbeat
- [ ] **PRES-02**: User can view team availability list with status indicators
- [ ] **PRES-03**: Presence shows last seen timestamp for offline users
- [ ] **PRES-04**: Presence shows current work mode (Office, Remote, etc.)
- [ ] **PRES-05**: Presence updates in real-time via WebSocket
- [ ] **PRES-06**: User can filter team list by status, department

### Chat

- [ ] **CHAT-01**: User can start 1:1 direct message with any team member
- [ ] **CHAT-02**: User can create/join group chats
- [ ] **CHAT-03**: Messages deliver in real-time via WebSocket
- [ ] **CHAT-04**: User can view message history with pagination
- [ ] **CHAT-05**: Chat shows read receipts / delivery status
- [ ] **CHAT-06**: All roles have access to chat (Employee, Manager, HR, SuperAdmin)

### Reports & Dashboards

- [ ] **REPT-01**: Manager can view team attendance dashboard (check-in times, late arrivals, absences)
- [ ] **REPT-02**: Manager can view team timesheet summary (hours per member, project breakdown)
- [ ] **REPT-03**: HR/Admin can view organization-wide attendance compliance
- [ ] **REPT-04**: HR/Admin can view all anomalies with status
- [ ] **REPT-05**: User can export reports to PDF with formatting and charts
- [ ] **REPT-06**: Dashboard shows relevant metrics per role

### Mobile App

- [ ] **MOBL-01**: User can log in and maintain session on mobile (iOS + Android)
- [ ] **MOBL-02**: User can check in/out with location capture on mobile
- [ ] **MOBL-03**: User can create timesheet entries on mobile
- [ ] **MOBL-04**: User can view team presence/availability on mobile
- [ ] **MOBL-05**: User can chat (1:1 and groups) on mobile
- [ ] **MOBL-06**: Mobile app requests location permission with clear explanation
- [ ] **MOBL-07**: Mobile app works offline for viewing (drafts for entry)

### Documentation

- [ ] **DOCS-01**: API documentation via Swagger/OpenAPI for all endpoints
- [ ] **DOCS-02**: Inline code comments for complex logic
- [ ] **DOCS-03**: User guides for each role (Employee, Manager, HR, SuperAdmin)
- [ ] **DOCS-04**: Deployment guide with setup instructions
- [ ] **DOCS-05**: README with project overview and quick start

### Admin & Settings

- [ ] **ADMN-01**: Super Admin can manage users (create, edit, deactivate)
- [ ] **ADMN-02**: Super Admin can assign roles to users
- [ ] **ADMN-03**: Super Admin can configure work policies (break limits, overtime threshold)
- [ ] **ADMN-04**: Super Admin can manage projects and tasks
- [ ] **ADMN-05**: Super Admin can view audit logs

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Leave Management

- **LEAV-01**: User can request leave with type, dates, and reason
- **LEAV-02**: System checks leave balance before submission
- **LEAV-03**: HR/Admin can approve/reject leave requests
- **LEAV-04**: System updates leave balance on approval
- **LEAV-05**: Admin can configure leave types and policies
- **LEAV-06**: Admin can manage holiday calendar

### Advanced Features

- **ADVN-01**: Voice notes in chat (max 5 min recording)
- **ADVN-02**: Export reports to Excel
- **ADVN-03**: Scheduled report emails (weekly/monthly)
- **ADVN-04**: Device verification via OTP for new logins
- **ADVN-05**: Anomaly detection with configurable rules
- **ADVN-06**: Anomaly resolution workflow

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Continuous GPS tracking | Privacy violation, battery drain, not needed |
| Screenshot capture | Surveillance, privacy concern |
| Keystroke logging | Illegal in many jurisdictions |
| Location history timeline | Surveillance-like, employees will resist |
| Individual employee dashboards | Management focus, not self-tracking |
| Multi-tenant SaaS | Single tenant for Satcom |
| Payroll integration | Separate system |
| SSO/SAML | Email/password sufficient for v1 |
| Performance reviews | Separate process |
| Expense management | Not needed |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | 1 | Pending |
| AUTH-02 | 1 | Pending |
| AUTH-03 | 1 | Pending |
| AUTH-04 | 1 | Pending |
| AUTH-05 | 1 | Pending |
| AUTH-06 | 1 | Pending |
| ATTN-01 | 2 | Pending |
| ATTN-02 | 2 | Pending |
| ATTN-03 | 2 | Pending |
| ATTN-04 | 2 | Pending |
| ATTN-05 | 2 | Pending |
| ATTN-06 | 2 | Pending |
| ATTN-07 | 2 | Pending |
| TIME-01 | 3 | Pending |
| TIME-02 | 3 | Pending |
| TIME-03 | 3 | Pending |
| TIME-04 | 3 | Pending |
| TIME-05 | 3 | Pending |
| TIME-06 | 3 | Pending |
| TIME-07 | 3 | Pending |
| TIME-08 | 3 | Pending |
| LOCN-01 | 4 | Pending |
| LOCN-02 | 4 | Pending |
| LOCN-03 | 4 | Pending |
| LOCN-04 | 4 | Pending |
| LOCN-05 | 4 | Pending |
| LOCN-06 | 4 | Pending |
| LOCN-07 | 4 | Pending |
| LOCN-08 | 4 | Pending |
| ACTV-01 | 5 | Pending |
| ACTV-02 | 5 | Pending |
| ACTV-03 | 5 | Pending |
| ACTV-04 | 5 | Pending |
| ACTV-05 | 5 | Pending |
| ACTV-06 | 5 | Pending |
| PRES-01 | 5 | Pending |
| PRES-02 | 5 | Pending |
| PRES-03 | 5 | Pending |
| PRES-04 | 5 | Pending |
| PRES-05 | 5 | Pending |
| PRES-06 | 5 | Pending |
| CHAT-01 | 6 | Pending |
| CHAT-02 | 6 | Pending |
| CHAT-03 | 6 | Pending |
| CHAT-04 | 6 | Pending |
| CHAT-05 | 6 | Pending |
| CHAT-06 | 6 | Pending |
| REPT-01 | 7 | Pending |
| REPT-02 | 7 | Pending |
| REPT-03 | 7 | Pending |
| REPT-04 | 7 | Pending |
| REPT-05 | 7 | Pending |
| REPT-06 | 7 | Pending |
| MOBL-01 | 8 | Pending |
| MOBL-02 | 8 | Pending |
| MOBL-03 | 8 | Pending |
| MOBL-04 | 8 | Pending |
| MOBL-05 | 8 | Pending |
| MOBL-06 | 8 | Pending |
| MOBL-07 | 8 | Pending |
| DOCS-01 | 9 | Pending |
| DOCS-02 | 9 | Pending |
| DOCS-03 | 9 | Pending |
| DOCS-04 | 9 | Pending |
| DOCS-05 | 9 | Pending |
| ADMN-01 | 9 | Pending |
| ADMN-02 | 9 | Pending |
| ADMN-03 | 9 | Pending |
| ADMN-04 | 3 | Pending |
| ADMN-05 | 9 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57 ✓
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after roadmap creation*
