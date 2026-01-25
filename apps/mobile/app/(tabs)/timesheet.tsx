/**
 * Timesheet Tab
 *
 * Displays timesheet entries and allows users to log time
 * against projects and tasks.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, List, PlusCircle, Clock } from 'lucide-react-native';
import { format, addDays, subDays, isToday } from 'date-fns';
import { colors, typography, borderRadius, spacing } from '../../src/theme';
import { useProjects } from '../../src/hooks/useProjects';
import { useTimesheets, useCreateTimesheet, CreateTimesheetInput } from '../../src/hooks/useTimesheets';
import { TimesheetForm } from '../../src/components/timesheets/TimesheetForm';
import { TimesheetList } from '../../src/components/timesheets/TimesheetList';

/**
 * Tab mode - either viewing entries or adding new
 */
type TabMode = 'entries' | 'add';

/**
 * Format time as "Xh Ym"
 */
function formatTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0h';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate remaining time to 8 hours
 */
function calculateRemaining(hours: number, minutes: number): { hours: number; minutes: number } {
  const totalWorked = hours * 60 + minutes;
  const target = 8 * 60; // 8 hours in minutes
  const remaining = Math.max(0, target - totalWorked);
  return {
    hours: Math.floor(remaining / 60),
    minutes: remaining % 60,
  };
}

export default function TimesheetScreen() {
  // Date state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<TabMode>('entries');

  // Data hooks
  const { projects } = useProjects();
  const { entries, dayTotal, isLoading, error, refresh } = useTimesheets(selectedDate);
  const { create, isCreating, error: createError, clearError } = useCreateTimesheet();

  // Clear create error when switching tabs
  useEffect(() => {
    if (activeTab === 'add') {
      clearError();
    }
  }, [activeTab, clearError]);

  // Date navigation
  const goToPreviousDay = useCallback(() => {
    const current = new Date(selectedDate);
    setSelectedDate(format(subDays(current, 1), 'yyyy-MM-dd'));
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const current = new Date(selectedDate);
    setSelectedDate(format(addDays(current, 1), 'yyyy-MM-dd'));
  }, [selectedDate]);

  // Format display date
  const displayDate = format(new Date(selectedDate), 'EEE, MMM d');
  const isTodaySelected = isToday(new Date(selectedDate));

  // Calculate remaining time
  const remaining = calculateRemaining(dayTotal.hours, dayTotal.minutes);

  // Handle form submission
  const handleSubmit = useCallback(async (input: CreateTimesheetInput) => {
    const success = await create(input);
    if (success) {
      setActiveTab('entries');
      await refresh();
    }
  }, [create, refresh]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Date Selector */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.dateSelector}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.dateArrow}>
          <ChevronLeft size={24} color={colors.navy[900]} />
        </TouchableOpacity>
        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>{displayDate}</Text>
          {isTodaySelected && <Text style={styles.todayBadge}>Today</Text>}
        </View>
        <TouchableOpacity onPress={goToNextDay} style={styles.dateArrow}>
          <ChevronRight size={24} color={colors.navy[900]} />
        </TouchableOpacity>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeIn.duration(200).delay(50)} style={styles.summaryCard}>
        <View style={styles.summarySection}>
          <Clock size={20} color={colors.blue[600]} />
          <View style={styles.summaryTextGroup}>
            <Text style={styles.summaryLabel}>Logged</Text>
            <Text style={styles.summaryValue}>
              {formatTime(dayTotal.hours, dayTotal.minutes)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summarySection}>
          <Clock size={20} color={colors.silver[400]} />
          <View style={styles.summaryTextGroup}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, styles.remainingValue]}>
              {formatTime(remaining.hours, remaining.minutes)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Tab Toggle */}
      <Animated.View entering={FadeIn.duration(200).delay(100)} style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'entries' && styles.tabActive]}
          onPress={() => setActiveTab('entries')}
        >
          <List size={18} color={activeTab === 'entries' ? colors.blue[600] : colors.silver[500]} />
          <Text style={[styles.tabText, activeTab === 'entries' && styles.tabTextActive]}>
            Entries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <PlusCircle size={18} color={activeTab === 'add' ? colors.blue[600] : colors.silver[500]} />
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            Add New
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Content Area */}
      <View style={styles.content}>
        {activeTab === 'entries' ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.listContainer}>
            <TimesheetList
              entries={entries}
              isLoading={isLoading}
              onRefresh={refresh}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.formContainer}>
            <TimesheetForm
              projects={projects}
              onSubmit={handleSubmit}
              isSubmitting={isCreating}
              initialDate={selectedDate}
              error={createError}
            />
          </Animated.View>
        )}
      </View>

      {/* Error display for loading errors */}
      {error && activeTab === 'entries' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  dateArrow: {
    padding: spacing[2],
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  todayBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.blue[600],
    backgroundColor: colors.blue[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  summarySection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  summaryTextGroup: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.navy[900],
    marginTop: 2,
  },
  remainingValue: {
    color: colors.silver[500],
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.silver[200],
    marginHorizontal: spacing[4],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: spacing[2],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[50],
  },
  tabActive: {
    backgroundColor: colors.blue[50],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.silver[500],
  },
  tabTextActive: {
    color: colors.blue[600],
  },
  content: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.semantic.error.light,
    padding: spacing[3],
    margin: spacing[4],
    borderRadius: borderRadius.md,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[4],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error.main,
    flex: 1,
  },
  retryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.blue[600],
    marginLeft: spacing[2],
  },
});
