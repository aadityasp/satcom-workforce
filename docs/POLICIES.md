# Policies Specification

## Satcom Workforce Visibility System

---

## Work Hours Policy

### Standard Work Hours

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Standard Work Hours | 8 hours | 4-12 | Expected daily work hours |
| Max Work Hours | 12 hours | 8-16 | Maximum allowed per day |
| Work Week Days | Mon-Fri | Configurable | Standard work days |
| Core Hours Start | 10:00 AM | - | Core hours begin |
| Core Hours End | 4:00 PM | - | Core hours end |

### Grace Periods

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Late Arrival Grace | 15 minutes | 0-60 | Before marked as late |
| Early Departure Grace | 15 minutes | 0-60 | Before marked as early |

### Overtime Rules

| Setting | Default | Description |
|---------|---------|-------------|
| OT Threshold | 8 hours (480 min) | Work beyond this is overtime |
| Max Daily OT | 4 hours (240 min) | Cap on daily overtime |
| OT Multiplier | 1.5x | Overtime rate multiplier |
| Weekend OT Multiplier | 2.0x | Weekend/holiday overtime rate |

### Overtime Calculation

```
If daily_work_minutes > overtime_threshold:
  overtime_minutes = min(
    daily_work_minutes - overtime_threshold,
    max_overtime_minutes
  )
```

---

## Break & Lunch Policy

### Break Rules

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Standard Break | 15 minutes | 10-30 | Per break segment |
| Max Breaks Per Day | 4 | 1-8 | Maximum break count |
| Break Gap Minimum | 60 minutes | 30-120 | Minimum time between breaks |
| Auto-End Break | 30 minutes | Off/15-60 | Auto-end if not ended |

### Lunch Rules

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Standard Lunch | 60 minutes | 30-90 | Lunch duration |
| Max Lunches Per Day | 1 | 1-2 | Maximum lunch count |
| Lunch Window Start | 12:00 PM | - | Earliest lunch start |
| Lunch Window End | 2:00 PM | - | Latest lunch start |

### Break Validation

1. **No Overlap**: Break segments cannot overlap
2. **During Work Hours**: Breaks only allowed after check-in, before check-out
3. **End Required**: Breaks must be ended before check-out
4. **Duration Limit**: Alert if break exceeds 1.5x standard duration

---

## Leave Types & Entitlements

### Standard Leave Types

| Type | Code | Annual Days | Carry Forward | Paid | Notes |
|------|------|-------------|---------------|------|-------|
| Sick Leave | Sick | 12 | No | Yes | Medical certificate for >2 days |
| Casual Leave | Casual | 12 | No | Yes | Short notice allowed |
| Earned Leave | Earned | 15 | Yes (max 30) | Yes | Plan 7 days in advance |
| Work From Home | WFH | Unlimited | N/A | Yes | Manager approval |
| Comp Off | CompOff | Accrued | Yes (max 5) | Yes | For weekend/holiday work |
| Loss of Pay | LOP | N/A | N/A | No | When balance exhausted |
| Floating Holiday | FloatingHoliday | 2 | No | Yes | For optional holidays |
| Bereavement | Bereavement | 5 | No | Yes | Immediate family |
| Maternity | Maternity | 182 | N/A | Yes | As per law |
| Paternity | Paternity | 15 | N/A | Yes | Within 6 months of birth |

### Leave Accrual

| Type | Accrual Method | Frequency | Pro-rata |
|------|----------------|-----------|----------|
| Sick | Annual grant | Jan 1 | Yes (join date) |
| Casual | Annual grant | Jan 1 | Yes (join date) |
| Earned | Monthly accrual | 1.25 days/month | Yes |
| Floating Holiday | Annual grant | Jan 1 | No |
| CompOff | On approval | Per instance | N/A |

### Leave Request Rules

1. **Advance Notice**:
   - Casual: Same day allowed
   - Earned: 7 days notice required
   - Sick: Post-facto allowed (within 2 days)

2. **Approval Requirements**:
   - All leaves require HR or SuperAdmin approval
   - Manager notification (not approval) for >3 consecutive days

3. **Overlap Prevention**:
   - Cannot request overlapping date ranges
   - Weekend/holidays sandwiched are included in count

4. **Balance Check**:
   - Request rejected if insufficient balance (except LOP)
   - Warning shown if balance will go negative

### Half-Day Leaves

- Supported for: Sick, Casual, Earned
- Half-day = 0.5 days deducted
- Options: First half (until lunch) or Second half (after lunch)

---

## Verification & Geofence Policy

### Verification Status Types

| Status | Description | Trust Level |
|--------|-------------|-------------|
| None | No verification performed | Low |
| GeofencePassed | GPS within office radius | High |
| GeofenceFailed | GPS outside office radius | Low |
| QRPassed | Office QR code scanned | High |
| QRFailed | Invalid/expired QR code | Low |
| DeviceVerified | Verified registered device | Medium |

### Geofence Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Geofence Enabled | false | true/false | Feature toggle |
| Require for Office | false | true/false | Mandatory for office mode |
| Allow Bypass | true | true/false | Allow with reason |
| Default Radius | 100 meters | 50-500 | Office perimeter |
| GPS Accuracy Threshold | 50 meters | 20-100 | Minimum GPS accuracy |

### Work Mode & Verification Matrix

| Work Mode | Geofence Required | GPS Captured | Notes |
|-----------|-------------------|--------------|-------|
| Office | If policy enabled | Yes (mobile) | Validate against office locations |
| Remote | No | Optional | Device verification preferred |
| CustomerSite | No | Optional | Can log site location |
| FieldVisit | No | Optional | Can log visit location |
| Travel | No | No | No location needed |

