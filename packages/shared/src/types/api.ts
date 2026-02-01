/**
 * API Request/Response Types for Satcom Workforce Application
 *
 * These types define the contract between frontend and backend,
 * ensuring type safety across the API boundary.
 */

import {
  UserRole,
  WorkMode,
  BreakType,
  LeaveRequestStatus,
  AnomalyStatus,
  ChatMessageType,
} from './enums';
import {
  User,
  EmployeeProfile,
  AttendanceDay,
  AttendanceEvent,
  LeaveBalance,
  UserPresence,
  ChatMessage,
  Holiday,
} from './models';

// ============================================================================
// Common Types
// ============================================================================

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

/** API error structure */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated list request */
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Authentication
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  requiresOtp: boolean;
}

export interface VerifyOtpRequest {
  otpCode: string;
  deviceFingerprint: string;
  deviceName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// User Management
// ============================================================================

export interface CreateUserRequest {
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  profile: CreateEmployeeProfileRequest;
}

export interface CreateEmployeeProfileRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department?: string;
  timezone?: string;
  managerId?: string;
  joinDate: string;
}

export interface UpdateUserRequest {
  email?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  designation?: string;
  department?: string;
  timezone?: string;
  managerId?: string;
}

// ============================================================================
// Attendance
// ============================================================================

export interface CheckInRequest {
  workMode: WorkMode;
  latitude?: number;
  longitude?: number;
  deviceFingerprint?: string;
  notes?: string;
}

export interface CheckInResponse {
  event: AttendanceEvent;
  attendanceDay: AttendanceDay;
}

