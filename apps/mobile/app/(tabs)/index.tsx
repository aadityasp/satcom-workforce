/**
 * Home Tab (Dashboard)
 *
 * Main dashboard showing attendance status, quick actions,
 * and overview cards for the logged-in user.
 * Uses real attendance data from API with location capture.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  FileText,
  Calendar,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/auth';
import { useTotalUnreadCount } from '../../src/store/chat';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';
import { useAttendance, useLocation, useRecentActivity } from '../../src/hooks';
import type { WorkMode, BreakType, CheckOutSummary } from '../../src/hooks/useAttendance';
import type { ActivityItem } from '../../src/hooks/useRecentActivity';
import { AttendanceCard, CheckInModal } from '../../src/components/attendance';
import { format, isToday, isYesterday } from 'date-fns';
import { UserRole } from '@satcom/shared';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const unreadCount = useTotalUnreadCount();

  // SuperAdmin and HR do not have check-in functionality
  const userRole = user?.role as UserRole | undefined;
  const showCheckIn = userRole !== UserRole.SuperAdmin && userRole !== UserRole.HR;

  // Real attendance data from API
  const {
    attendance,
    isLoading,
    isActionLoading,
    error,
    refresh,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
    clearError,
  } = useAttendance();

  // Location hook for GPS capture
  const { getCurrentPosition } = useLocation();

  // Recent activity data
  const {
    activities,
    isLoading: isLoadingActivity,
    refresh: refreshActivity,
  } = useRecentActivity();

  /**
   * Format activity timestamp for display
   */
  const formatActivityTime = (date: Date): string => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  /**
   * Get color for activity type
   */
  const getActivityColor = (color: ActivityItem['color']): string => {
    switch (color) {
      case 'success':
        return colors.semantic.success.main;
      case 'warning':
        return colors.semantic.warning.main;
      case 'error':
        return colors.semantic.error.main;
      case 'info':
      default:
        return colors.blue[600];
    }
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

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
    await Promise.all([refresh(), refreshActivity()]);
  };

  /**
   * Handle check-in with location capture
   */
  const handleCheckIn = async (workMode: WorkMode) => {
    const coords = await getCurrentPosition();
    const success = await checkIn(workMode, coords?.latitude, coords?.longitude);
    if (success) {
      setShowCheckInModal(false);
    }
  };

  /**
   * Handle check-out with location capture
   */
  const handleCheckOut = async () => {
    const coords = await getCurrentPosition();
    const summary: CheckOutSummary | null = await checkOut(coords?.latitude, coords?.longitude);

    if (summary) {
      const hours = Math.floor(summary.workedMinutes / 60);
      const mins = summary.workedMinutes % 60;
      const breakHours = Math.floor(summary.breakMinutes / 60);
      const breakMins = summary.breakMinutes % 60;

      Alert.alert(
        'Checked Out',
        `Work Summary:\n\nWorked: ${hours}h ${mins}m\nBreaks: ${breakHours}h ${breakMins}m${
          summary.overtime > 0 ? `\nOvertime: ${Math.floor(summary.overtime / 60)}h ${summary.overtime % 60}m` : ''
        }`,
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Handle start break
   */
  const handleBreak = async (type: BreakType) => {
    await startBreak(type);
  };

  /**
   * Handle end break
   */
  const handleEndBreak = async () => {
    await endBreak();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading && !isActionLoading} onRefresh={onRefresh} />
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

      {/* Attendance Card - only for Manager/Employee roles */}
      {showCheckIn && (
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <AttendanceCard
            attendance={attendance}
            isLoading={isLoading}
            isActionLoading={isActionLoading}
            onCheckIn={() => setShowCheckInModal(true)}
            onCheckOut={handleCheckOut}
            onBreak={handleBreak}
            onEndBreak={handleEndBreak}
          />
        </Animated.View>
      )}

      {/* Check-in Modal */}
      {showCheckIn && (
        <CheckInModal
          visible={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          onCheckIn={handleCheckIn}
          isLoading={isActionLoading}
        />
      )}

      {/* Quick Actions Grid */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        style={styles.actionsGrid}
      >
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/timesheet')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.blue[100] }]}>
            <FileText size={20} color={colors.blue[600]} />
          </View>
          <Text style={styles.actionTitle}>Timesheets</Text>
          <Text style={styles.actionSubtitle}>Log time</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/leave')}>
          <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
            <Calendar size={20} color="#9333EA" />
          </View>
          <Text style={styles.actionTitle}>Leave</Text>
          <Text style={[styles.actionSubtitle, { color: colors.silver[500] }]}>Request</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/team')}>
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <Users size={20} color="#16A34A" />
          </View>
          <Text style={styles.actionTitle}>Team</Text>
          <Text style={[styles.actionSubtitle, { color: '#16A34A' }]}>
            View status
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            try {
              router.push('/chat');
            } catch (err) {
              Alert.alert('Navigation Error', String(err));
            }
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FED7AA' }]}>
            <MessageSquare size={20} color="#EA580C" />
          </View>
          <Text style={styles.actionTitle}>Messages</Text>
          <Text style={[styles.actionSubtitle, { color: unreadCount > 0 ? colors.semantic.error.main : colors.silver[500] }]}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'No unread'}
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
          {isLoadingActivity ? (
            <Text style={styles.activityItemTime}>Loading...</Text>
          ) : activities.length === 0 ? (
            <Text style={styles.activityItemTime}>No recent activity</Text>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: getActivityColor(activity.color) }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityItemTitle}>{activity.title}</Text>
                  <Text style={styles.activityItemTime}>{formatActivityTime(activity.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[4],
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
    color: colors.semantic.warning.main,
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
