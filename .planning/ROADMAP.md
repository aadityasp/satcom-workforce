# Roadmap: Satcom Workforce

**Created:** 2026-01-24
**Depth:** Standard (5-8 phases)
**Requirements:** 57 total

## Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|--------------|
| 1 | Foundation & Auth | All roles can log in with correct permissions | 6 |
| 2 | Attendance Core | Users can check in/out with breaks and overtime tracking | 7 |
| 3 | Timesheets & Projects | Users can log hours against projects/tasks with attachments | 9 |
| 4 | Location & Geofence | Admin can configure geofences and view locations on map | 8 |
| 5 | Presence & Activity | Real-time team visibility with activity tracking | 12 |
| 6 | Chat | Team can communicate via 1:1 and group messages | 6 |
| 7 | Reports & Dashboards | Managers and HR can view metrics and export reports | 6 |
| 8 | Mobile App | Full mobile experience for iOS and Android | 7 |
| 9 | Admin & Documentation | System configuration and comprehensive documentation | 10 |

**Total: 9 phases | 57 requirements mapped**

---

## Phase 1: Foundation & Auth

**Goal:** All 4 roles can log in with correct permissions, sessions persist, password reset works.

**Requirements:**
- AUTH-01: User can log in with email and password
- AUTH-02: User session persists across browser/app refresh
- AUTH-03: User can log out from any device
- AUTH-04: User can reset password via email link
- AUTH-05: All 4 roles have correct permissions
- AUTH-06: Protected routes redirect unauthenticated users

**Success Criteria:**
1. Employee can log in and sees employee dashboard
2. Manager can log in and sees manager features
3. HR can log in and access HR-specific routes
4. Super Admin can access all admin routes
5. Session survives browser refresh
6. Password reset email sends and link works

**Dependencies:** None (foundation phase)

**Plans:** 3 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 01-01-PLAN.md — Enhance NestJS auth with dual-token JWT and DB-backed refresh tokens
- [x] 01-02-PLAN.md — Next.js middleware for route protection and role-based access
- [x] 01-03-PLAN.md — Password reset flow with email sending

---

## Phase 2: Attendance Core

**Goal:** Users can check in/out with work mode, take breaks, and system tracks overtime.

**Requirements:**
- ATTN-01: Check in with work mode selection
- ATTN-02: Check out with duration calculation
- ATTN-03: Start/end breaks with tracking
- ATTN-04: System enforces break policy
- ATTN-05: System calculates overtime
- ATTN-06: User sees attendance timeline
- ATTN-07: GPS captured at check-in (mobile)

**Success Criteria:**
1. User can check in selecting Office/Remote/etc
2. User can check out and sees total hours worked
3. User can take break and see break duration
4. Break exceeding policy limit shows warning
5. Overtime calculated when exceeding threshold
6. Timeline shows all today's events

**Dependencies:** Phase 1 (Auth)

**Plans:** 5 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 02-01-PLAN.md — Enhance attendance API with full context response
- [x] 02-02-PLAN.md — Wire break policy enforcement to anomaly creation
- [x] 02-03-PLAN.md — Build attendance UI components (status card, modals)
- [x] 02-04-PLAN.md — Build timeline components and attendance page
- [x] 02-05-PLAN.md — Integrate attendance components into dashboard

---

## Phase 3: Timesheets & Projects

**Goal:** Users can log hours against projects/tasks with notes and attachments.

**Requirements:**
- TIME-01: Create entry with project/task selection
- TIME-02: Enter hours/minutes
- TIME-03: Add notes to entries
- TIME-04: Attach files/photos via MinIO
- TIME-05: Validate max 24h/day
- TIME-06: Validate task belongs to project
- TIME-07: Edit/delete own entries (same day)
- TIME-08: View timesheet history
- ADMN-04: Super Admin manages projects/tasks

**Success Criteria:**
1. User can create timesheet entry with project -> task
2. User can add hours, notes, and file attachment
3. System rejects entry exceeding 24h total
4. User can edit today's entries only
5. Admin can create/edit projects and tasks
6. History shows past entries with filters

**Dependencies:** Phase 1 (Auth)

