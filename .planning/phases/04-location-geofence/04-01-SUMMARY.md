# Phase 4 Plan 1: Office Location CRUD API Summary

---
phase: 04-location-geofence
plan: 01
subsystem: geofence-management
tags: [locations, crud, nestjs, superadmin, audit-log]

dependency-graph:
  requires:
    - 01-foundation (auth, prisma, guards)
    - 02-attendance-core (geofence.service already existed)
  provides:
    - LocationsModule with CRUD service
    - SuperAdmin endpoints for office location management
  affects:
    - 04-02 (geofence policy configuration)
    - 04-03 (location map visualization)

tech-stack:
  added: []
  patterns:
    - "tenant-isolation: companyId filtering on all queries"
    - "soft-delete: isActive=false instead of hard delete"
    - "audit-logging: before/after snapshots on mutations"

files:
  created:
    - apps/api/src/locations/dto/create-location.dto.ts
    - apps/api/src/locations/dto/update-location.dto.ts
    - apps/api/src/locations/locations.service.ts
    - apps/api/src/locations/locations.controller.ts
    - apps/api/src/locations/locations.module.ts
  modified:
    - apps/api/src/app.module.ts

decisions:
  - id: "dto-validation"
    choice: "Use @IsLatitude/@IsLongitude from class-validator"
    rationale: "Standard validators handle edge cases properly"
  - id: "soft-delete"
    choice: "Set isActive=false instead of deleting rows"
    rationale: "Preserve audit trail and prevent orphaned references"

metrics:
  duration: "2m 17s"
  completed: "2026-01-24"
---

## One-liner

REST API for SuperAdmin to manage office locations with validation, tenant isolation, and audit logging.

## What Was Built

### Office Location DTOs (Task 1)

**CreateLocationDto** validates incoming location data:
- `name`: 2-100 characters
- `address`: 5-500 characters
- `latitude`: -90 to 90 (via @IsLatitude)
- `longitude`: -180 to 180 (via @IsLongitude)
- `radiusMeters`: 50-5000 meters

**UpdateLocationDto** extends PartialType for optional updates plus `isActive` boolean for soft-delete.

### LocationsService (Task 2)

CRUD operations with tenant isolation and audit logging:

```typescript
findAll(companyId, includeInactive?)  // List with optional inactive
findOne(id, companyId)                // Get or throw NotFoundException
create(companyId, userId, dto)        // Create + audit log
update(id, companyId, userId, dto)    // Update + before/after audit
remove(id, companyId, userId)         // Soft delete + audit log
```

All methods enforce tenant isolation via `companyId` filter.

### LocationsController (Task 3)

REST endpoints protected by SuperAdmin role:

| Method | Path | Action |
|--------|------|--------|
| GET | /locations | List all office locations |
| GET | /locations/:id | Get single location |
| POST | /locations | Create new location |
| PATCH | /locations/:id | Update location |
| DELETE | /locations/:id | Soft-delete location |

Uses `@Roles(UserRole.SuperAdmin)` at class level for protection.

## Technical Decisions

1. **Tenant Isolation**: All queries filter by `companyId` extracted from JWT token via `@CurrentUser()` decorator.

2. **Soft Delete**: DELETE endpoint sets `isActive = false` rather than removing the row. This preserves audit history and prevents issues with historical geofence checks.

3. **Audit Logging**: Each mutation creates an `AuditLog` entry with:
   - `before`: Previous state (for updates/deletes)
   - `after`: New state
   - `actorId`: User who performed the action

## Commits

| Hash | Description |
|------|-------------|
| 058e919 | feat(04-01): create DTOs for office location management |
| 3692794 | feat(04-01): create LocationsService with CRUD operations |
| 3ead9e2 | feat(04-01): create LocationsController and Module |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed attendance service endBreak call**
- **Found during:** Build verification
- **Issue:** `endBreak(userId, breakId)` called with 2 args, signature requires 3 (userId, companyId, breakId)
- **Fix:** Added `companyId` parameter to the call at line 164
- **Files modified:** apps/api/src/attendance/attendance.service.ts
- **Note:** This was a pre-existing bug in the codebase, not introduced by this plan

**2. [Rule 3 - Blocking] Fixed timesheets service taskId validation**
- **Found during:** Build verification
- **Issue:** `taskId` optional in DTO but required in Prisma schema, causing type error
- **Fix:** Added explicit taskId requirement check before create
- **Files modified:** apps/api/src/timesheets/timesheets.service.ts
- **Note:** This was a pre-existing bug in the codebase, not introduced by this plan

## Verification Results

| Check | Status |
|-------|--------|
| API builds | PASS |
| GET /locations returns array | Ready (endpoints registered) |
| POST /locations creates location | Ready (service implemented) |
| PATCH /locations/:id updates | Ready (service implemented) |
| DELETE /locations/:id soft-deletes | Ready (sets isActive=false) |
| SuperAdmin role protection | PASS (@Roles decorator applied) |
| Audit logging | PASS (3 audit log creates) |

## Next Phase Readiness

**Ready for 04-02**: Geofence policy configuration API. The OfficeLocation CRUD is complete, now need GeofencePolicy endpoints.

**Dependencies satisfied**:
- LocationsModule exported and available for import
- OfficeLocation entity can be queried by geofence validation logic
