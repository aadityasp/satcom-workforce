# Phase 5: Presence & Activity - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time team visibility with online/away status tracking and current activity display. Users can see who's available, set their current task, and managers can monitor team activities. WebSocket enables real-time updates.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions to Claude. The following areas are open for Claude to determine during research and planning:

**Status Indicators:**
- Visual design for Online/Away/Offline states
- Timing thresholds (e.g., away after X minutes)
- Where indicators appear (team list, headers, chat)

**Team List Layout:**
- List vs card layout
- Grouping (by department, status, alphabetical)
- Information density and filtering UI

**Activity Updates:**
- How users set current task/status
- Update frequency and persistence
- What activity info is visible to whom

**Real-time Behavior:**
- WebSocket implementation approach
- Notification patterns for status changes
- Offline/reconnection handling

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

Follow existing codebase patterns from Phase 1-4 implementations.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-presence-activity*
*Context gathered: 2026-01-24*