**Plans:** 4 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 03-01-PLAN.md — Enhance timesheets API with attachments and validation
- [x] 03-02-PLAN.md — Admin project/task management API
- [x] 03-03-PLAN.md — Frontend timesheet components and hooks
- [x] 03-04-PLAN.md — Integrate timesheets page and admin projects page

---

## Phase 4: Location & Geofence

**Goal:** Admin can configure office geofences, system verifies check-in locations, map shows all locations.

**Requirements:**
- LOCN-01: Configure office locations
- LOCN-02: Manage multiple geofences
- LOCN-03: Verify check-in against geofence
- LOCN-04: Show verification status
- LOCN-05: Create anomaly on geofence failure
- LOCN-06: Super Admin views check-in locations
- LOCN-07: Map view of check-in locations
- LOCN-08: Map view of activity locations

**Success Criteria:**
1. Admin can add office with name, coordinates, radius
2. Check-in from within radius shows "Verified"
3. Check-in outside radius shows "Unverified" and creates anomaly
4. Remote/Field work modes skip verification
5. Super Admin sees map with all user locations
6. Map updates when new check-ins occur

**Dependencies:** Phase 2 (Attendance)

**Plans:** 4 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 04-01-PLAN.md — Office location CRUD API (SuperAdmin)
- [x] 04-02-PLAN.md — Geofence verification with anomaly creation
- [x] 04-03-PLAN.md — Admin location management UI
- [x] 04-04-PLAN.md — Super Admin map view with check-in locations

---

## Phase 5: Presence & Activity

**Goal:** Real-time team visibility with online/away status and current activity tracking.

**Requirements:**
- PRES-01: Track Online/Away/Offline status
- PRES-02: Team availability list
- PRES-03: Last seen timestamp
- PRES-04: Current work mode display
- PRES-05: Real-time WebSocket updates
- PRES-06: Filter team by status/department
- ACTV-01: Set current task/project
- ACTV-02: Post status updates
- ACTV-03: Activity displays with presence
- ACTV-04: Task time breakdown view
- ACTV-05: Manager views team activities
- ACTV-06: GPS captured on activity update

**Success Criteria:**
1. User shows Online within 2 min of activity
2. User shows Away after 15 min inactivity
3. Team list shows all members with status
4. User can set "Working on [task]" status
5. Activity location captured on mobile
6. Manager sees team's current activities

**Dependencies:** Phase 1 (Auth), Phase 3 (Timesheets for tasks)

**Plans:** 4 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 05-01-PLAN.md — Extend schema and API for activity tracking with GPS
- [x] 05-02-PLAN.md — Enhance WebSocket gateway with activity events and stale cleanup
- [x] 05-03-PLAN.md — Frontend presence store, hook, and team page
- [x] 05-04-PLAN.md — Activity management UI and manager team view

---

## Phase 6: Chat

**Goal:** Team members can message each other directly and in groups.

**Requirements:**
- CHAT-01: 1:1 direct messages
- CHAT-02: Create/join group chats
- CHAT-03: Real-time delivery via WebSocket
- CHAT-04: Message history with pagination
- CHAT-05: Read receipts / delivery status
- CHAT-06: All roles have chat access

**Success Criteria:**
1. User can start DM with any team member
2. User can create group chat
3. Messages appear instantly (< 500ms)
4. User can scroll back through history
5. Sent/delivered/read indicators work
6. Chat accessible to Employee, Manager, HR, Admin

**Dependencies:** Phase 1 (Auth)

**Plans:** 4 plans

**Status:** Complete (2026-01-24)

Plans:
- [x] 06-01-PLAN.md — Schema extension with MessageStatus, enhanced API with edit/delete/search
- [x] 06-02-PLAN.md — Enhanced ChatGateway with send/deliver/read events
- [x] 06-03-PLAN.md — Zustand chat store and useChat hook
- [x] 06-04-PLAN.md — Chat UI components and page

---

## Phase 7: Reports & Dashboards

**Goal:** Managers see team metrics, HR sees org metrics, reports export to PDF.

**Requirements:**
- REPT-01: Manager team attendance dashboard
- REPT-02: Manager team timesheet summary
- REPT-03: HR org-wide attendance compliance
- REPT-04: HR anomaly overview
- REPT-05: Export to PDF
- REPT-06: Role-based dashboard metrics

