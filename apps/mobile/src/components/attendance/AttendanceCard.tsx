/**
 * AttendanceCard Component
 *
 * Displays current attendance status with action buttons for
 * check-in, check-out, and break management.
 *
 * @module components/attendance/AttendanceCard
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Clock,
  Coffee,
  LogOut,
  MapPin,
  Utensils,
  PlayCircle,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';
import type { AttendanceDay, BreakType } from '../../hooks/useAttendance';

/**
 * AttendanceCard props
 */
interface AttendanceCardProps {
  /** Current attendance data */
  attendance: AttendanceDay | null;
  /** Loading state for initial data fetch */
  isLoading: boolean;
  /** Loading state for actions */
  isActionLoading: boolean;
  /** Check-in button handler */
  onCheckIn: () => void;
  /** Check-out button handler */
  onCheckOut: () => void;
  /** Start break button handler */
  onBreak: (type: BreakType) => void;
  /** End break button handler */
  onEndBreak: () => void;
}

/**
 * Format minutes to hours and minutes string
 */
function formatDuration(minutes: number): string {
  if (minutes < 0) minutes = 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format time string (HH:mm) to display format (h:mm AM/PM)
 */
function formatTime(timeString?: string): string {
  if (!timeString) return '--:--';
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeString;
  }
}

/**
 * AttendanceCard component
 *
 * Shows attendance status and provides action buttons based on current state.
 *
 * @example
 * ```tsx
 * <AttendanceCard
 *   attendance={attendanceData}
 *   isLoading={isLoading}
 *   isActionLoading={isActionLoading}
 *   onCheckIn={handleCheckIn}
 *   onCheckOut={handleCheckOut}
 *   onBreak={handleBreak}
 *   onEndBreak={handleEndBreak}
 * />
 * ```
 */
export function AttendanceCard({
  attendance,
  isLoading,
  isActionLoading,
  onCheckIn,
  onCheckOut,
  onBreak,
  onEndBreak,
}: AttendanceCardProps) {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue[600]} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      </View>
    );
  }

  const status = attendance?.status || 'not_checked_in';
  const isCheckedIn = status === 'working' || status === 'on_break';
  const isOnBreak = status === 'on_break';

  // Calculate remaining time (8 hour target = 480 minutes)
  const totalWorkMinutes = attendance?.totalWorkMinutes || 0;
  const totalBreakMinutes = attendance?.totalBreakMinutes || 0;
  const remainingMinutes = Math.max(0, 480 - totalWorkMinutes);

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.header}>
        <View style={styles.statusInfo}>
          <View
            style={[
              styles.statusIcon,
              isCheckedIn && styles.statusIconActive,
              isOnBreak && styles.statusIconBreak,
            ]}
          >
            {isOnBreak ? (
              <Coffee size={28} color={colors.semantic.warning.main} />
            ) : (
              <Clock
                size={28}
                color={isCheckedIn ? colors.semantic.success.main : colors.silver[400]}
              />
            )}
          </View>
          <View>
            <Text style={styles.statusLabel}>Today's Status</Text>
            <Text style={styles.statusText}>
              {status === 'not_checked_in' && 'Not checked in'}
              {status === 'working' && `Checked in at ${formatTime(attendance?.checkInTime)}`}
              {status === 'on_break' && `On ${attendance?.currentBreak?.type || 'break'}`}
              {status === 'checked_out' && `Checked out at ${formatTime(attendance?.checkOutTime)}`}
            </Text>
            {isCheckedIn && attendance?.workMode && (
              <Text style={styles.workMode}>{attendance.workMode}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {status === 'not_checked_in' && (
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={onCheckIn}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MapPin size={18} color="#FFFFFF" />
                <Text style={styles.checkInButtonText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'working' && (
          <>
            <TouchableOpacity
              style={styles.breakButton}
              onPress={() => onBreak('Break')}
              disabled={isActionLoading}
            >
              <Coffee size={18} color={colors.navy[700]} />
              <Text style={styles.breakButtonText}>Break</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lunchButton}
              onPress={() => onBreak('Lunch')}
              disabled={isActionLoading}
            >
              <Utensils size={18} color={colors.navy[700]} />
              <Text style={styles.lunchButtonText}>Lunch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkOutButton}
              onPress={onCheckOut}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <LogOut size={18} color="#FFFFFF" />
                  <Text style={styles.checkOutButtonText}>Out</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {status === 'on_break' && (
          <TouchableOpacity
            style={styles.endBreakButton}
            onPress={onEndBreak}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <PlayCircle size={18} color="#FFFFFF" />
                <Text style={styles.endBreakButtonText}>End Break</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'checked_out' && (
          <TouchableOpacity
            style={styles.checkInAgainButton}
            onPress={onCheckIn}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MapPin size={18} color="#FFFFFF" />
                <Text style={styles.checkInButtonText}>Check In Again</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Time Summary (show when checked in or checked out) */}
      {(isCheckedIn || status === 'checked_out') && (
        <View style={styles.timeSummary}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Work</Text>
            <Text style={styles.timeValue}>{formatDuration(totalWorkMinutes)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Break</Text>
            <Text style={styles.timeValue}>{formatDuration(totalBreakMinutes)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>
              {status === 'checked_out' ? 'Overtime' : 'Remaining'}
            </Text>
            <Text style={[styles.timeValue, styles.timeValueHighlight]}>
              {status === 'checked_out'
                ? formatDuration(attendance?.overtimeMinutes || 0)
                : formatDuration(remainingMinutes)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.silver[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconActive: {
    backgroundColor: colors.semantic.success.light,
  },
  statusIconBreak: {
    backgroundColor: colors.semantic.warning.light,
  },
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
  },
  statusText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  workMode: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  checkInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[600],
  },
  checkInButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[100],
  },
  breakButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.navy[700],
  },
  lunchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[100],
  },
  lunchButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.navy[700],
  },
  checkOutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.semantic.error.main,
  },
  checkOutButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  endBreakButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.semantic.success.main,
  },
  endBreakButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkInAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[600],
  },
  timeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.silver[100],
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.silver[200],
  },
  timeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
    marginTop: spacing[1],
  },
  timeValueHighlight: {
    color: colors.blue[600],
  },
});
