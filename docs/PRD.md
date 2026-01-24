# Product Requirements Document (PRD)

## Satcom Workforce Visibility System - MVP

### Version 1.0 | January 2026

---

## Executive Summary

Satcom Technologies requires a modern workforce visibility system to manage attendance, timesheets, leaves, and team communication for their India-based workforce (currently 30 employees, scaling to 100). This MVP focuses on core functionality with emphasis on a modern, snappy user experience.

---

## Product Vision

Build a privacy-respecting workforce management platform that provides:
- Real-time visibility into team availability and work status
- Accurate attendance tracking with flexible work modes
- Transparent timesheet management per project/task
- Streamlined leave request and approval workflows
- Seamless team communication with voice notes
- Proactive anomaly detection for HR oversight

---

## Target Users

| Role | Count | Primary Needs |
|------|-------|---------------|
| Employee | 80% | Quick check-in/out, timesheet entry, leave requests, team chat |
| Manager | 10% | Team visibility, project management, group communication |
| HR | 5% | Leave approvals, attendance oversight, anomaly review |
| Super Admin | 5% | System configuration, policy management, audit access |

---

## Core Features

### 1. Attendance Management

**1.1 Check-In/Check-Out**
- Single tap check-in with work mode selection
- Work modes: Office, Remote, CustomerSite, FieldVisit, Travel
- Check-out with automatic work duration calculation
- Timeline view of today's activities

**1.2 Break Management**
- Start/end break segments (Break, Lunch)
- Multiple breaks per day supported
- Duration tracking with policy enforcement
- Overlap prevention validation

**1.3 Overtime Tracking**
- Automatic calculation based on work policy
- Configurable overtime threshold
- Daily/weekly overtime summaries
- Overtime alerts for employees

**1.4 Opt-In Geofence (Office Check-In)**
- Configurable office locations with radius
- GPS capture on mobile check-in (requires permission)
- Verification status tracking
- Non-blocking for field/remote work
- Feature can be enabled/disabled by policy

### 2. Timesheet Management

**2.1 Daily Entry**
- Select Project → Task hierarchy
- Enter hours/minutes worked
- Add notes (required based on policy)
- Attach files/photos as proof

**2.2 Validation**
- Maximum 24 hours per day
- Task must belong to selected project
- Duplicate entry prevention
- Configurable minimum entry threshold

**2.3 Attachments**
- Photo capture from mobile
- File upload (PDF, images, documents)
- Signed URL storage via MinIO
- Size and type restrictions

### 3. Leave Management

**3.1 Leave Types**
- Sick Leave
- Casual Leave
- Earned/Privilege Leave
- Work From Home (WFH)
- Compensatory Off (CompOff)
- Loss of Pay (LOP)
- Floating/Optional Holiday
- Bereavement Leave
- Maternity Leave
- Paternity Leave
- Custom types (admin-defined)

**3.2 Request Workflow**
- Date range selection
- Leave type selection
- Reason input (required)
- Overlap detection with existing leaves
- Balance check before submission

**3.3 Approval Process**
- Single-step approval by HR or Super Admin
- Approve/Reject with optional reason
- Automatic balance update
- Email notification option

**3.4 Holiday Calendar**
- India national holidays (pre-configured)
- Optional holidays (employee choice)
- Admin-managed calendar per year
- Holiday impact on leave calculations

### 4. Availability & Presence

**4.1 Real-Time Status**
- Online: Active within 2 minutes
- Away: Active within 15 minutes
- Offline: Beyond 15 minutes
- Status visible to all employees

**4.2 Context Display**
- Current work mode
- Current project/task (if set)
- Last seen timestamp
- Today's check-in status

**4.3 Availability List**
- All employees visible
- Filter by status, department, team
- Search by name
- Real-time updates via WebSocket

### 5. Chat & Voice Notes

**5.1 Direct Messages**
- 1:1 threads between any employees
- Text messages with timestamps
- Read receipts
- Message history with pagination

