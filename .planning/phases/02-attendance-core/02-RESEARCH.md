# Phase 2: Attendance Core - Research

**Researched:** 2026-01-24
**Domain:** Workforce attendance tracking (check-in/out, breaks, overtime)
**Confidence:** HIGH

## Summary

Phase 2 builds on the existing NestJS/Prisma backend and Next.js frontend to deliver the core attendance workflow. The good news: the data model is already defined (AttendanceDay, AttendanceEvent, BreakSegment) and basic service scaffolding exists. The work is primarily about implementing the user-facing features per the CONTEXT.md decisions.

**Key findings:**
- Backend skeleton exists with check-in/out, break start/end endpoints — needs enhancement for work mode modal flow
- Frontend has a basic check-in button on dashboard — needs the full status card UX per decisions
- Break policy tracking infrastructure (WorkPolicy model) exists but break anomaly creation isn't wired up
- Timeline components need to be built from scratch

**Primary recommendation:** Focus on frontend UX for the full status card and timeline, enhance API responses to support the UI, and wire up break policy anomaly detection.

## Standard Stack

The project already uses an established stack. No new libraries needed for Phase 2.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | ^10.x | Backend framework | Already in project |
| @prisma/client | ^5.x | Database ORM | Already in project |
| next | ^14.x | Frontend framework | Already in project |
| framer-motion | ^11.x | Animations | Already in project |
| zustand | ^4.x | State management | Already in project |
| lucide-react | ^0.x | Icons | Already in project |
| date-fns | ^3.x | Date manipulation | Should be added |

### Why date-fns?
Break duration display, timeline segment calculations, and "time ago" formatting need robust date handling. date-fns is lightweight, tree-shakeable, and pairs well with the existing stack.

```bash
npm install date-fns --save --workspace=apps/web
```

## Architecture Patterns

### Existing Backend Structure
```
apps/api/src/attendance/
├── attendance.module.ts      # NestJS module
├── attendance.controller.ts  # HTTP endpoints (exists)
├── attendance.service.ts     # Business logic (exists)
├── geofence.service.ts       # Geofence validation (exists, used Phase 4)
└── dto/
    ├── check-in.dto.ts       # Check-in payload
    ├── check-out.dto.ts      # Check-out payload
    ├── start-break.dto.ts    # Break start payload
    └── override-attendance.dto.ts  # Admin override
```

### Recommended Frontend Structure
```
apps/web/src/
├── app/dashboard/
│   └── page.tsx              # Existing — embed AttendanceStatusCard
├── app/attendance/
│   ├── page.tsx              # New — dedicated attendance page with timeline
│   └── history/page.tsx      # New — attendance history view
├── components/attendance/
│   ├── AttendanceStatusCard.tsx    # Full status card with timer
│   ├── CheckInModal.tsx            # Work mode selection modal
│   ├── CheckOutModal.tsx           # Optional note + confirmation
│   ├── BreakButton.tsx             # Break start/end toggle
│   ├── TimelineBar.tsx             # Horizontal summary visualization
│   ├── TimelineEventList.tsx       # Vertical event list (expandable)
│   └── BreakPolicyIndicator.tsx    # Progress bar for policy
└── hooks/
    └── useAttendance.ts      # Custom hook for attendance state
```

### Pattern 1: Optimistic UI Updates with Rollback
**What:** Update UI immediately before API response, rollback on error
**When to use:** Check-in/out, break start/end — user expects instant feedback
**Example:**
```typescript
const handleCheckIn = async (workMode: WorkMode) => {
  const previousState = { ...attendance };

  // Optimistic update
  setAttendance(prev => ({
    ...prev,
    isCheckedIn: true,
    checkInTime: new Date().toISOString(),
    workMode,
  }));

  try {
    const result = await api.post('/attendance/check-in', { workMode });
    // Sync with server response
    setAttendance(transformApiResponse(result.data));
  } catch (error) {
    // Rollback on error
    setAttendance(previousState);
    showError(error.message);
  }
};
```

### Pattern 2: Polling with Intervals for Real-Time Updates
**What:** Poll attendance status every 60 seconds while checked in
**When to use:** Status card timer, break duration display
**Example:**
```typescript
useEffect(() => {
  if (!attendance.isCheckedIn) return;

  const interval = setInterval(() => {
    // Update elapsed time display locally
    setElapsedMinutes(prev => prev + 1);
  }, 60000);

  return () => clearInterval(interval);
}, [attendance.isCheckedIn]);
```

### Pattern 3: Timeline Segment Calculation
**What:** Convert events + breaks into renderable segments
**When to use:** TimelineBar visualization
**Example:**
```typescript
interface TimelineSegment {
  type: 'work' | 'break' | 'lunch' | 'gap';
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  percentOfDay: number;  // For bar width
}

function buildTimelineSegments(
  checkIn: Date,
  checkOut: Date | null,
  breaks: BreakSegment[]
): TimelineSegment[] {
  // Sort breaks by start time
  // Fill gaps between break end and next break start as 'work'
  // Calculate percentages based on total session duration
}
```

### Anti-Patterns to Avoid
- **Polling for timer display:** Don't fetch from server every second. Calculate elapsed time client-side from stored checkInTime.
- **Storing derived state:** Don't store `totalWorkMinutes` in component state. Derive from events.
- **Modal state in parent:** Keep modal open/close state colocated with the modal component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time elapsed display | Manual setInterval math | date-fns intervalToDuration | Handles DST, edge cases |
| Date formatting | Template literals | date-fns format | i18n, consistency |
| Timeline bar widths | Manual percentage calc | CSS flex-grow with duration ratios | Browser handles subpixel rounding |
| Break policy validation | Client-side validation | Server-side validation in service | Policy config lives in DB |

