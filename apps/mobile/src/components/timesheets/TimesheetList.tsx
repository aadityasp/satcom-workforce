/**
 * TimesheetList Component
 *
 * Displays a list of timesheet entries with pull-to-refresh support.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Clock, FileText, Folder } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';
import type { TimesheetEntry } from '../../hooks/useTimesheets';

/**
 * Props for TimesheetList
 */
interface TimesheetListProps {
  entries: TimesheetEntry[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

/**
 * Format minutes as hours and minutes display
 * e.g., 150 -> "2h 30m"
 */
function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format relative time
 * e.g., "2 hours ago"
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Individual entry card component
 */
function EntryCard({ entry }: { entry: TimesheetEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {/* Project and Task */}
        <View style={styles.projectInfo}>
          <View style={styles.projectRow}>
            <Folder size={16} color={colors.blue[600]} />
            <Text style={styles.projectName}>{entry.project.name}</Text>
          </View>
          {entry.task && (
            <View style={styles.taskRow}>
              <FileText size={14} color={colors.silver[400]} />
              <Text style={styles.taskName}>{entry.task.name}</Text>
            </View>
          )}
        </View>

        {/* Duration */}
        <View style={styles.durationContainer}>
          <Clock size={16} color={colors.silver[400]} />
          <Text style={styles.durationText}>{formatDuration(entry.minutes)}</Text>
        </View>
      </View>

      {/* Notes (if any) */}
      {entry.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {entry.notes}
        </Text>
      )}

      {/* Created time */}
      <Text style={styles.createdAt}>
        {formatRelativeTime(entry.createdAt)}
      </Text>
    </View>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Clock size={48} color={colors.silver[300]} />
      <Text style={styles.emptyTitle}>No entries for this date</Text>
      <Text style={styles.emptySubtitle}>
        Tap &quot;Add New&quot; to log your work time
      </Text>
    </View>
  );
}

/**
 * TimesheetList Component
 */
export function TimesheetList({ entries, isLoading, onRefresh }: TimesheetListProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Show loading indicator for initial load only
  if (isLoading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
        <Text style={styles.loadingText}>Loading entries...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EntryCard entry={item} />}
      contentContainerStyle={[
        styles.listContent,
        entries.length === 0 && styles.emptyListContent,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.blue[600]]}
          tintColor={colors.blue[600]}
        />
      }
      ListEmptyComponent={<EmptyState />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  projectName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  taskName: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[600],
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.silver[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  durationText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  notes: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[600],
    marginTop: spacing[3],
    fontStyle: 'italic',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  createdAt: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
    marginTop: spacing[2],
  },
  separator: {
    height: spacing[3],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[2],
    textAlign: 'center',
  },
});

export default TimesheetList;
