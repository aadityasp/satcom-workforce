# Features Research

**Researched:** 2026-01-24
**Focus:** Location verification, activity tracking, productivity reporting

## Location Verification Features

### Table Stakes
| Feature | Description | Complexity |
|---------|-------------|------------|
| One-time GPS capture | Capture lat/lng at check-in moment | Low |
| Permission handling | Request location permission gracefully | Low |
| Accuracy indicator | Show GPS accuracy to user | Low |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| Geofence verification | Auto-check if within office radius | Medium |
| Multiple office locations | Support multiple geofences | Low |
| Verification status badge | Show verified/unverified on attendance | Low |
| Failed verification alerts | Notify super admin of failures | Medium |

### Anti-Features (Do NOT Build)
| Feature | Why Not |
|---------|---------|
| Continuous GPS tracking | Privacy violation, battery drain, not needed |
| Location history timeline | Surveillance-like, employees will resist |
| Real-time location map | Creepy, damages trust |
| Mandatory location for all check-ins | Remote workers can't comply |

## Activity Tracking Features

### Table Stakes
| Feature | Description | Complexity |
|---------|-------------|------------|
| Current task display | Show what user is working on | Low |
| Task time logging | Log hours against tasks | Low |
| Status indicator | Online/Away/Offline | Already exists |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| Task time breakdown | Pie chart of time per task/project | Medium |
| Status updates | Brief "what I'm doing" notes | Low |
| Project context | Show current project alongside status | Low |
| Daily activity summary | Auto-generated end-of-day summary | Medium |

### Anti-Features (Do NOT Build)
| Feature | Why Not |
|---------|---------|
| Screenshot capture | Privacy violation, surveillance |
| Keystroke logging | Illegal in many jurisdictions |
| Application monitoring | Invasive, not requested |
| Idle time tracking | Micromanagement, damages morale |

## Productivity Reporting Features

### Table Stakes
| Feature | Description | Complexity |
|---------|-------------|------------|
| Attendance summary | Check-in/out times, work hours | Low |
| Timesheet totals | Hours per project/task | Low |
| Leave balances | Current leave balances per type | Low |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| Manager team dashboard | Aggregated view of team metrics | Medium |
| HR organization view | Company-wide attendance/timesheet stats | Medium |
| Trend analysis | Week-over-week, month-over-month patterns | Medium |
| Anomaly summary | Count of open anomalies per user | Low |
| Export to PDF | Formatted report with charts | High |
| Export to Excel | Raw data for further analysis | Medium |
| Scheduled reports | Auto-email reports weekly/monthly | Medium |

### Report Types Needed
| Report | Audience | Contents |
|--------|----------|----------|
| Team Attendance | Manager | Team check-in times, late arrivals, absences |
| Team Timesheet | Manager | Hours logged per team member, project breakdown |
| Organization Attendance | HR/Admin | Company-wide attendance compliance |
| Organization Timesheet | HR/Admin | All timesheets, project totals |
| Individual Summary | HR/Admin | Single employee's full history |
| Anomaly Report | HR/Admin | All anomalies with status |

## Feature Dependencies

```
Location Verification
└── Depends on: Attendance module (check-in endpoint)
└── Requires: Geofence configuration (admin settings)

Activity Tracking
└── Depends on: Timesheet module (current task)
└── Depends on: Presence module (status display)

Productivity Reports
└── Depends on: All data being collected correctly
└── Depends on: Report templates designed
└── Depends on: Export libraries integrated
```

## UX Patterns

### Location Permission Flow (Mobile)
1. First check-in attempt → Explain why location needed
2. Request foreground permission only
3. If denied → Allow check-in without location, flag as "unverified"
4. Show accuracy indicator after capture

### Activity Status Flow
1. Check-in → Prompt for initial task selection
2. Throughout day → Quick status update from dashboard
3. Status expires after 4 hours → Prompt for update
4. Check-out → Auto-clear current task

### Report Generation Flow
1. Select report type
2. Choose date range
3. Choose filters (team, user, project)
4. Preview in browser
5. Download as PDF or Excel

## Sources

- [Employee Activity Tracking | Time Champ](https://www.timechamp.io/employee-activity-tracking)
- [Activity Tracking Software | DeskTrack](https://desktrack.timentask.com/activity-tracking)
- [Employee Monitoring Software | Workstatus](https://www.workstatus.io/workforce-management/employee-monitoring-software)