**Key insight:** The backend already has WorkPolicy with break duration limits. Don't duplicate policy logic client-side — let the API return violation status.

## Common Pitfalls

### Pitfall 1: Timezone Mismatch
**What goes wrong:** User in IST sees wrong check-in time because server stores UTC
**Why it happens:** Prisma stores DateTime as UTC, frontend displays without conversion
**How to avoid:**
- Always store in UTC (Prisma default)
- Send timestamps as ISO strings
- Convert to local time only in UI layer using user's profile timezone
**Warning signs:** Check-in time looks off by several hours

### Pitfall 2: Race Condition on Double-Click
**What goes wrong:** User clicks check-in twice quickly, gets duplicate events
**Why it happens:** Button not disabled during API call
**How to avoid:**
- Disable button immediately on click
- Add loading state
- Backend has guard (checks existing check-in) but UX should prevent attempt
**Warning signs:** "Already checked in" error messages

### Pitfall 3: Stale Attendance State After Tab Switch
**What goes wrong:** User switches tabs for an hour, timer shows wrong time
**Why it happens:** Timer only updates via interval, not on visibility change
**How to avoid:**
- Use visibilitychange event to refetch or recalculate
- Store absolute checkInTime, derive elapsed on render
**Warning signs:** Timer "jumps" when tab becomes visible

### Pitfall 4: Break Auto-End on Checkout Not Visible
**What goes wrong:** User checks out while on break, doesn't know break was auto-ended
**Why it happens:** Backend auto-ends break silently
**How to avoid:**
- CheckOutModal should show "You have an open break that will be ended" warning
- API response should include ended breaks in result
**Warning signs:** User confused about their break time summary

### Pitfall 5: Empty Timeline on First Load
**What goes wrong:** Timeline shows nothing before user's first check-in
**Why it happens:** No attendance day record exists yet
**How to avoid:**
- Handle null/empty state explicitly
- Show "Not checked in" state with call-to-action
**Warning signs:** Blank component rendering

## Code Examples

### Check-In API Enhancement
Current API returns raw AttendanceEvent. Enhance to return full context:

```typescript
// attendance.service.ts - Enhanced checkIn return
async checkIn(userId: string, companyId: string, dto: CheckInDto) {
  // ... existing logic ...

  // Fetch work policy for break limits
  const workPolicy = await this.prisma.workPolicy.findUnique({
    where: { companyId },
  });

  return {
    event,
    attendanceDay: await this.getAttendanceDayWithStatus(attendanceDay.id),
    policy: {
      breakDurationMinutes: workPolicy?.breakDurationMinutes || 15,
      lunchDurationMinutes: workPolicy?.lunchDurationMinutes || 60,
      overtimeThresholdMinutes: workPolicy?.overtimeThresholdMinutes || 480,
    },
  };
}
```

### Status Card State Shape
```typescript
interface AttendanceState {
  status: 'not_checked_in' | 'working' | 'on_break' | 'checked_out';
  checkInTime: string | null;
  checkOutTime: string | null;
  workMode: WorkMode | null;
  currentBreak: {
    id: string;
    type: BreakType;
    startTime: string;
  } | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  breakPolicy: {
    maxDailyMinutes: number;
    warningThresholdMinutes: number;
  };
  events: AttendanceEvent[];
  breaks: BreakSegment[];
}
```

### Timeline Bar Component Structure
```tsx
// TimelineBar.tsx
export function TimelineBar({
  checkInTime,
  checkOutTime,
  breaks
}: TimelineBarProps) {
  const segments = useMemo(
    () => buildTimelineSegments(checkInTime, checkOutTime, breaks),
    [checkInTime, checkOutTime, breaks]
  );

  return (
    <div className="flex h-4 rounded-full overflow-hidden bg-silver-100">
      {segments.map((segment, i) => (
        <div
          key={i}
          className={cn(
            'h-full',
            segment.type === 'work' && 'bg-blue-500',
            segment.type === 'break' && 'bg-orange-400',
            segment.type === 'lunch' && 'bg-purple-400',
          )}
          style={{ flex: segment.durationMinutes }}
          title={`${segment.type}: ${segment.durationMinutes}m`}
        />
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-rendered timers | Client-side with checkInTime | N/A | Less server load |
| Separate break timer API | Derive from break startTime | N/A | Simpler API surface |

**Project-specific notes:**
- The existing dashboard has inline attendance logic — should extract to component
- The API already returns break segments with attendance — no new endpoints needed for timeline

## Open Questions

1. **Break Type UX Decision**
   - What we know: CONTEXT.md says Claude's discretion for "one-tap vs type selection"
   - What's unclear: Should we default to "Break" or show both Break/Lunch options?
   - Recommendation: Single tap starts "Break" by default, long-press or menu shows Lunch option. Simpler UX for common case.

2. **Break Policy Threshold Source**
   - What we know: WorkPolicy table has breakDurationMinutes and lunchDurationMinutes
   - What's unclear: Is policy "per-break max" or "daily total"?
   - Recommendation: Treat as daily total for now (simpler). Add per-break limits in v2 if needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/api/src/attendance/` — existing service implementation
- Codebase analysis: `apps/api/prisma/schema.prisma` — data model
- Codebase analysis: `apps/web/src/app/dashboard/page.tsx` — existing UI patterns

### Secondary (MEDIUM confidence)
- CONTEXT.md — user decisions from `/gsd:discuss-phase`

## Metadata

**Confidence breakdown:**
- Data model: HIGH — schema is defined and matches requirements
- Backend patterns: HIGH — existing code provides clear patterns
- Frontend patterns: HIGH — dashboard code shows framer-motion, zustand patterns
- Break policy: MEDIUM — policy table exists but exact enforcement logic TBD

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (stable domain, no external dependencies)
