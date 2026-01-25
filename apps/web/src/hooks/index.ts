/**
 * Hooks Barrel Export
 */

export { useAttendance } from './useAttendance';
export type {
  AttendanceStatus,
  WorkMode,
  BreakType,
  AttendanceEvent,
  BreakSegment,
  CurrentBreak,
  WorkPolicy,
  AttendanceDay,
  CheckOutSummary,
} from './useAttendance';

export { useTimesheets } from './useTimesheets';
export type {
  Project,
  Task,
  Attachment,
  TimesheetEntry,
  CreateTimesheetDto,
  TimesheetSummary,
} from './useTimesheets';

export { useLocations } from './useLocations';
export type {
  OfficeLocation,
  CreateLocationInput,
  UpdateLocationInput,
} from './useLocations';

export { useCheckInLocations } from './useCheckInLocations';
export type { CheckInLocation } from './useCheckInLocations';

export { usePresence } from './usePresence';

export { useDebounce } from './useDebounce';

export { useChat } from './useChat';
export {
  useChatStore,
  useTypingUsers,
  useConversationMessages,
  useHasMoreMessages,
  useTotalUnreadCount,
  useActiveConversation,
} from '@/store/chat';
export type {
  ChatMessage,
  Conversation,
  MessageStatus,
  MessageRecipientStatus,
} from '@/store/chat';

export { useManagerDashboard, useHRDashboard } from './useReports';
export type {
  AttendanceSummary,
  TimesheetSummary,
  TeamMemberStatus,
  ManagerDashboard,
  HRDashboard,
} from './useReports';
