/**
 * Timesheet Tab
 *
 * Displays timesheet entries and allows users to log time
 * against projects and tasks.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Clock, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';

/**
 * Timesheet entry interface
 */
interface TimesheetEntry {
  id: string;
  project: string;
  task: string;
  hours: number;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
}

// Mock data
const MOCK_ENTRIES: TimesheetEntry[] = [
  {
    id: '1',
    project: 'Project Alpha',
    task: 'Frontend Development',
    hours: 6.5,
    date: '2026-01-19',
    status: 'draft',
    notes: 'Implemented dashboard components',
  },
  {
    id: '2',
    project: 'Project Alpha',
    task: 'Code Review',
    hours: 1.5,
    date: '2026-01-19',
    status: 'submitted',
  },
  {
    id: '3',
    project: 'Project Beta',
    task: 'API Integration',
    hours: 4,
    date: '2026-01-18',
    status: 'approved',
  },
  {
    id: '4',
    project: 'Internal',
    task: 'Team Meeting',
    hours: 1,
    date: '2026-01-18',
    status: 'approved',
  },
];

export default function TimesheetScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [entries] = useState<TimesheetEntry[]>(MOCK_ENTRIES);

  /**
   * Get status color
   */
  const getStatusColor = (status: TimesheetEntry['status']) => {
    switch (status) {
      case 'draft':
        return colors.silver[500];
      case 'submitted':
        return colors.blue[600];
      case 'approved':
        return colors.semantic.success;
      case 'rejected':
        return colors.semantic.error;
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: TimesheetEntry['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={14} color={colors.semantic.success} />;
      case 'rejected':
        return <AlertCircle size={14} color={colors.semantic.error} />;
      default:
        return null;
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  /**
   * Calculate total hours for today
   */
  const todayTotal = entries
    .filter((e) => e.date === '2026-01-19')
    .reduce((sum, e) => sum + e.hours, 0);

  /**
   * Calculate weekly total
   */
  const weeklyTotal = entries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.summaryCard}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{todayTotal}h</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryValue}>{weeklyTotal}h</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Target</Text>
          <Text style={styles.summaryValue}>40h</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Entries */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <Text style={styles.sectionTitle}>Today</Text>
          {entries
            .filter((e) => e.date === '2026-01-19')
            .map((entry) => (
              <TouchableOpacity key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.projectName}>{entry.project}</Text>
                    <Text style={styles.taskName}>{entry.task}</Text>
                  </View>
                  <View style={styles.entryRight}>
                    <View style={styles.hoursContainer}>
                      <Clock size={14} color={colors.silver[400]} />
                      <Text style={styles.hoursText}>{entry.hours}h</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      {getStatusIcon(entry.status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(entry.status) },
                        ]}
                      >
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
                {entry.notes && (
                  <Text style={styles.notes} numberOfLines={1}>
                    {entry.notes}
                  </Text>
                )}
                <ChevronRight
                  size={20}
                  color={colors.silver[300]}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
        </Animated.View>

        {/* Previous Entries */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text style={styles.sectionTitle}>Previous</Text>
          {entries
            .filter((e) => e.date !== '2026-01-19')
            .map((entry) => (
              <TouchableOpacity key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.projectName}>{entry.project}</Text>
                    <Text style={styles.taskName}>{entry.task}</Text>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <View style={styles.hoursContainer}>
                      <Clock size={14} color={colors.silver[400]} />
                      <Text style={styles.hoursText}>{entry.hours}h</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      {getStatusIcon(entry.status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(entry.status) },
                        ]}
                      >
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight
                  size={20}
                  color={colors.silver[300]}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
        </Animated.View>
      </ScrollView>

      {/* Add Entry FAB */}
      <TouchableOpacity style={styles.fab}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.silver[200],
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
    marginTop: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.silver[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  projectName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  taskName: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[600],
    marginTop: 2,
  },
  entryDate: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
    marginTop: spacing[1],
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  hoursText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  notes: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  chevron: {
    position: 'absolute',
    right: spacing[2],
    top: '50%',
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
