/**
 * Home Tab (Dashboard)
 *
 * Main dashboard showing attendance status, quick actions,
 * and overview cards for the logged-in user.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Clock,
  Coffee,
  LogOut,
  MapPin,
  FileText,
  Calendar,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/auth';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';

/**
 * Attendance status interface
 */
interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  workMode?: string;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mock attendance data
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: true,
    checkInTime: '09:15',
    workMode: 'Office',
    totalWorkMinutes: 245,
    totalBreakMinutes: 30,
  });

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Format minutes to hours and minutes
   */
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  /**
   * Get greeting based on time of day
   */
  const getGreeting = (): string => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.profile?.firstName}!
        </Text>
        <Text style={styles.date}>
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Animated.View>

      {/* Attendance Card */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(200)}
        style={styles.attendanceCard}
      >
        <View style={styles.attendanceHeader}>
          <View style={styles.attendanceInfo}>
            <View
              style={[
                styles.attendanceIcon,
                attendance.isCheckedIn && styles.attendanceIconActive,
              ]}
            >
              <Clock
                size={28}
                color={attendance.isCheckedIn ? colors.semantic.success : colors.silver[400]}
              />
            </View>
            <View>
              <Text style={styles.attendanceLabel}>Today's Status</Text>
              <Text style={styles.attendanceStatus}>
                {attendance.isCheckedIn
                  ? `Checked in at ${attendance.checkInTime}`
                  : 'Not checked in'}
              </Text>
              {attendance.isCheckedIn && (
                <Text style={styles.workMode}>{attendance.workMode}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.attendanceActions}>
          {attendance.isCheckedIn ? (
            <>
              <TouchableOpacity style={styles.secondaryButton}>
                <Coffee size={18} color={colors.navy[700]} />
                <Text style={styles.secondaryButtonText}>Break</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkOutButton}>
                <LogOut size={18} color="#FFFFFF" />
                <Text style={styles.checkOutButtonText}>Check Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.checkInButton}>
              <MapPin size={18} color="#FFFFFF" />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Time Summary */}
        {attendance.isCheckedIn && (
          <View style={styles.timeSummary}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Work</Text>
              <Text style={styles.timeValue}>
                {formatDuration(attendance.totalWorkMinutes)}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Break</Text>
              <Text style={styles.timeValue}>
                {formatDuration(attendance.totalBreakMinutes)}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Remaining</Text>
              <Text style={[styles.timeValue, styles.timeValueHighlight]}>
                {formatDuration(480 - attendance.totalWorkMinutes)}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Quick Actions Grid */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        style={styles.actionsGrid}
      >
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: colors.blue[100] }]}>
            <FileText size={20} color={colors.blue[600]} />
          </View>
          <Text style={styles.actionTitle}>Timesheets</Text>
          <Text style={styles.actionSubtitle}>3 pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
            <Calendar size={20} color="#9333EA" />
          </View>
          <Text style={styles.actionTitle}>Leave</Text>
          <Text style={styles.actionSubtitle}>2 pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <Users size={20} color="#16A34A" />
          </View>
          <Text style={styles.actionTitle}>Team</Text>
          <Text style={[styles.actionSubtitle, { color: colors.semantic.success }]}>
            12 online
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#FED7AA' }]}>
            <MessageSquare size={20} color="#EA580C" />
          </View>
          <Text style={styles.actionTitle}>Messages</Text>
          <Text style={[styles.actionSubtitle, { color: colors.semantic.error }]}>
            5 unread
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Recent Activity */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(400)}
        style={styles.activityCard}
      >
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight size={16} color={colors.blue[600]} />
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.semantic.success }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityItemTitle}>Checked in at Office</Text>
              <Text style={styles.activityItemTime}>Today, 9:15 AM</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.blue[600] }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityItemTitle}>Submitted timesheet for Project Alpha</Text>
              <Text style={styles.activityItemTime}>Yesterday, 5:30 PM</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.semantic.warning }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityItemTitle}>Late check-in flagged</Text>
              <Text style={styles.activityItemTime}>Jan 17, 9:45 AM</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  greeting: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.navy[900],
  },
  date: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    marginTop: spacing[1],
    marginBottom: spacing[6],
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  attendanceIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.silver[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceIconActive: {
    backgroundColor: colors.semantic.success + '20',
  },
  attendanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
  },
  attendanceStatus: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  workMode: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: 2,
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[100],
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[700],
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
  checkOutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.semantic.error,
  },
  checkOutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  actionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.warning,
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  activityTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.blue[600],
  },
  activityList: {
    gap: spacing[4],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.navy[900],
  },
  activityItemTime: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    marginTop: 2,
  },
});
