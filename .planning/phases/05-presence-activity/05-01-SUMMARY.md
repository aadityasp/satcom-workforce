---
phase: 05-presence-activity
plan: 01
subsystem: api
tags: [prisma, nestjs, presence, activity-tracking, gps, status]

# Dependency graph
requires:
  - phase: 03-timesheets-projects
    provides: Project and Task models for activity tracking
  - phase: 01-foundation
    provides: PresenceSession model, auth guards, user context
provides:
  - Extended PresenceSession with statusMessage, GPS fields
  - ActivityLog model for time tracking per project/task
  - Activity tracking API endpoints (set activity, status, team view)
  - Presence filtering by status and department
affects: [05-02, 06-chat, 07-reports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ActivityLog time tracking pattern with start/end timestamps
    - GPS coordinate storage in Decimal(10,8) and Decimal(11,8)
    - Role-based team view filtering (Manager sees direct reports only)

key-files:
  created:
    - apps/api/src/presence/dto/update-presence.dto.ts
    - apps/api/src/presence/dto/set-activity.dto.ts
    - apps/api/src/presence/dto/post-status.dto.ts
    - apps/api/src/presence/dto/index.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/presence/presence.service.ts
    - apps/api/src/presence/presence.controller.ts

key-decisions:
  - "Use Decimal for GPS coordinates for precision (10,8 for lat, 11,8 for lon)"
  - "ActivityLog tracks time per project/task with explicit start/end times"
  - "Manager role sees only direct reports; HR/SuperAdmin see all users"
  - "Status message limited to 200 characters"

patterns-established:
  - "Activity change detection: close previous log before starting new one"
  - "Team activity filtering based on user role hierarchy"

# Metrics
duration: 10min
completed: 2026-01-24
---

# Phase 5 Plan 01: Presence Schema & Activity API Summary

**Extended PresenceSession with GPS, status messages, and ActivityLog model for project/task time tracking with manager team views**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-24T21:42:58Z
- **Completed:** 2026-01-24T21:52:56Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Extended PresenceSession model with statusMessage, statusUpdatedAt, lastLatitude, lastLongitude fields
- Created ActivityLog model for tracking time spent per project/task
- Built 7 REST endpoints for presence operations (list, heartbeat, activity, status, team-activity, task-breakdown)
- Implemented role-based filtering for manager team views

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema for activity tracking** - `add176e` (feat)
2. **Task 2: Create DTOs for presence operations** - `3463bce` (feat)
3. **Task 3: Enhance PresenceService with GPS, filters, and activity logging** - `db4be60` (feat)
4. **Task 4: Add new controller endpoints** - `7bc56a5` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Extended PresenceSession with GPS/status, added ActivityLog model
- `apps/api/src/presence/dto/update-presence.dto.ts` - DTO with projectId, taskId, latitude, longitude
- `apps/api/src/presence/dto/set-activity.dto.ts` - DTO for setting current activity
- `apps/api/src/presence/dto/post-status.dto.ts` - DTO for status message updates
- `apps/api/src/presence/dto/index.ts` - Barrel export for DTOs
- `apps/api/src/presence/presence.service.ts` - 7 methods for presence/activity operations
- `apps/api/src/presence/presence.controller.ts` - 7 REST endpoints with Swagger docs

## Decisions Made
- Used Decimal(10,8) for latitude and Decimal(11,8) for longitude for GPS precision
- ActivityLog uses explicit startedAt/endedAt timestamps for accurate time tracking
- Manager role filter uses managerId relation to show only direct reports
- HR and SuperAdmin roles see all company users in team activity view
- Status messages capped at 200 characters to prevent abuse

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Environment issue with bcrypt architecture mismatch (arm64 vs x86_64) prevented live Swagger verification
- Build succeeds and compiled controller verified to contain all endpoints
- Runtime verification can be done once environment is fixed (npm rebuild bcrypt)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Presence schema extended with all required fields
- ActivityLog model ready for time tracking
- API endpoints ready for frontend integration
- Ready for 05-02: Presence Frontend Components

---
*Phase: 05-presence-activity*
*Completed: 2026-01-24*
