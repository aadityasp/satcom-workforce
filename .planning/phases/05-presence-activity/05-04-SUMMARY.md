---
phase: 05-presence-activity
plan: 04
subsystem: frontend
tags: [presence, activity, ui, dashboard, react]
dependency-graph:
  requires: ["05-01", "05-03"]
  provides: ["activity-ui", "status-modal", "task-breakdown", "team-activity-view"]
  affects: ["06-chat"]
tech-stack:
  added: []
  patterns: ["modal-pattern", "date-navigation", "progress-bar"]
file-tracking:
  key-files:
    created:
      - apps/web/src/components/presence/SetActivityModal.tsx
      - apps/web/src/components/presence/ActivityStatusBar.tsx
      - apps/web/src/components/presence/TaskBreakdownCard.tsx
      - apps/web/src/app/admin/team-activity/page.tsx
    modified:
      - apps/web/src/components/presence/index.ts
      - apps/web/src/app/dashboard/page.tsx
decisions: []
metrics:
  duration: ~15min
  completed: 2026-01-24
---

# Phase 5 Plan 4: Activity Management UI Summary

**One-liner:** Activity modal for project/task selection, status bar, task breakdown card, and manager team activity view integrated into dashboard.

## What Was Built

### SetActivityModal (apps/web/src/components/presence/SetActivityModal.tsx)
- Tabbed modal with "Current Activity" and "Status Message" tabs
- Project dropdown with tasks fetched from API
- Status message input with 200 char limit
- Clear status functionality
- Integrates with `usePresence` hook for WebSocket actions

### ActivityStatusBar (apps/web/src/components/presence/ActivityStatusBar.tsx)
- Displays current user's presence status
- Shows current project/task if set
- Displays status message with timestamp
- Edit button opens SetActivityModal
- Real-time sync indicator

### TaskBreakdownCard (apps/web/src/components/presence/TaskBreakdownCard.tsx)
- Shows time breakdown per project
- Progress bars with percentage
- Expandable detailed view with individual entries
- Supports "today" and "week" periods
- Fetches from `/presence/task-breakdown` API

### Team Activity Page (apps/web/src/app/admin/team-activity/page.tsx)
- Date navigation (prev/next/today)
- Team member cards with presence indicators
- Activity timeline for each member (max 5 visible)
- Duration calculation for active/completed activities
- Status message display

### Dashboard Integration
- ActivityStatusBar and TaskBreakdownCard in employee dashboard
- Team Activity button in admin controls
- Manager-specific team activity link

## Implementation Details

### Component Architecture
```
SetActivityModal
  - Fetches projects from /projects API
  - Uses setActivity/postStatus/clearStatus from usePresence hook
  - Two tabs: activity (project/task) and status (message)

ActivityStatusBar
  - Reads from presenceStore.teamMembers to find current user
  - Opens SetActivityModal on edit click
  - Shows connection status indicator

TaskBreakdownCard
  - Fetches from /presence/task-breakdown endpoint
  - Calculates percentages and formats durations
  - Expandable details view

TeamActivityPage
  - Fetches from /presence/team-activity endpoint
  - Date state with navigation
  - Maps team members with their activities
```

### API Endpoints Used
- `GET /projects` - List projects for selection
- `GET /presence/task-breakdown?startDate=&endDate=` - User's task breakdown
- `GET /presence/team-activity?date=` - Team activities for date
- WebSocket: `activity:set`, `status:post`, `status:clear`

## Verification Results

1. TypeScript compilation: PASS (no errors)
2. Component exports: All 5 components exported from index.ts
3. Dashboard integration: Activity section visible in employee dashboard
4. Admin controls: Team Activity button added for HR/SuperAdmin
5. Manager link: Team Activity link visible for Manager role

## Commits

| Commit | Description |
|--------|-------------|
| 99c15c8 | feat(05-04): create activity management components |
| b49e114 | feat(05-04): create manager team activity page |
| 594d20d | feat(05-04): integrate activity components into dashboard |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created (4):**
- apps/web/src/components/presence/SetActivityModal.tsx (212 lines)
- apps/web/src/components/presence/ActivityStatusBar.tsx (97 lines)
- apps/web/src/components/presence/TaskBreakdownCard.tsx (143 lines)
- apps/web/src/app/admin/team-activity/page.tsx (264 lines)

**Modified (2):**
- apps/web/src/components/presence/index.ts (+3 exports)
- apps/web/src/app/dashboard/page.tsx (+43 lines - imports, activity section, links)

## Next Phase Readiness

**Ready:** All activity management UI components complete.

**Dependencies satisfied:**
- 05-01: Presence schema and activity API ready
- 05-03: Frontend presence infrastructure (store, hook, base components)

**For Phase 6 (Chat):**
- Presence indicators can be reused in chat user lists
- Status messages could appear in chat profiles
