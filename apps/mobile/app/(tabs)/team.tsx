/**
 * Team Tab
 *
 * Displays team members with their current availability status.
 * Allows quick messaging and viewing team member details.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, MessageSquare, MapPin } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';
import type { PresenceStatus } from '@satcom/shared';

/**
 * Team member interface
 */
interface TeamMember {
  id: string;
  name: string;
  designation: string;
  status: PresenceStatus;
  workMode?: string;
  avatarInitials: string;
}

// Mock data
const MOCK_TEAM: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    designation: 'Senior Developer',
    status: 'Online',
    workMode: 'Office',
    avatarInitials: 'SJ',
  },
  {
    id: '2',
    name: 'Mike Chen',
    designation: 'Product Manager',
    status: 'Online',
    workMode: 'Remote',
    avatarInitials: 'MC',
  },
  {
    id: '3',
    name: 'Emily Davis',
    designation: 'UX Designer',
    status: 'Away',
    workMode: 'Office',
    avatarInitials: 'ED',
  },
  {
    id: '4',
    name: 'Alex Kumar',
    designation: 'Backend Developer',
    status: 'Online',
    workMode: 'Customer Site',
    avatarInitials: 'AK',
  },
  {
    id: '5',
    name: 'Jessica Lee',
    designation: 'QA Engineer',
    status: 'Offline',
    avatarInitials: 'JL',
  },
  {
    id: '6',
    name: 'David Wilson',
    designation: 'DevOps Engineer',
    status: 'Online',
    workMode: 'Remote',
    avatarInitials: 'DW',
  },
  {
    id: '7',
    name: 'Maria Garcia',
    designation: 'HR Manager',
    status: 'Away',
    workMode: 'Office',
    avatarInitials: 'MG',
  },
  {
    id: '8',
    name: 'James Brown',
    designation: 'Tech Lead',
    status: 'Online',
    workMode: 'Office',
    avatarInitials: 'JB',
  },
];

export default function TeamScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [team] = useState<TeamMember[]>(MOCK_TEAM);

  /**
   * Get status color
   */
  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case 'Online':
        return colors.semantic.success;
      case 'Away':
        return colors.semantic.warning;
      case 'Offline':
        return colors.silver[400];
    }
  };

  /**
   * Filter team by search query
   */
  const filteredTeam = team.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Group team by status
   */
  const onlineMembers = filteredTeam.filter((m) => m.status === 'Online');
  const awayMembers = filteredTeam.filter((m) => m.status === 'Away');
  const offlineMembers = filteredTeam.filter((m) => m.status === 'Offline');

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  /**
   * Render team member card
   */
  const renderMember = (member: TeamMember, index: number) => (
    <Animated.View
      key={member.id}
      entering={FadeInDown.duration(300).delay(index * 50)}
    >
      <TouchableOpacity style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.avatarInitials}</Text>
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(member.status) },
              ]}
            />
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberDesignation}>{member.designation}</Text>
            {member.workMode && (
              <View style={styles.workModeContainer}>
                <MapPin size={12} color={colors.silver[400]} />
                <Text style={styles.workModeText}>{member.workMode}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => {
            // Navigate to chat
          }}
        >
          <MessageSquare size={20} color={colors.blue[600]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.silver[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team members..."
          placeholderTextColor={colors.silver[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.semantic.success }]} />
          <Text style={styles.summaryText}>{onlineMembers.length} Online</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.semantic.warning }]} />
          <Text style={styles.summaryText}>{awayMembers.length} Away</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.silver[400] }]} />
          <Text style={styles.summaryText}>{offlineMembers.length} Offline</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Online</Text>
            {onlineMembers.map((member, idx) => renderMember(member, idx))}
          </View>
        )}

        {/* Away Members */}
        {awayMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Away</Text>
            {awayMembers.map((member, idx) => renderMember(member, idx + onlineMembers.length))}
          </View>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offline</Text>
            {offlineMembers.map((member, idx) =>
              renderMember(member, idx + onlineMembers.length + awayMembers.length)
            )}
          </View>
        )}

        {/* Empty State */}
        {filteredTeam.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No team members found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: spacing[4],
    marginBottom: 0,
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
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[600],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.silver[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.silver[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[700],
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberDetails: {
    marginLeft: spacing[3],
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  memberDesignation: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: 2,
  },
  workModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  workModeText: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
  },
});
