# Assumptions & Defaults

## Satcom Workforce Visibility System - MVP

This document captures all assumptions made during design and implementation, default values chosen, and items that require future clarification or enhancement.

---

## Company Configuration

### Default Values

| Setting | Value | Rationale |
|---------|-------|-----------|
| Default Timezone | `Asia/Kolkata` (IST) | India-only workforce |
| Currency | INR | India operations |
| Language | English | Primary business language |
| Date Format | `DD/MM/YYYY` | Indian standard |
| Time Format | 12-hour with AM/PM | Common preference |
| Week Start | Monday | Standard work week |

### Assumptions

1. **Single Company**: MVP is single-tenant; one company instance
2. **No Multi-Location Complexity**: All offices follow same policies
3. **No Department Hierarchy**: Flat department structure for now
4. **No Cost Centers**: Not tracking project budgets in MVP

---

## User Management

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Initial SuperAdmin | First registered user | Auto-assigned |
| Password Min Length | 8 characters | Industry standard |
| Password Requirements | Upper, lower, number | No special char required |
| Session Duration | 1 hour access token | 7 days refresh token |
| OTP Validity | 10 minutes | For device verification |
| OTP Length | 6 digits | Standard practice |
| Max Login Attempts | 5 per 15 minutes | Rate limiting |

### Assumptions