**Success Criteria:**
1. Manager sees team check-in times and late arrivals
2. Manager sees team hours per project
3. HR sees company-wide attendance stats
4. HR sees open anomalies count
5. PDF export generates formatted report
6. Dashboard shows relevant widgets per role

**Dependencies:** Phase 2, 3, 4, 5 (all data sources)

**Plans:** 4 plans

**Status:** Complete (2026-01-25)

Plans:
- [x] 07-01-PLAN.md — Reports API service with Manager and HR dashboard endpoints
- [x] 07-02-PLAN.md — Install Recharts/jsPDF, create chart components and PDF utilities
- [x] 07-03-PLAN.md — Manager and HR dashboard pages with role routing
- [x] 07-04-PLAN.md — Dashboard navigation integration and verification

---

## Phase 8: Mobile App

**Goal:** Full mobile experience for iOS and Android with all core features.

**Requirements:**
- MOBL-01: Login with session persistence
- MOBL-02: Check in/out with location
- MOBL-03: Timesheet entry
- MOBL-04: Team presence/availability
- MOBL-05: Chat (1:1 and groups)
- MOBL-06: Location permission handling
- MOBL-07: Offline viewing with drafts

**Success Criteria:**
1. User can log in and stay logged in on mobile
2. Check-in captures GPS location
3. User can create timesheet entries
4. Team list shows presence status
5. Chat works on mobile
6. App explains why location needed before requesting
7. App works when offline (read-only, drafts queued)

**Dependencies:** Phases 1-6 (API must be ready)

**Plans:** 6 plans

Plans:
- [ ] 08-01-PLAN.md — Foundation: dependencies, React Query persistence, API client, location utilities
- [ ] 08-02-PLAN.md — Attendance: useAttendance hook, location permission flow, check-in UI
- [ ] 08-03-PLAN.md — Timesheets: useTimesheets hook, entry form, history list
- [ ] 08-04-PLAN.md — Team Presence: presence store with mobile reconnect, team list UI
- [ ] 08-05-PLAN.md — Chat: chat store with mobile reconnect, conversation list, message threads
- [ ] 08-06-PLAN.md — Offline support, network banner, profile screen, integration verification

---

## Phase 9: Admin & Documentation

**Goal:** Admin can configure system, comprehensive documentation complete.

**Requirements:**
- ADMN-01: Manage users (create, edit, deactivate)
- ADMN-02: Assign roles
- ADMN-03: Configure work policies
- ADMN-05: View audit logs
- DOCS-01: Swagger/OpenAPI documentation
- DOCS-02: Inline code comments
- DOCS-03: User guides per role
- DOCS-04: Deployment guide
- DOCS-05: README with quick start

**Success Criteria:**
1. Admin can create new user and assign role
2. Admin can set break/overtime policies
3. Admin can view audit trail of actions
4. Swagger UI shows all endpoints
5. User guide exists for each role
6. New developer can set up project using README

**Dependencies:** All prior phases (documents existing features)

**Estimated Plans:** 4-5

---

## Parallel Execution Notes

Phases that can run in parallel (if resources allow):
- Phase 2 & 3 (both depend only on Phase 1)
- Phase 4, 5, 6 (can run after their dependencies)
- Phase 8 can start after Phase 1-6 APIs are stable

Sequential dependencies:
- Phase 1 must complete first (foundation)
- Phase 4 depends on Phase 2
- Phase 7 depends on Phases 2-5 (needs data)
- Phase 9 should be last (documents everything)

---

## Coverage Validation

| Category | Requirements | Phase | Mapped |
|----------|--------------|-------|--------|
| AUTH | 6 | 1 | ✓ |
| ATTN | 7 | 2 | ✓ |
| TIME | 8 | 3 | ✓ |
| LOCN | 8 | 4 | ✓ |
| PRES | 6 | 5 | ✓ |
| ACTV | 6 | 5 | ✓ |
| CHAT | 6 | 6 | ✓ |
| REPT | 6 | 7 | ✓ |
| MOBL | 7 | 8 | ✓ |
| DOCS | 5 | 9 | ✓ |
| ADMN | 5 | 3, 9 | ✓ |

**Total: 57/57 requirements mapped (100%)**

---
*Created: 2026-01-24*
*Last updated: 2026-01-25*
