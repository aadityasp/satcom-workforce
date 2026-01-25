# Phase 7: Reports & Dashboards - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Provide managers with team metrics dashboards and HR with organization-wide metrics. Enable PDF export of reports. Dashboard pages show attendance, timesheet summaries, and anomaly overviews with role-based access.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Role-specific pages: Separate dashboard pages for Manager, HR, and SuperAdmin
- Primary focus for managers: Today's attendance (who's checked in, late arrivals, absences)
- Each role sees only metrics relevant to their responsibilities

### Data visualization
- Anomaly highlighting: Use all visual cues
  - Red notification badges with issue counts
  - Dedicated "Needs Attention" section at top of dashboard
  - Inline warning icons next to affected rows/items
- Charts and tables: Balance based on data type and context

### PDF report format
- Page format: A4 Portrait orientation
- Content: Tables only (no embedded charts)
- Keep reports clean and fast to generate

### Claude's Discretion
- Navigation pattern within reports section (sidebar vs tabs vs cards)
- Dashboard information density (summary cards vs preview + detail)
- Chart type selection (bar, line, pie) based on metric type
- Table vs chart decisions per data type
- Employee status display format (grid, timeline, or list)
- PDF header design (professional branding approach)
- PDF section structure based on report type

</decisions>

<specifics>
## Specific Ideas

- Managers should see "today's attendance" as the first thing when opening their dashboard
- Anomalies/issues should be highly visible across multiple UI elements to ensure nothing is missed
- PDF reports should be practical and quick to generate (tables over complex visualizations)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-reports-dashboards*
*Context gathered: 2026-01-24*
