# Research Summary

**Completed:** 2026-01-24

## Key Findings

### Stack Additions
- **Mobile GPS:** `expo-location` for one-time capture at check-in (not continuous tracking)
- **Geofence calc:** `geolib` for point-in-radius verification on backend
- **PDF export:** `puppeteer` + `handlebars` templates
- **Excel export:** `exceljs` for formatted spreadsheets
- **Charts:** `recharts` for web dashboards

### Feature Priorities

**Table Stakes (must have):**
- One-time GPS capture at check-in
- Geofence verification (configurable radius)
- Current task display
- Attendance/timesheet summaries
- Manager team views

**Differentiators:**
- Task time breakdown charts
- Multi-format report export (PDF/Excel)
- Real-time activity status with notes
- Geofence failure alerts to super admin

**Anti-Features (do NOT build):**
- Continuous GPS tracking
- Screenshot capture
- Keystroke logging
- Location history timeline

### Architecture Pattern

Add three new modules to existing NestJS monolith:
1. **Location Module** — Geofence CRUD, verification logic
2. **Activity Module** — Current task/status, time tracking
3. **Reports Module** — Data aggregation, PDF/Excel export

Extend existing:
- Attendance module calls Location for verification
- Presence gateway enriched with Activity data

### Critical Pitfalls

| Priority | Pitfall | Mitigation |
|----------|---------|------------|
| High | Background location | Only use foreground, capture at check-in only |
| High | Expo Go limitations | Use development builds, test on real devices |
| High | PDF memory leaks | Close Puppeteer after each PDF, limit concurrency |
| Medium | GPS accuracy | Accept ≤100m accuracy, generous geofence radius |
| Medium | Privacy concerns | Location data super-admin only, self-reported activity |

### Suggested Build Order

```
1. Fix Core           → Auth, Attendance, Timesheets working
2. Location           → Geofence config, check-in verification
3. Activity           → Current task, status updates
4. Reports            → Aggregation, PDF/Excel export
5. Mobile             → Core flows, location, activity
```

## Files

- [STACK.md](./STACK.md) — Library recommendations
- [FEATURES.md](./FEATURES.md) — Feature categorization and UX patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Module structure and data flow
- [PITFALLS.md](./PITFALLS.md) — Common mistakes and prevention
