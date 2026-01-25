/**
 * TeamStatusFilter Component
 *
 * Horizontal pill/chip filter for filtering team members by status.
 *
 * @module components/team/TeamStatusFilter
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import type { PresenceStatus } from '../../store/presence';

interface StatusCounts {
  online: number;
  away: number;
  offline: number;
}

interface TeamStatusFilterProps {
  selected: PresenceStatus | null;
  onSelect: (status: PresenceStatus | null) => void;
  counts: StatusCounts;
}

interface FilterOption {
  key: PresenceStatus | null;
  label: string;
  count: number;
  color: string;
  activeColor: string;
  activeBg: string;
}

/**
 * TeamStatusFilter displays horizontal filter pills for status filtering
 */
export function TeamStatusFilter({ selected, onSelect, counts }: TeamStatusFilterProps) {
  const totalCount = counts.online + counts.away + counts.offline;

  const options: FilterOption[] = [
    {
      key: null,
      label: 'All',
      count: totalCount,
      color: colors.silver[600],
      activeColor: colors.navy[700],
      activeBg: colors.silver[200],
    },
    {
      key: 'Online',
      label: 'Online',
      count: counts.online,
      color: colors.semantic.success.main,
      activeColor: colors.semantic.success.dark,
      activeBg: colors.semantic.success.light,
    },
    {
      key: 'Away',
      label: 'Away',
      count: counts.away,
      color: colors.semantic.warning.main,
      activeColor: colors.semantic.warning.dark,
      activeBg: colors.semantic.warning.light,
    },
    {
      key: 'Offline',
      label: 'Offline',
      count: counts.offline,
      color: colors.silver[400],
      activeColor: colors.silver[600],
      activeBg: colors.silver[100],
    },
  ];

  const handlePress = (status: PresenceStatus | null) => {
    // Toggle selection - if already selected, deselect (return to All)
    if (selected === status) {
      onSelect(null);
    } else {
      onSelect(status);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const isSelected = selected === option.key;

        return (
          <TouchableOpacity
            key={option.key ?? 'all'}
            style={[
              styles.pill,
              isSelected
                ? { backgroundColor: option.activeBg, borderColor: option.activeColor }
                : { borderColor: option.color },
            ]}
            onPress={() => handlePress(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by ${option.label}, ${option.count} members`}
          >
            {/* Status dot for non-All options */}
            {option.key && (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isSelected ? option.activeColor : option.color },
                ]}
              />
            )}
            <Text
              style={[
                styles.label,
                { color: isSelected ? option.activeColor : option.color },
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.count,
                { color: isSelected ? option.activeColor : option.color },
              ]}
            >
              ({option.count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 50,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginRight: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  count: {
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    marginLeft: spacing[1],
  },
});

export default TeamStatusFilter;
