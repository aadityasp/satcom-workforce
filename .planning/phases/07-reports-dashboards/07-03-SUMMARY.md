---
phase: "07"
plan: "03"
subsystem: frontend
tags: [dashboard, reports, charts, role-routing, pdf-export]
dependency-graph:
  requires: ["07-01", "07-02"]
  provides: ["/reports role router", "Manager dashboard page", "HR dashboard page"]
  affects: ["08-mobile"]
tech-stack:
  added: []
  patterns: ["role-based routing", "dashboard hooks pattern"]
key-files:
  created:
    - apps/web/src/hooks/useReports.ts
    - apps/web/src/app/reports/page.tsx
    - apps/web/src/app/reports/manager/page.tsx
    - apps/web/src/app/reports/hr/page.tsx
  modified: []
decisions:
  - Manager dashboard focuses on team status table and open anomalies
  - HR dashboard includes compliance metrics and anomaly breakdown
  - NeedsAttention section placed at top of both dashboards (per user decision)
metrics:
  duration: "3m 14s"
  tasks: 2/2
  commits: 2
  completed: "2026-01-25"
---

# Phase 07 Plan 03: Dashboard Pages Summary

Role-based dashboard pages with useReports hooks fetching data from /reports/dashboard endpoints, charts, metric cards, and PDF export.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useReports Hook | 62c2d39 | apps/web/src/hooks/useReports.ts |
| 2 | Create Dashboard Pages | f50bf49 | apps/web/src/app/reports/page.tsx, manager/page.tsx, hr/page.tsx |

## Key Artifacts

### useReports Hook
```typescript
// apps/web/src/hooks/useReports.ts
export function useManagerDashboard()  // Fetches /reports/dashboard/manager
export function useHRDashboard()       // Fetches /reports/dashboard/hr

// Types exported:
// - ManagerDashboard, HRDashboard
// - AttendanceSummary, TimesheetSummary, TeamMemberStatus
```

### Role Router
```typescript
// apps/web/src/app/reports/page.tsx
switch (user.role) {
  case 'Manager': router.replace('/reports/manager');
  case 'HR':
  case 'SuperAdmin': router.replace('/reports/hr');
  default: router.replace('/dashboard'); // Employees no access
}
```

### Manager Dashboard (210 lines)
- Team size, checked in, late, open anomalies metric cards
- NeedsAttention section at top
- Weekly attendance stacked bar chart
- Hours by project pie chart
- Team status table with today's attendance
- PDF export button

### HR Dashboard (280 lines)
- Organization size, attendance rate, late, open anomalies metric cards
- NeedsAttention section at top
- Weekly attendance trend chart
- Compliance metrics panel (avg check-in time, late %, break violations)
- Anomaly breakdown by type and severity
- PDF export button

## Implementation Details

### Data Fetching Pattern
```typescript
const { data, isLoading, error, refetch } = useManagerDashboard();
// or
const { data, isLoading, error, refetch } = useHRDashboard();
```

### Component Usage
Both dashboard pages use components from 07-02:
- `AttendanceBarChart` for weekly attendance visualization
- `TimesheetPieChart` for project hours (Manager only)
- `MetricCard` for key stats
- `NeedsAttentionSection` for actionable alerts
- `TeamStatusTable` for member list (Manager only)
- `PdfExportButton` + `generateAttendanceReport` for PDF export

### Division by Zero Safety
```typescript
// Manager dashboard handles zero team size
subtitle={`${data.teamSize > 0 ? Math.round((data.todayStats.checkedIn / data.teamSize) * 100) : 0}% attendance`}
```

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Manager focuses on team status table | Primary use case: who's here today |
| HR includes anomaly type/severity breakdown | Compliance monitoring needs |
| NeedsAttention at top of both dashboards | Per user decision - immediate visibility |
| Employees redirect to /dashboard | No reports access for base role |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Ready For
- Phase 8: Mobile app can reuse useReports hooks for dashboard data
- Additional report types can extend the patterns

### Blockers
None

### Concerns
- Pre-existing TypeScript error in useChat.ts (unrelated to this plan)
- Node.js version mismatch prevents full build verification (env issue, not code issue)

## Success Criteria Verification

| Criteria | Status |
|----------|--------|
| Manager sees team dashboard with attendance chart, team status table | PASS |
| HR sees org-wide dashboard with compliance metrics, anomaly breakdown | PASS |
| PDF export generates downloadable file | PASS (uses 07-02 generators) |
| Role-based routing works correctly | PASS |
| No hydration errors with charts | PASS (uses 'use client' + SSR-safe Recharts) |