export interface CheckOutRequest {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface StartBreakRequest {
  type: BreakType;
}

export interface EndBreakRequest {
  breakId: string;
}

export interface AttendanceOverrideRequest {
  attendanceEventId: string;
  timestamp?: string;
  workMode?: WorkMode;
  reason: string;
}

export interface GetAttendanceRequest extends PaginatedRequest {
  userId?: string;
  startDate: string;
  endDate: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
}

// ============================================================================
// Timesheets
// ============================================================================

export interface CreateTimesheetEntryRequest {
  date: string;
  projectId: string;
  taskId: string;
  minutes: number;
  notes?: string;
}

export interface UpdateTimesheetEntryRequest {
  projectId?: string;
  taskId?: string;
  minutes?: number;
  notes?: string;
}

export interface GetTimesheetRequest extends PaginatedRequest {
  userId?: string;
  projectId?: string;
  startDate: string;
  endDate: string;
}

export interface TimesheetSummary {
  totalMinutes: number;
  byProject: { projectId: string; projectName: string; minutes: number }[];
  byTask: { taskId: string; taskName: string; minutes: number }[];
  byDate: { date: string; minutes: number }[];
}

export interface UploadAttachmentRequest {
  timesheetEntryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadAttachmentResponse {
  uploadUrl: string;
  attachmentId: string;
}

// ============================================================================
// Leave Management
// ============================================================================

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ApproveLeaveRequest {
  leaveRequestId: string;
}

export interface RejectLeaveRequest {
  leaveRequestId: string;
  reason: string;
}

export interface GetLeaveRequestsParams extends PaginatedRequest {
  userId?: string;
  status?: LeaveRequestStatus;
  startDate?: string;
  endDate?: string;
}

export interface LeaveBalanceResponse {
  balances: LeaveBalance[];
  holidays: Holiday[];
}

// ============================================================================
// Presence & Availability
// ============================================================================

export interface PresenceHeartbeat {
  currentProjectId?: string;
  currentTaskId?: string;
}

export interface AvailabilityListResponse {
  users: (UserPresence & {
    profile: Pick<EmployeeProfile, 'firstName' | 'lastName' | 'designation' | 'avatarUrl'>;
  })[];
}

// ============================================================================
// Chat & Messaging
// ============================================================================

export interface CreateDirectThreadRequest {
  userId: string;
}

export interface CreateGroupThreadRequest {
  name: string;
  memberIds: string[];
  projectId?: string;
}

export interface SendMessageRequest {
  threadId: string;
  type: ChatMessageType;
  content?: string;
}

export interface SendVoiceNoteRequest {
  threadId: string;
  fileName: string;
  durationSeconds: number;
}

export interface SendVoiceNoteResponse {
  uploadUrl: string;
  messageId: string;
}

export interface TriggerEmailRequest {
  threadId: string;
  messageIds?: string[];
  recipients: string[];
  subject?: string;
}

export interface GetMessagesRequest extends PaginatedRequest {
  threadId: string;
  before?: string;
}

export interface GetThreadsRequest extends PaginatedRequest {
  type?: string;
}

// ============================================================================
// Anomaly Detection
// ============================================================================

export interface GetAnomaliesRequest extends PaginatedRequest {
  userId?: string;
  status?: AnomalyStatus;
  type?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface AcknowledgeAnomalyRequest {
  anomalyId: string;
  notes?: string;
}

export interface ResolveAnomalyRequest {
  anomalyId: string;
  notes: string;
}

export interface DismissAnomalyRequest {
  anomalyId: string;
  reason: string;
}

export interface AnomalySummary {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
}

// ============================================================================
// Admin & Policies
// ============================================================================

export interface UpdateWorkPolicyRequest {
  standardWorkHours?: number;
  maxWorkHours?: number;
  overtimeThresholdMinutes?: number;
  breakDurationMinutes?: number;
  lunchDurationMinutes?: number;
  graceMinutesLate?: number;
  requireTimesheetNotes?: boolean;
}

export interface UpdateGeofencePolicyRequest {
  isEnabled?: boolean;
  requireGeofenceForOffice?: boolean;
  allowBypassWithReason?: boolean;
}

export interface CreateOfficeLocationRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface UpdateRetentionPolicyRequest {
  chatRetentionDays?: number;
  attachmentRetentionDays?: number;
  anomalyRetentionDays?: number;
  auditLogRetentionDays?: number;
}

// ============================================================================
// Audit Logs
// ============================================================================

export interface GetAuditLogsRequest extends PaginatedRequest {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Dashboard
// ============================================================================

export interface DashboardSummary {
  onlineCount: number;
  checkedInCount: number;
  onLeaveCount: number;
  openAnomalies: number;
  pendingLeaveRequests: number;
  todayAttendanceRate: number;
  workModeBreakdown: { mode: WorkMode; count: number }[];
}

export interface ProjectTimeSummary {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  userBreakdown: { userId: string; userName: string; minutes: number }[];
}

// ============================================================================
// WebSocket Events
// ============================================================================

export enum SocketEvent {
  // Presence events
  PresenceUpdate = 'presence:update',
  PresenceHeartbeat = 'presence:heartbeat',
  UserOnline = 'user:online',
  UserOffline = 'user:offline',

  // Chat events
  NewMessage = 'chat:message',
  MessageEdited = 'chat:edited',
  MessageDeleted = 'chat:deleted',
  TypingStart = 'chat:typing:start',
  TypingStop = 'chat:typing:stop',
  ThreadUpdated = 'chat:thread:updated',

  // Attendance events
  CheckInEvent = 'attendance:checkin',
  CheckOutEvent = 'attendance:checkout',
  BreakEvent = 'attendance:break',

  // Anomaly events
  NewAnomaly = 'anomaly:new',
  AnomalyUpdated = 'anomaly:updated',

  // Notification events
  Notification = 'notification',
}

export interface SocketPresenceUpdate {
  userId: string;
  status: string;
  lastSeenAt: string;
  workMode?: WorkMode;
}

export interface SocketChatMessage {
  threadId: string;
  message: ChatMessage;
  senderName: string;
}

export interface SocketTyping {
  threadId: string;
  userId: string;
  userName: string;
}

export interface SocketNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
