/**
 * Team Tab
 *
 * Displays team members with real-time presence status updates.
 * Features WebSocket connection for live updates and status filtering.
 *
 * @module app/(tabs)/team
 */

import { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';
import { usePresence } from '../../src/hooks/usePresence';
import { TeamMemberCard } from '../../src/components/team/TeamMemberCard';
import { TeamStatusFilter } from '../../src/components/team/TeamStatusFilter';
import type { TeamMember } from '../../src/store/presence';
import { useState } from 'react';

/**
 * Team screen with real-time presence updates
 */
export default function TeamScreen() {
  const {
    teamMembers,
    isLoading,
    isConnected,
    statusFilter,
    setStatusFilter,
    refresh,
  } = usePresence();

  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Calculate counts for each status
   */
  const counts = useMemo(() => {
    // Count from all members (pre-filter)
    const allMembers = teamMembers;
    return {
      online: allMembers.filter((m) => m.status === 'Online').length,
      away: allMembers.filter((m) => m.status === 'Away').length,
      offline: allMembers.filter((m) => m.status === 'Offline').length,
    };
  }, [teamMembers]);

  /**
   * Filter team by search query (on top of status filter)
   */
  const filteredTeam = useMemo(() => {
    if (!searchQuery.trim()) {
      return teamMembers;
    }
    const query = searchQuery.toLowerCase();
    return teamMembers.filter((member) => {
      const fullName = member.profile
        ? `${member.profile.firstName} ${member.profile.lastName}`.toLowerCase()
        : '';
      const designation = member.profile?.designation?.toLowerCase() || '';
      return fullName.includes(query) || designation.includes(query);
    });
  }, [teamMembers, searchQuery]);

  /**
   * Render individual team member card with animation
   */
  const renderItem = useCallback(
    ({ item, index }: { item: TeamMember; index: number }) => (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
        <TeamMemberCard
          member={item}
          onMessage={(member) => {
            // TODO: Navigate to chat with member
            console.log('Message:', member.userId);
          }}
        />
      </Animated.View>
    ),
    []
  );

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: TeamMember) => item.userId, []);

  /**
   * Empty state component
   */
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color={colors.blue[600]} />
            <Text style={styles.emptyStateText}>Loading team...</Text>
          </>
        ) : (
          <>
            <Text style={styles.emptyStateTitle}>No team members found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try a different search term'
                : statusFilter
                  ? `No team members are currently ${statusFilter.toLowerCase()}`
                  : 'Your team list is empty'}
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading, searchQuery, statusFilter]
  );

  return (
    <View style={styles.container}>
      {/* Connection Status Indicator */}
      <View style={styles.connectionBar}>
        <View
          style={[
            styles.connectionDot,
            { backgroundColor: isConnected ? colors.semantic.success.main : colors.semantic.error.main },
          ]}
        />
        <Text style={styles.connectionText}>
          {isConnected ? 'Live' : 'Reconnecting...'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.silver[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team members..."
          placeholderTextColor={colors.silver[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Status Filter */}
      <TeamStatusFilter
        selected={statusFilter}
        onSelect={setStatusFilter}
        counts={counts}
      />

      {/* Team List */}
      <FlatList
        data={filteredTeam}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            colors={[colors.blue[600]]}
            tintColor={colors.blue[600]}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[1],
  },
  connectionText: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[2],
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[800],
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    textAlign: 'center',
  },
});