**5.2 Group Chats**
- Project-based groups (auto-created)
- Ad-hoc groups (user-created)
- Member management
- Group name and settings

**5.3 Voice Notes**
- Record audio from mobile/web
- Upload to MinIO storage
- Playback with duration display
- Maximum 5-minute duration

**5.4 Email Integration**
- Optional email trigger per message
- Daily chat summary via email
- SMTP configuration by admin
- Recipient selection for summaries

**5.5 Retention**
- Configurable retention period
- Automated cleanup job
- Archival before deletion (optional)

### 6. Anomaly Detection

**6.1 Detected Anomalies**
| Type | Description | Severity |
|------|-------------|----------|
| Repeated Late Check-In | X late arrivals in Y days | Medium |
| Missing Check-Out | No checkout for completed day | High |
| Excessive Break | Break duration exceeds policy | Medium |
| Overtime Spike | Unusual overtime vs baseline | Low |
| Timesheet Mismatch | Attendance hours ≠ timesheet hours | Medium |
| Geofence Failure | Office check-in outside radius | High |

**6.2 Detection Engine**
- Near real-time evaluation on new events
- Daily batch re-evaluation
- Deduplication to prevent alert fatigue
- Configurable thresholds per rule

**6.3 Resolution Workflow**
- Status: Open → Acknowledged → Resolved/Dismissed
- Assignee (HR/Super Admin)
- Resolution notes required
- Full audit trail

**6.4 Notifications**
- In-app alerts for HR/Super Admin
- Optional email notifications
- Dashboard widget with counts

### 7. Audit Logging

**7.1 Logged Events**
- All authentication events
- User management changes
- Attendance overrides
- Leave approvals/rejections
- Policy changes
- Anomaly resolutions

**7.2 Log Details**
- Actor (who performed action)
- Action type
- Entity affected
- Before/after state
- Timestamp
- IP address (when available)

**7.3 Log Viewer**
- Filter by actor, action, entity, date
- Pagination for large datasets
- Export capability (future)

---

## Non-Functional Requirements

### Performance
- API response time: < 200ms for 95th percentile
- Page load time: < 2 seconds
- Real-time updates: < 500ms latency
- Support 100 concurrent users

### Security
- JWT authentication with refresh tokens
- Device verification via OTP
- Role-based access control
- Password hashing (bcrypt)
- Rate limiting on auth endpoints
- Signed URLs for file access

### Reliability
- Offline support for mobile (draft mode)
- Automatic retry for failed requests
- Data backup strategy
- 99% uptime target

### Usability
- Mobile-first design
- Responsive web layout
- Accessibility compliance (WCAG 2.1 AA)
- Skeleton loading states
- Optimistic updates where safe

---

## Technical Architecture

### Stack
- **Backend**: NestJS + Prisma + PostgreSQL
- **Real-time**: Socket.IO
- **Storage**: MinIO (S3-compatible)
- **Web**: Next.js + Tailwind + shadcn/ui
- **Mobile**: Expo React Native
- **Shared**: TypeScript monorepo with pnpm

### Deployment (MVP)
- Docker Compose for local development
- Single-tenant deployment
- Cloud-ready architecture

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily active users | 80% of workforce |
| Attendance compliance | 95% check-in/out |
| Timesheet completion | 90% weekly |
| Leave request turnaround | < 24 hours |
| User satisfaction score | > 4.0/5.0 |

---

## Out of Scope (MVP)

- Multi-tenant SaaS
- Payroll integration
- Performance reviews
- Training management
- Expense management
- Advanced reporting/BI
- Native mobile apps (using Expo)
- SSO/SAML authentication

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Design | 1 week | All documentation |
| Backend | 2 weeks | API, DB, core features |
| Frontend | 2 weeks | Web + Mobile apps |
| Testing | 1 week | E2E tests, bug fixes |
| Launch | - | MVP deployment |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial MVP requirements |