### Geofence Bypass

When geofence fails but bypass is allowed:
1. User must provide reason
2. Verification status = GeofenceFailed
3. Event flagged for HR review
4. May trigger anomaly if repeated

---

## Anomaly Detection Rules

### Rule: Repeated Late Check-Ins

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | Medium | Alert severity |
| Threshold | 3 | Late count to trigger |
| Window | 7 days | Rolling window |
| Late Definition | >15 min after work start | Using grace period |

**Detection Logic:**
```
late_count = count(check_ins where time > work_start + grace)
             in last {window_days} days
if late_count >= threshold:
  create_anomaly(RepeatedLateCheckIn, severity)
```

### Rule: Missing Check-Out

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | High | Alert severity |
| Detection Time | 11:00 PM | When to check |

**Detection Logic:**
```
for each user with check_in today and no check_out:
  if current_time > detection_time:
    create_anomaly(MissingCheckOut, severity)
```

### Rule: Excessive Break Time

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | Medium | Alert severity |
| Threshold | 150% | Of standard break |

**Detection Logic:**
```
for each break segment:
  if duration > standard_duration * 1.5:
    create_anomaly(ExcessiveBreak, severity)
```

### Rule: Overtime Spike

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | Low | Alert severity |
| Threshold | 200% | Of user's average OT |
| Window | 30 days | Baseline window |

**Detection Logic:**
```
avg_ot = average(overtime_minutes) in last {window_days}
if today_ot > avg_ot * 2:
  create_anomaly(OvertimeSpike, severity)
```

### Rule: Timesheet Mismatch

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | Medium | Alert severity |
| Variance | 20% | Allowed difference |

**Detection Logic:**
```
attendance_hours = work_minutes from attendance
timesheet_hours = sum(minutes) from timesheets
if abs(attendance_hours - timesheet_hours) > attendance_hours * 0.2:
  create_anomaly(TimesheetMismatch, severity)
```

### Rule: Geofence Failures

| Parameter | Default | Description |
|-----------|---------|-------------|
| Enabled | true | Rule active |
| Severity | High | Alert severity |
| Threshold | 3 | Failures to trigger |
| Window | 30 days | Rolling window |

**Detection Logic:**
```
failure_count = count(check_ins where
  work_mode = Office and
  verification = GeofenceFailed)
  in last {window_days}
if failure_count >= threshold:
  create_anomaly(GeofenceFailure, severity)
```

### Anomaly Processing

| Stage | Timing | Actions |
|-------|--------|---------|
| Real-time | On event | Check applicable rules immediately |
| Batch | Daily 11:30 PM | Re-evaluate all rules |
| Dedup | Before create | Skip if identical open anomaly exists |

### Anomaly Lifecycle

```
Open → Acknowledged → Resolved
  ↓
Dismissed
```

| Transition | Actor | Requirements |
|------------|-------|--------------|
| Open → Acknowledged | HR/SuperAdmin | Optional notes |
| Acknowledged → Resolved | HR/SuperAdmin | Notes required |
| Open → Dismissed | HR/SuperAdmin | Reason required |
| Dismissed → Open | SuperAdmin | Can reopen |

---

## Retention Policy

### Data Retention Periods

| Data Type | Default | Range | Archive |
|-----------|---------|-------|---------|
| Chat Messages | 365 days | 90-730 | Yes |
| Attachments | 365 days | 90-730 | Optional |
| Voice Notes | 180 days | 90-365 | No |
| Anomaly Events | 730 days | 365-2555 | Yes |
| Audit Logs | 2555 days (7 years) | 1825-3650 | Required |
| Attendance Records | Permanent | - | No |
| Timesheet Records | Permanent | - | No |

### Cleanup Process

1. **Scheduled Job**: Runs daily at 2:00 AM
2. **Soft Delete First**: Mark records for deletion
3. **Hard Delete After**: 30-day grace period
4. **Backup Before Delete**: For archived data types
5. **Audit Log Entry**: Record all deletions

### User-Initiated Deletion

- Users can delete own chat messages (soft delete)
- Deleted messages show "Message deleted" placeholder
- Attachments removed from storage after retention

---

## Timesheet Policy

### Entry Rules

| Setting | Default | Description |
|---------|---------|-------------|
| Max Hours Per Day | 24 | Total across all entries |
| Min Entry Minutes | 15 | Minimum per entry |
| Notes Required | false | Require notes on entry |
| Future Entries | 7 days | How far ahead allowed |
| Past Entries | 7 days | How far back allowed |

### Validation

1. **Project-Task Hierarchy**: Task must belong to selected project
2. **Active Only**: Cannot log to inactive projects/tasks
3. **Date Range**: Within allowed past/future window
4. **Total Cap**: Sum of day's entries ≤ 24 hours

### Attachments

| Setting | Default | Description |
|---------|---------|-------------|
| Max Attachments | 5 | Per timesheet entry |
| Max File Size | 10 MB | Per file |
| Allowed Types | jpg, png, pdf, doc, docx | File extensions |

---

## Notification Policy

### Email Notifications

| Event | Recipient | Default |
|-------|-----------|---------|
| Leave Request Submitted | HR | On |
| Leave Approved/Rejected | Employee | On |
| Anomaly Detected | HR | On (High/Critical only) |
| Password Reset | User | Always |
| New Device Login | User | Always |

### In-App Notifications

| Event | Recipient | Default |
|-------|-----------|---------|
| Chat Message | Thread members | On |
| Leave Status Change | Requester | On |
| Break Reminder | User | Off |
| Check-out Reminder | User | On (6 PM) |

### Notification Channels

- In-app (always available)
- Email (SMTP required)
- Push notifications (future, not MVP)
