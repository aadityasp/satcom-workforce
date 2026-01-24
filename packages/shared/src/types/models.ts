/**
 * Shared Type Definitions for Satcom Workforce Application
 *
 * These types represent the core data models used across the application.
 * They mirror the Prisma schema but are framework-agnostic.
 */

import {
  UserRole,
  EmployeeStatus,
  WorkMode,
  AttendanceEventType,
  BreakType,
  VerificationStatus,
  LeaveRequestStatus,
  LeaveType,
  PresenceStatus,
  ChatThreadType,
  ChatMessageType,
  AnomalyStatus,
  AnomalySeverity,
  AnomalyType,
  AuditAction,
  EntityType,
  TimesheetStatus,
} from './enums';

// ============================================================================
// Base Types
// ============================================================================

/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User extends BaseEntity {
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  profile?: EmployeeProfile;
}

export interface EmployeeProfile extends BaseEntity {
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department?: string;
  timezone: string;
  status: EmployeeStatus;
  managerId?: string;
  avatarUrl?: string;
  joinDate: string;
}

export interface DeviceRecord extends BaseEntity {
  userId: string;
  fingerprint: string;
  deviceName: string;
  platform: string;
  isVerified: boolean;
  lastUsedAt: string;
}

// ============================================================================
// Projects & Tasks
// ============================================================================

export interface Project extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  managerId?: string;
}

export interface Task extends BaseEntity {
  projectId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

// ============================================================================
// Attendance
// ============================================================================

export interface AttendanceDay extends BaseEntity {
  userId: string;
  date: string; // YYYY-MM-DD
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalLunchMinutes: number;
  overtimeMinutes: number;
  isComplete: boolean;
  events: AttendanceEvent[];
  breaks: BreakSegment[];
}

export interface AttendanceEvent extends BaseEntity {
  attendanceDayId: string;
  type: AttendanceEventType;
  timestamp: string;
  workMode: WorkMode;
  latitude?: number;
  longitude?: number;
  verificationStatus: VerificationStatus;
  deviceFingerprint?: string;
  notes?: string;
  isOverride: boolean;
  overrideReason?: string;
  overrideBy?: string;
}

export interface BreakSegment extends BaseEntity {
  attendanceDayId: string;
  type: BreakType;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
}

// ============================================================================
// Timesheets
// ============================================================================

export interface TimesheetEntry extends BaseEntity {
  userId: string;
  date: string;
  projectId: string;
  taskId: string;
  minutes: number;
  notes?: string;
  status: TimesheetStatus;
  attachments: TimesheetAttachment[];
}

export interface TimesheetAttachment extends BaseEntity {
  timesheetEntryId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

// ============================================================================
// Leave Management
// ============================================================================

export interface LeaveTypeConfig extends BaseEntity {
  name: string;
  code: LeaveType;
  description?: string;
  defaultDays: number;
  carryForward: boolean;
  maxCarryForward: number;
  requiresApproval: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveBalance extends BaseEntity {
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveRequest extends BaseEntity {
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface Holiday extends BaseEntity {
  name: string;
  date: string;
  isOptional: boolean;
  year: number;
}

// ============================================================================
// Presence & Availability
// ============================================================================

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
  currentWorkMode?: WorkMode;
  currentProjectId?: string;
  currentTaskId?: string;
}

// ============================================================================
// Chat & Messaging
// ============================================================================

export interface ChatThread extends BaseEntity {
  type: ChatThreadType;
  name?: string;
  projectId?: string;
  members: ChatMember[];
  lastMessageAt?: string;
  lastMessage?: ChatMessage;
}

export interface ChatMember extends BaseEntity {
  threadId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
  unreadCount: number;
}

export interface ChatMessage extends BaseEntity {
  threadId: string;
  senderId: string;
  type: ChatMessageType;
  content?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  durationSeconds?: number;
  isEdited: boolean;
  editedAt?: string;
}

// ============================================================================
// Geofence
// ============================================================================

export interface OfficeLocation extends BaseEntity {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface GeofencePolicy extends BaseEntity {
  isEnabled: boolean;
  requireGeofenceForOffice: boolean;
  allowBypassWithReason: boolean;
  officeLocations: string[]; // OfficeLocation IDs
}

// ============================================================================
// Anomaly Detection
// ============================================================================

export interface AnomalyRule extends BaseEntity {
  type: AnomalyType;
  name: string;
  description: string;
  isEnabled: boolean;
  severity: AnomalySeverity;
  threshold: number;
  windowDays: number;
  config: Record<string, unknown>;
}

export interface AnomalyEvent extends BaseEntity {
  userId: string;
  ruleId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  description: string;
  data: Record<string, unknown>;
  detectedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditLog extends BaseEntity {
  actorId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Policies & Settings
// ============================================================================

export interface WorkPolicy extends BaseEntity {
  standardWorkHours: number;
  maxWorkHours: number;
  overtimeThresholdMinutes: number;
  maxOvertimeMinutes: number;
  breakDurationMinutes: number;
  lunchDurationMinutes: number;
  graceMinutesLate: number;
  graceMinutesEarly: number;
  requireTimesheetNotes: boolean;
  maxTimesheetMinutesPerDay: number;
}

export interface RetentionPolicy extends BaseEntity {
  chatRetentionDays: number;
  attachmentRetentionDays: number;
  anomalyRetentionDays: number;
  auditLogRetentionDays: number;
}
