/**
 * Shared Enums for Satcom Workforce Application
 *
 * These enums are used across API, web, and mobile applications
 * to ensure type consistency and prevent magic strings.
 */

/**
 * User roles for RBAC
 * Hierarchical: SuperAdmin > HR > Manager > Employee
 */
export enum UserRole {
  Employee = 'Employee',
  Manager = 'Manager',
  HR = 'HR',
  SuperAdmin = 'SuperAdmin',
}

/**
 * Employee status in the system
 */
export enum EmployeeStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  OnLeave = 'OnLeave',
  Terminated = 'Terminated',
}

/**
 * Work modes for attendance check-in
 */
export enum WorkMode {
  Office = 'Office',
  Remote = 'Remote',
  CustomerSite = 'CustomerSite',
  FieldVisit = 'FieldVisit',
  Travel = 'Travel',
}

/**
 * Types of attendance events
 */
export enum AttendanceEventType {
  CheckIn = 'CheckIn',
  CheckOut = 'CheckOut',
}

/**
 * Types of break segments
 */
export enum BreakType {
  Break = 'Break',
  Lunch = 'Lunch',
}

/**
 * Verification status for attendance events
 * Tracks how check-in was verified (geofence, QR, device)
 */
export enum VerificationStatus {
  None = 'None',
  GeofencePassed = 'GeofencePassed',
  GeofenceFailed = 'GeofenceFailed',
  QRPassed = 'QRPassed',
  QRFailed = 'QRFailed',
  DeviceVerified = 'DeviceVerified',
}

/**
 * Leave request status workflow
 */
export enum LeaveRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
}

/**
 * Standard leave types (configurable by SuperAdmin)
 */
export enum LeaveType {
  Sick = 'Sick',
  Casual = 'Casual',
  Earned = 'Earned',
  WFH = 'WFH',
  CompOff = 'CompOff',
  LOP = 'LOP',
  FloatingHoliday = 'FloatingHoliday',
  Bereavement = 'Bereavement',
  Maternity = 'Maternity',
  Paternity = 'Paternity',
  Custom = 'Custom',
}

/**
 * User presence status for availability display
 */
export enum PresenceStatus {
  Online = 'Online',
  Away = 'Away',
  Offline = 'Offline',
  Busy = 'Busy',
}

/**
 * Chat thread types
 */
export enum ChatThreadType {
  Direct = 'Direct',
  Group = 'Group',
  Project = 'Project',
}

/**
 * Chat message types
 */
export enum ChatMessageType {
  Text = 'Text',
  VoiceNote = 'VoiceNote',
  File = 'File',
  System = 'System',
}

/**
 * Anomaly event status workflow
 */
export enum AnomalyStatus {
  Open = 'Open',
  Acknowledged = 'Acknowledged',
  Resolved = 'Resolved',
  Dismissed = 'Dismissed',
}

/**
 * Anomaly severity levels
 */
export enum AnomalySeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/**
 * Types of anomalies detected by the rules engine
 */
export enum AnomalyType {
  RepeatedLateCheckIn = 'RepeatedLateCheckIn',
  MissingCheckOut = 'MissingCheckOut',
  ExcessiveBreak = 'ExcessiveBreak',
  OvertimeSpike = 'OvertimeSpike',
  TimesheetMismatch = 'TimesheetMismatch',
  GeofenceFailure = 'GeofenceFailure',
  UnusualPattern = 'UnusualPattern',
}

/**
 * Audit log action types
 */
export enum AuditAction {
  // Auth actions
  Login = 'Login',
  Logout = 'Logout',
  PasswordReset = 'PasswordReset',
  DeviceVerified = 'DeviceVerified',

  // User management
  UserCreated = 'UserCreated',
  UserUpdated = 'UserUpdated',
  UserDeleted = 'UserDeleted',
  RoleChanged = 'RoleChanged',

  // Attendance actions
  AttendanceCheckIn = 'AttendanceCheckIn',
  AttendanceCheckOut = 'AttendanceCheckOut',
  AttendanceOverride = 'AttendanceOverride',
  BreakStarted = 'BreakStarted',
  BreakEnded = 'BreakEnded',

  // Leave actions
  LeaveRequested = 'LeaveRequested',
  LeaveApproved = 'LeaveApproved',
  LeaveRejected = 'LeaveRejected',
  LeaveCancelled = 'LeaveCancelled',

  // Timesheet actions
  TimesheetCreated = 'TimesheetCreated',
  TimesheetUpdated = 'TimesheetUpdated',
  TimesheetDeleted = 'TimesheetDeleted',

  // Policy actions
  PolicyUpdated = 'PolicyUpdated',
  HolidayCalendarUpdated = 'HolidayCalendarUpdated',
  GeofenceUpdated = 'GeofenceUpdated',
  AnomalyRuleUpdated = 'AnomalyRuleUpdated',

  // Anomaly actions
  AnomalyAcknowledged = 'AnomalyAcknowledged',
  AnomalyResolved = 'AnomalyResolved',
  AnomalyDismissed = 'AnomalyDismissed',
}

/**
 * Entity types for audit logging
 */
export enum EntityType {
  User = 'User',
  EmployeeProfile = 'EmployeeProfile',
  Project = 'Project',
  Task = 'Task',
  AttendanceDay = 'AttendanceDay',
  AttendanceEvent = 'AttendanceEvent',
  BreakSegment = 'BreakSegment',
  TimesheetEntry = 'TimesheetEntry',
  LeaveRequest = 'LeaveRequest',
  LeavePolicy = 'LeavePolicy',
  ChatThread = 'ChatThread',
  ChatMessage = 'ChatMessage',
  AnomalyEvent = 'AnomalyEvent',
  AnomalyRule = 'AnomalyRule',
  OfficeLocation = 'OfficeLocation',
  GeofencePolicy = 'GeofencePolicy',
  HolidayCalendar = 'HolidayCalendar',
}

/**
 * Timesheet entry status
 */
export enum TimesheetStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Approved = 'Approved',
  Rejected = 'Rejected',
}
