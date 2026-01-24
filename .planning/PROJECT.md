# Satcom Workforce Visibility System

## What This Is

A workforce management platform for Satcom Technologies (30 employees scaling to 100) that gives management clear visibility on where employees are and what they're doing. Employees get a snappy mobile-first experience for daily tasks — check-in, timesheets, leaves. HR and admins get oversight tools, anomaly detection, and exportable reports.

## Core Value

Management sees real-time employee location, activity, and productivity — employees have a fast, friction-free app for their daily work tasks.

## Requirements

### Validated

<!-- Inferred from existing codebase — architecture exists but incomplete -->

- ✓ Monorepo structure (apps/api, apps/web, apps/mobile, packages/shared) — existing
- ✓ NestJS API with modular architecture (auth, attendance, timesheets, leaves, chat, presence modules) — existing
- ✓ Prisma schema with core models — existing
- ✓ JWT authentication with refresh tokens — existing
- ✓ Role-based access control structure (SuperAdmin, HR, Manager, Employee) — existing
- ✓ WebSocket infrastructure for real-time (presence, chat gateways) — existing
- ✓ Next.js web app with admin routes — existing (incomplete)
- ✓ Shared types and Satcom brand theme — existing
- ✓ Docker Compose for local infrastructure — existing

### Active

<!-- Current scope — building toward these -->

**MVP (First Release):**
- [ ] Auth working for all 4 roles with proper permissions
- [ ] Attendance check-in/out with work modes (Office, Remote, CustomerSite, FieldVisit, Travel)
- [ ] Break management with policy enforcement
- [ ] Timesheet entry with project/task hierarchy
- [ ] Timesheet attachments via MinIO
- [ ] Mobile app (Android + iOS) with core features
- [ ] All existing bugs fixed, app stable

**Post-MVP:**
- [ ] Leave management with types, balances, and approval workflow
- [ ] Holiday calendar management
- [ ] Location verification on check-in (super admin visibility only)
- [ ] Geofence alerts for office check-in (super admin visibility only)
- [ ] Activity tracking — current task/project display
- [ ] Activity tracking — task time breakdown
- [ ] Activity tracking — status updates from employees
- [ ] Productivity reports — manager team views
- [ ] Productivity reports — HR/admin organization views
- [ ] Exportable reports (PDF/Excel)
- [ ] Chat with 1:1 and group messaging
- [ ] Voice notes (max 5 min)
- [ ] Anomaly detection with resolution workflow
- [ ] Audit logging with viewer

### Out of Scope

- Live GPS tracking during work hours — privacy concern, not needed
- Screenshot/activity log capture — privacy concern, not needed
- Individual employee dashboards showing their own metrics — management focus
- Multi-tenant SaaS — single tenant for Satcom
- Payroll integration — separate system
- Performance reviews — separate process
- Training management — not needed
- Expense management — not needed
- SSO/SAML — email/password sufficient
- Cloud deployment — self-hosted on their server

## Context

**Current State:**
- Web app partially built but has UI issues and incomplete features
- Mobile app not started (Expo directory exists with basic setup)
- API has module structure but features incomplete
- Auth flow exists but roles/permissions not fully working
- Attendance, timesheets, leaves modules scaffolded but buggy

**Technical Environment:**
- Self-hosted deployment on their server
- Docker Compose for infrastructure (PostgreSQL, MinIO, MailHog)
- 30 users currently, scaling to 100
- India-based workforce

**Existing Documentation:**
- PRD at docs/PRD.md
- RBAC spec at docs/RBAC.md
- Data model at docs/DATA_MODEL.md
- API contract at docs/API_CONTRACT.md
- UX flows at docs/UX_FLOWS.md
- Security spec at docs/SECURITY.md

## Constraints

- **Timeline**: ASAP — weeks, not months
- **Deployment**: Self-hosted server (Docker Compose based)
- **Tech stack**: Locked — NestJS, Next.js, Expo React Native, PostgreSQL, Prisma
- **Privacy**: Location data (check-in verification, geofence) visible only to Super Admin
- **Mobile**: Must have for first release — employees primarily use phones

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parallel fix + build approach | ASAP timeline requires working on stability while adding features | — Pending |
| Location only at check-in | Privacy-respecting, not live tracking | — Pending |
| Super Admin only for location data | Limit access to sensitive location information | — Pending |
| Leave management post-MVP | Focus MVP on daily operations (attendance, timesheets) | — Pending |
| Individual dashboards out of scope | Management visibility focus, not employee self-tracking | — Pending |

---
*Last updated: 2026-01-24 after initialization*
