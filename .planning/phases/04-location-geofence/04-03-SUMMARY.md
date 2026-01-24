---
phase: 04-location-geofence
plan: 03
subsystem: admin-ui
tags: [react, admin, locations, geofence, crud]
dependency_graph:
  requires: [04-01]
  provides: [admin-location-management, useLocations-hook]
  affects: [04-04]
tech-stack:
  added: []
  patterns: [custom-hooks, modal-forms, data-tables]
key-files:
  created:
    - apps/web/src/hooks/useLocations.ts
    - apps/web/src/hooks/index.ts
    - apps/web/src/components/locations/LocationForm.tsx
    - apps/web/src/components/locations/LocationTable.tsx
    - apps/web/src/app/admin/locations/page.tsx
  modified: []
decisions:
  - decision: "Use native form handling instead of react-hook-form + zod"
    rationale: "Project doesn't have these dependencies; follow existing patterns from TimesheetEntryModal"
    alternatives: ["Install react-hook-form + zod as specified"]
  - decision: "Inline validation with touched state tracking"
    rationale: "Matches existing form patterns in the codebase"
metrics:
  duration: ~4min
  completed: 2026-01-24
---

# Phase 4 Plan 3: Admin Location UI Summary

Admin UI for Super Admin to manage office locations (geofence centers) with full CRUD operations.

## One-liner

Admin locations page at /admin/locations with LocationTable and LocationForm components using useLocations hook for API integration.

## Implementation Details

### Task 1: useLocations React Query Hooks

Created `apps/web/src/hooks/useLocations.ts` following the existing useTimesheets pattern:

**Types:**
- `OfficeLocation` - Full location entity with id, name, address, coordinates, radius, status, timestamps
- `CreateLocationInput` - Input for POST (name, address, latitude, longitude, radiusMeters)
- `UpdateLocationInput` - Partial input for PATCH, includes optional isActive

**Hook Functions:**
- `fetchLocations(includeInactive?)` - GET /locations with query param
- `createLocation(data)` - POST /locations
- `updateLocation(id, data)` - PATCH /locations/:id
- `deleteLocation(id)` - DELETE /locations/:id (soft delete/deactivate)

**State:**
- locations array, isLoading, isActionLoading, error, clearError

### Task 2: LocationForm Component

Created `apps/web/src/components/locations/LocationForm.tsx` with:

**Props:**
- `mode: 'create' | 'edit'` - Determines form title and submit behavior
- `initialData?: OfficeLocation` - Pre-fills form for edit mode
- `isLoading: boolean` - Disables submit during API call
- `onSubmit(data)` - Called with validated data
- `onCancel()` - Closes form

**Validation (inline, on blur and submit):**
- Name: 2-100 characters, required
- Address: 5-500 characters, required
- Latitude: -90 to 90, required
- Longitude: -180 to 180, required
- Radius: 50-5000 meters, required

**UI Features:**
- Modal overlay with framer-motion animations
- Coordinate inputs with "number" type and "any" step for decimals
- Radius input with "meters" unit label
- Helpful text explaining where to get coordinates
- Touched state tracking for inline validation errors

### Task 3: Admin Locations Page

Created `apps/web/src/app/admin/locations/page.tsx` and `LocationTable.tsx`:

**LocationTable Features:**
- Grid layout with 12 columns: Name, Address, Coordinates, Radius, Status, Actions
- Address truncation with full text on hover (title attribute)
- Coordinates formatted to 6 decimal places
- Active/Inactive status badges
- Dropdown menu with Edit and Deactivate actions
- Delete confirmation modal with warning about geofence impact

**Page Features:**
- SuperAdmin role check (redirects non-admins to /dashboard)
- Show/hide inactive locations toggle
- Location count display (active + inactive)
- Error banner with dismiss button
- Info card explaining geofence functionality
- Loading skeleton and empty state

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `apps/web/src/hooks/useLocations.ts` | 147 | API hooks for location CRUD |
| `apps/web/src/hooks/index.ts` | 33 | Updated barrel export |
| `apps/web/src/components/locations/LocationForm.tsx` | 335 | Create/edit form with validation |
| `apps/web/src/components/locations/LocationTable.tsx` | 263 | Data table with actions |
| `apps/web/src/app/admin/locations/page.tsx` | 204 | Admin page at /admin/locations |

## API Integration

The UI connects to the Location API created in 04-01:

| Operation | Method | Endpoint | UI Action |
|-----------|--------|----------|-----------|
| List locations | GET | /locations?includeInactive= | Page load, filter toggle |
| Create location | POST | /locations | Form submit (create mode) |
| Update location | PATCH | /locations/:id | Form submit (edit mode) |
| Deactivate location | DELETE | /locations/:id | Delete confirmation |

## Deviations from Plan

### Adapted Pattern

**Plan specified:** Use shadcn/ui components (Input, Textarea, Button, Label, Form) and react-hook-form with zod validation.

**Actual:** Used native form elements with manual validation, following existing codebase patterns from:
- `apps/web/src/components/timesheets/TimesheetEntryModal.tsx`
- `apps/web/src/app/admin/projects/page.tsx`

**Rationale:** The project doesn't have shadcn/ui or react-hook-form installed. Adding these dependencies would be an architectural decision requiring user approval (Rule 4). The existing patterns work well and maintain consistency.

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compiles | PASS |
| page.tsx > 50 lines | PASS (204) |
| LocationForm.tsx > 80 lines | PASS (335) |
| useLocations exports correct hooks | PASS |
| Hook calls /locations API | PASS |
| Page imports useLocations | PASS |

## Success Criteria Met

- [x] Admin locations page accessible at /admin/locations
- [x] Location table displays all office locations
- [x] Create form validates and submits
- [x] Edit form pre-fills and updates
- [x] Delete shows confirmation and deactivates
- [x] React Query-style hooks handle API calls (using native fetch pattern)

## Next Phase Readiness

Ready for 04-04 (Map Visualization):
- Location data is accessible via useLocations hook
- OfficeLocation type includes coordinates and radius for map rendering
- Active/inactive filtering available for displaying only valid geofences