1. **No Self-Registration**: All users created by SuperAdmin
2. **Single Role per User**: No multiple roles (e.g., can't be Manager AND HR)
3. **Manager via Profile**: Manager relationship set on profile, not team entity
4. **No Employee Hierarchy Levels**: Just one manager per employee
5. **Email Required**: Phone number optional

---

## Attendance

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Work Day Start | 9:00 AM | Standard office hours |
| Work Day End | 6:00 PM | Standard office hours |
| Standard Work Hours | 8 hours | Excluding lunch |
| Late Grace Period | 15 minutes | Before marked late |
| Early Leave Grace | 15 minutes | Before marked early |
| Auto Checkout Time | 11:00 PM | If forgotten |
| Max Work Hours/Day | 12 hours | Hard cap |

### Assumptions

1. **No Half-Day Check-In/Out**: Full day tracking only
2. **Single Check-In/Out per Day**: No multiple shift support
3. **No Shift Schedules**: Fixed 9-6 for all employees
4. **Break Not Deducted from Work**: Work time = checkout - checkin - breaks
5. **Weekend Work Allowed**: Just tracked as overtime

---

## Breaks & Lunch

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Standard Break | 15 minutes | Short break |
| Standard Lunch | 60 minutes | Lunch break |
| Max Breaks/Day | 4 | Excluding lunch |
| Max Lunches/Day | 1 | Typically once |
| Break Auto-End | 30 minutes | If not ended manually |
| Lunch Window | 12:00 PM - 2:00 PM | When lunch allowed |

### Assumptions

1. **Breaks Are Unpaid**: Deducted from work time
2. **No Break Approval**: Self-managed by employee
3. **Break Overlap Prevention**: System enforced
4. **No Scheduled Breaks**: Flexible timing

---

## Overtime

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| OT Threshold | 8 hours (480 min) | Work beyond this |
| Max Daily OT | 4 hours (240 min) | Hard cap |
| Weekend Multiplier | 2.0x | Saturday/Sunday |
| Holiday Multiplier | 2.5x | National holidays |

### Assumptions

1. **No OT Pre-Approval**: Tracked automatically
2. **No OT Pay Calculation**: Just hours tracked
3. **OT Capped Per Day**: Cannot exceed max
4. **No Comp-Off Auto-Generation**: Manual request only

---

## Timesheets

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Min Entry Duration | 15 minutes | Smallest unit |
| Max Hours/Day | 24 hours | Logical cap |
| Past Entry Window | 7 days | How far back allowed |
| Future Entry Window | 7 days | How far ahead allowed |
| Notes Required | No | Can be enabled |
| Max Attachments | 5 per entry | File limit |
| Max File Size | 10 MB | Per file |

### Assumptions

1. **No Timesheet Approval**: Self-submitted, trusted
2. **No Timesheet Lock**: Can edit past entries within window
3. **No Billable/Non-Billable**: All time treated equally
4. **No Task Time Estimates**: Just actuals tracked
5. **No Timesheet Reminders**: Future enhancement

---

## Leave Management

### Default Allocations (Annual)

| Leave Type | Days | Carry Forward | Notes |
|------------|------|---------------|-------|
| Sick Leave | 12 | No | Medical certificate for >2 consecutive |
| Casual Leave | 12 | No | Short notice allowed |
| Earned Leave | 15 | Yes (max 30) | 7 days advance notice |
| WFH | Unlimited | N/A | Manager notification |
| CompOff | Accrued | Yes (max 5) | For extra work days |
| Floating Holiday | 2 | No | Optional holidays |
| Bereavement | 5 | No | Immediate family |
| Maternity | 182 | N/A | As per Indian law |
| Paternity | 15 | N/A | Within 6 months |

### Assumptions

1. **Annual Reset**: January 1 for all non-carry-forward
2. **Pro-rata for New Joiners**: Based on join month
3. **No Half-Day Deduction**: Full day minimum (except for specific types)
4. **Single Approver**: HR or SuperAdmin only
5. **No Manager Approval**: Just notification for long leaves
6. **No Leave Encashment**: Not in MVP
7. **Holiday Sandwiching**: Weekends/holidays between leaves counted

---

## India Holiday Calendar (2026 Default)

| Date | Holiday | Type |
|------|---------|------|
| Jan 26 | Republic Day | National |
| Mar 14 | Holi | Optional |
| Apr 14 | Ambedkar Jayanti | National |
| Apr 18 | Good Friday | Optional |
| May 1 | May Day | National |
| Aug 15 | Independence Day | National |
| Aug 26 | Janmashtami | Optional |
| Oct 2 | Gandhi Jayanti | National |
| Oct 12 | Dussehra | Optional |
| Oct 31 | Diwali | National |
| Nov 1 | Diwali (Day 2) | National |
| Nov 15 | Guru Nanak Jayanti | Optional |
| Dec 25 | Christmas | National |

### Assumptions

1. **12 National Holidays**: Mandatory offs
2. **6 Optional Holidays**: Choose 2 as floating
3. **State Holidays**: Not included (can be custom added)
4. **No Regional Variations**: Same calendar for all

---

## Geofence

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Feature Enabled | No | Opt-in |
| Default Radius | 100 meters | Office perimeter |
| GPS Accuracy Required | 50 meters | Minimum precision |
| Retry Attempts | 3 | Before failure |

### Assumptions

1. **Opt-In Only**: Employees must grant permission
2. **Office Mode Only**: Other modes don't require GPS
3. **No Real-Time Tracking**: Only check-in point captured
4. **No Geofence Exit Detection**: Not tracking departures
5. **Bypass Allowed**: With documented reason
6. **Web Check-In**: No geofence (desktop browsers)

---

## Chat & Voice Notes

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Max Voice Note | 5 minutes | Duration limit |
| Audio Format | WebM/AAC | Web/Mobile compatible |
| Max Message Length | 4000 characters | Per message |
| Max Group Members | 50 | Per group |
| Retention Period | 365 days | Default |

### Assumptions

1. **No Message Encryption**: Standard HTTPS only
2. **No Read Receipts for Groups**: Only 1:1
3. **No Message Reactions**: Text/voice only
4. **No Message Forwarding**: Not in MVP
5. **No Message Search**: Future enhancement
6. **Voice Note Download**: Not playback-only

---

## Anomaly Detection

### Default Rule Configuration

| Rule | Threshold | Window | Severity |
|------|-----------|--------|----------|
| Late Check-In | 3 occurrences | 7 days | Medium |
| Missing Checkout | 1 occurrence | 1 day | High |
| Excessive Break | 150% of standard | Per break | Medium |
| Overtime Spike | 200% of average | 30 days | Low |
| Timesheet Mismatch | 20% variance | Per day | Medium |
| Geofence Failure | 3 occurrences | 30 days | High |

### Assumptions

1. **Rules Are Global**: Same for all employees
2. **No Per-User Baseline Customization**: Same thresholds
3. **No ML/AI**: Simple rule-based only
4. **Manual Resolution Required**: No auto-dismiss
5. **Anomalies Not Visible to Employees**: HR/Admin only

---

## File Storage

### Default Values

| Setting | Value | Notes |
|---------|-------|-------|
| Max File Size | 10 MB | Per file |
| Signed URL Expiry | 1 hour | For downloads |
| Upload URL Expiry | 15 minutes | For uploads |
| Allowed Image Types | jpg, jpeg, png, gif, webp | Images |
| Allowed Doc Types | pdf, doc, docx, xls, xlsx | Documents |
| Allowed Audio Types | webm, mp3, m4a, aac, ogg | Voice notes |

### Assumptions

1. **No Virus Scanning**: Trust internal users
2. **No Image Processing**: Store as-is
3. **No Thumbnail Generation**: Future enhancement
4. **Files Tied to Entity**: Deleted with parent

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API Response (p95) | < 200ms | Excluding file uploads |
| Page Load | < 2 seconds | First contentful paint |
| WebSocket Latency | < 500ms | Presence updates |
| Concurrent Users | 100 | MVP target |
| Database Size | < 10 GB | First year estimate |

### Assumptions

1. **No CDN**: Direct file serving from MinIO
2. **No Caching Layer**: PostgreSQL direct queries
3. **No Database Replicas**: Single instance
4. **No Load Balancing**: Single API instance

---

## Security

### Assumptions

1. **Internal Network Only**: Initially behind VPN
2. **No WAF**: Basic rate limiting only
3. **No 2FA for All**: Only device OTP
4. **No Password Expiry**: Not enforced
5. **No IP Whitelisting**: Any location allowed
6. **Trust Internal Users**: No DLP controls

---

## TODO / Future Enhancements

### High Priority

- [ ] Email notification system (SMTP integration)
- [ ] Push notifications for mobile
- [ ] Timesheet approval workflow
- [ ] Manager dashboard with team view
- [ ] Export reports to Excel/PDF

### Medium Priority

- [ ] Multi-language support (Hindi)
- [ ] Dark mode for web and mobile
- [ ] Offline mode with sync for mobile
- [ ] Calendar integration (Google/Outlook)
- [ ] Slack/Teams integration

### Low Priority

- [ ] Payroll integration
- [ ] Performance reviews module
- [ ] Training management
- [ ] Expense management
- [ ] Advanced analytics/BI

### Technical Debt

- [ ] Add comprehensive logging
- [ ] Implement proper error monitoring
- [ ] Add database query optimization
- [ ] Implement proper backup strategy
- [ ] Add CI/CD pipeline
- [ ] Add staging environment

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial assumptions documented |
