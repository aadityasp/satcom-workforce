---
phase: 07-reports-dashboards
plan: 01
subsystem: reports
tags: [reports, dashboard, aggregation, manager, hr]
requires:
  - phase-01: "Authentication/JWT"
  - phase-02: "Attendance models"
  - phase-03: "Timesheet models"
  - phase-05: "Anomaly events"
provides:
  - "ReportsService with dashboard aggregation"
  - "ReportsController with role-based endpoints"
  - "GET /reports/dashboard endpoint"
affects:
  - phase-07-02: "Will build on reports service for export functionality"
  - phase-07-03: "Dashboard UI will consume these endpoints"
tech-stack:
  added: []
  patterns:
    - "Role-based response (Manager vs HR)"
    - "Parallel queries with Promise.all"
    - "date-fns for date calculations"
key-files:
  created:
    - "apps/api/src/reports/dto/dashboard-response.dto.ts"
    - "apps/api/src/reports/reports.service.ts"
    - "apps/api/src/reports/reports.controller.ts"
    - "apps/api/src/reports/reports.module.ts"
  modified:
    - "apps/api/src/app.module.ts"
decisions:
  - id: "dashboard-roles"
    decision: "Manager sees direct reports only; HR/SuperAdmin see org-wide"
    rationale: "Consistent with existing role-based access patterns"
  - id: "late-threshold"
    decision: "9:15 AM as late threshold"
    rationale: "Standard grace period, configurable via work policy later"
  - id: "weekly-range"
    decision: "Last 7 days for weekly metrics"
    rationale: "Simple rolling window, no week boundaries"
metrics:
  duration: "~3 minutes"
  completed: "2026-01-25"
---

# Phase 07 Plan 01: Reports API Service Summary

**One-liner:** Dashboard aggregation API with role-based responses - Manager gets team stats, HR gets org-wide metrics.

## What Was Built

### Dashboard Response DTOs
- `AttendanceSummaryDto` - Daily attendance breakdown (checkedIn, late, absent, onLeave)
- `TimesheetSummaryDto` - Project-level time aggregation
- `TeamMemberStatusDto` - Individual team member status
- `ManagerDashboardDto` - Team-scoped dashboard data
- `HRDashboardDto` - Org-wide dashboard with compliance metrics

### ReportsService
- `getManagerDashboard(managerId, companyId)` - Team-scoped data
  - Filters by `managerId` to get only direct reports
  - Today's stats, weekly attendance trends, timesheet summaries
  - Team member status list with check-in/out times
  - Open anomalies count
- `getHRDashboard(companyId)` - Org-wide data
  - All active users in company
  - Attendance rate calculation
  - Anomaly summary (open, acknowledged, by type, by severity)
  - Compliance metrics (avg check-in time, late %, break violations)

### ReportsController
- `GET /reports/dashboard` - Auto-detects role, returns appropriate data
- `GET /reports/dashboard/manager` - Explicit Manager endpoint
- `GET /reports/dashboard/hr` - Explicit HR/SuperAdmin endpoint
- Protected with JwtAuthGuard and RolesGuard

### ReportsModule
- Imports PrismaModule
- Exports ReportsService for potential use by other modules

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Role detection | Check req.user.role | Single endpoint serves both roles |
| Manager filtering | Filter by managerId | Security: Manager only sees direct reports |
| Weekly range | Last 7 days rolling | Simple, no week boundary complexities |
| Late threshold | 9:15 AM | Standard grace period |
| Parallel queries | Promise.all | Performance optimization |

## Security Considerations

- Manager dashboard MUST filter by managerId (enforced in service)
- HR dashboard filters by companyId (no cross-company data)
- Controller uses RolesGuard to restrict access
- Sensitive data (individual check-in times) only visible to authorized roles

## API Endpoints

| Method | Path | Roles | Response |
|--------|------|-------|----------|
| GET | /reports/dashboard | Manager, HR, SuperAdmin | Role-specific dashboard |
| GET | /reports/dashboard/manager | Manager | ManagerDashboardDto |
| GET | /reports/dashboard/hr | HR, SuperAdmin | HRDashboardDto |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 07-02 (Export Reports):**
- ReportsService available for data aggregation
- DTOs define export data shapes

**For 07-03 (Dashboard UI):**
- API endpoints ready for consumption
- Response structure matches frontend needs
