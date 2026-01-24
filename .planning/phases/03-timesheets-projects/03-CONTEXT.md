# Phase 3: Timesheets & Projects - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log hours against projects/tasks with notes and attachments. System validates entries (max 24h/day, task belongs to project). Users can edit/delete same-day entries and view history. Admin manages projects and tasks.

</domain>

<decisions>
## Implementation Decisions

### Entry Creation Flow
- Two-step modal: pick project first, then task in second step, then entry form
- Only project + hours required; task, notes, attachments all optional
- After submitting, return to history list with success toast

### Time Input Format
- Start/end time pickers (duration calculated automatically)
- Quick preset buttons: "30m", "1h", "2h", "4h" to pre-fill duration
- Can only create entries for today (no backdating)
- Block submission if total daily hours exceed 24 — strict enforcement

### History & Listing
- Table view with columns: date, project, task, hours, notes
- Filter by date range only — keep it simple
- Click entry row to open edit modal (same as create modal)
- Weekly summary at top with daily totals breakdown

### Claude's Discretion
- Whether task is required or optional (based on codebase patterns)
- Attachments UX (not discussed — implement sensible defaults)
- Admin project/task management UI layout
- Table pagination vs infinite scroll
- Exact preset button values

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-timesheets-projects*
*Context gathered: 2026-01-24*
