# Architecture Research

**Researched:** 2026-01-24
**Focus:** Integrating location, activity tracking, and reporting into existing architecture

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Existing Modules                      │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│   Auth   │Attendance│Timesheets│  Leaves  │Chat/Presence│
└──────────┴──────────┴──────────┴──────────┴────────────┘
                           │
                    ┌──────┴──────┐
                    │   Prisma    │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

## New Components

### 1. Location Module

**Purpose:** Handle geofence configuration and location verification

```
apps/api/src/location/
├── location.module.ts
├── location.controller.ts      # Admin: CRUD geofences
├── location.service.ts         # Verification logic
├── dto/
│   ├── create-geofence.dto.ts
│   └── verify-location.dto.ts
└── location.utils.ts           # geolib wrappers
```

**Data Flow:**
```
Mobile Check-In Request
    │
    ├── includes: { latitude, longitude, accuracy }
    │
    ▼
AttendanceService.checkIn()
    │
    ├── calls: LocationService.verifyLocation()
    │           └── uses geolib.isPointWithinRadius()
    │
    ├── saves: CheckInLocation record
    │
    └── if verification fails:
        └── AnomalyService.createAnomaly('GEOFENCE_FAILURE')
```

**RBAC:**
- Geofence CRUD: Super Admin only
- View location data: Super Admin only
- Employees never see others' location data

### 2. Activity Module

**Purpose:** Track current task/status and time breakdown

```
apps/api/src/activity/
├── activity.module.ts
├── activity.controller.ts      # Set/get current activity
├── activity.service.ts         # Activity logic
├── dto/
│   ├── set-activity.dto.ts
│   └── activity-summary.dto.ts
└── activity.gateway.ts         # Real-time activity broadcasts
```

**Data Flow:**
```
User Sets Activity
    │
    ├── POST /activity/current
    │   └── { taskId?, projectId?, status, note? }
    │
    ▼
ActivityService.setCurrentActivity()
    │
    ├── closes previous activity (sets endedAt)
    ├── creates new ActivityStatus record
    │
    └── broadcasts via ActivityGateway
        └── 'activity:update' to subscribers
```

**Integration with Presence:**
```
PresenceGateway
    │
    └── enriches presence data with:
        └── ActivityService.getCurrentActivity(userId)
```

### 3. Reports Module

**Purpose:** Generate and export productivity reports

```
apps/api/src/reports/
├── reports.module.ts
├── reports.controller.ts       # Report endpoints
├── reports.service.ts          # Report orchestration
├── generators/
│   ├── attendance-report.ts
│   ├── timesheet-report.ts
│   ├── anomaly-report.ts
│   └── team-summary-report.ts
├── exporters/
│   ├── pdf.exporter.ts         # Puppeteer + Handlebars
│   └── excel.exporter.ts       # ExcelJS
└── templates/
    ├── attendance.hbs
    ├── timesheet.hbs
    └── team-summary.hbs
```

**Data Flow:**
```
Report Request
    │
    ├── GET /reports/attendance?from=&to=&teamId=
    │
    ▼
ReportsService.generateAttendanceReport()
    │
    ├── queries: AttendanceService, UserService
    ├── aggregates: totals, averages, anomaly counts
    │
    └── returns: ReportData object
        │
        ├── if format=json → return data
        ├── if format=pdf  → PdfExporter.export(data, template)
        └── if format=xlsx → ExcelExporter.export(data)
```

## Updated Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         Clients                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                   │
│   │   Web   │    │ Mobile  │    │  Admin  │                   │
│   └────┬────┘    └────┬────┘    └────┬────┘                   │
└────────┼──────────────┼──────────────┼────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌───────────────────────────────────────────────────────────────┐
│                      NestJS API                                │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐     │
│  │  Auth  │Attend. │Timesht.│ Leaves │Activity│Reports │     │
│  │        │        │        │        │  NEW   │  NEW   │     │
│  └────────┴───┬────┴────────┴────────┴───┬────┴───┬────┘     │
│               │                          │        │           │
│  ┌────────────┴──────────┐  ┌───────────┴────────┴───┐       │
│  │   Location Module     │  │   Chat/Presence        │       │
│  │   (Geofence verify)   │  │   (enriched w/activity)│       │
│  │        NEW            │  │                        │       │
│  └────────────┬──────────┘  └────────────────────────┘       │
│               │                                               │
│  ┌────────────┴──────────────────────────────────────┐       │
│  │                    Prisma Client                   │       │
│  └────────────────────────┬──────────────────────────┘       │
└───────────────────────────┼───────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    MinIO     │  │   MailHog    │
│  + new tables│  │ + PDF/Excel  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Build Order

Based on dependencies:

```
Phase 1: Fix Core (Foundation)
├── Fix auth for all roles
├── Complete attendance check-in/out
└── Complete timesheet entry

Phase 2: Location Integration
├── Add Geofence model/CRUD
├── Extend check-in to capture location
├── Add verification logic
└── Add geofence failure anomaly

Phase 3: Activity Tracking
├── Add ActivityStatus model
├── Build activity endpoints
├── Integrate with presence display
└── Add to team visibility views

Phase 4: Reporting Infrastructure
├── Build report data aggregation
├── Create report templates
├── Implement PDF exporter
├── Implement Excel exporter

Phase 5: Mobile App
├── Core flows (auth, attendance, timesheet)
├── Location permission handling
├── Activity status updates
└── Polish and testing
```

## Component Boundaries

| Component | Owns | Calls | Called By |
|-----------|------|-------|-----------|
| Location | Geofence config, verification | geolib | Attendance |
| Activity | Current activity state | Timesheet (for task info) | Presence, Reports |
| Reports | Report generation, export | All data modules | Controllers only |
| Attendance | Check-in/out, breaks | Location (verify) | Controllers, Reports |

## Real-Time Updates

Extend existing WebSocket architecture:

```typescript
// ActivityGateway (new)
@WebSocketGateway({ namespace: '/activity' })
export class ActivityGateway {
  @SubscribeMessage('activity:subscribe')
  handleSubscribe(client, teamId) {
    client.join(`team:${teamId}`);
  }

  broadcastActivityUpdate(userId, activity) {
    // Broadcast to team members
  }
}

// Enrich PresenceGateway
// When sending presence updates, include current activity
```

## Privacy Controls

```typescript
// Location data access control
@Controller('location')
export class LocationController {
  @Get('check-ins')
  @Roles(UserRole.SuperAdmin)  // Only super admin
  async getCheckInLocations() { ... }
}

// Activity data - managers see their team only
@Get('team/:teamId/activity')
@Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
async getTeamActivity(@Param('teamId') teamId: string, @CurrentUser() user) {
  // Verify user manages this team
}
```
