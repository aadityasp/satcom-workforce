# Phase 2: Attendance Core - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can check in/out with work mode selection, take breaks, and system tracks overtime. GPS capture at check-in is for mobile (Phase 8 integration). This phase focuses on the attendance workflow and data model — geofence verification is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Check-in/out Flow
- Modal with options for work mode selection (not quick buttons)
- Work modes: Office, Remote, Field, Client Site (4 options)
- Full status card during active session: timer, mode badge, break button, today's total hours, break time taken
- Check-out offers optional note field before confirming, then shows session summary

### Break Behavior
- Unlimited breaks allowed, total time tracked against daily policy
- Break time tracked separately (not subtracted from work hours) — 8h shift with 1h break shows 8h worked + 1h break
- Visual indicator (progress bar) shows break time usage against policy — no interruption/popup
- Break exceeding policy limit creates automatic anomaly for HR/manager
- Reminder notification if break left open too long, auto-end break at checkout
- Paid vs unpaid distinction deferred — all breaks treated the same for now

### Overtime Handling
- Overtime kicks in after 8 hours worked (admin configurable threshold)
- Just tracked — no approval workflow, no pre-approval required
- No real-time indicator when entering overtime — shows in reports only
- Track OT hours only — no rate calculations (payroll handles externally)

### Timeline Display
- Both views: horizontal bar summary showing work/break segments + expandable vertical event list
- Rich detail per event: time, type, duration, location (if captured), notes
- Timeline is read-only — no editing past entries, corrections via anomaly workflow
- Date picker to view any past date, today shown by default

### Claude's Discretion
- Break start UX (one-tap vs type selection) — pick sensible default
- Break policy structure (per-break limits, daily total, or combo)
- Exact styling/colors for timeline segments
- Loading states and error handling

</decisions>

<specifics>
## Specific Ideas

- Status card should feel "at a glance" — user knows their state immediately
- Timeline bar should visually distinguish work segments, break segments, and any gaps
- Modal for check-in should feel quick despite the extra step — not sluggish

</specifics>

<deferred>
## Deferred Ideas

- Location-based break detection (prompt "Are you on break?" when user moves away from work location) — belongs in Phase 4 after geofence infrastructure exists
- Paid vs unpaid break types — add if payroll integration needs it
- OT approval workflow — add if company policy requires it

</deferred>

---

*Phase: 02-attendance-core*
*Context gathered: 2026-01-24*
