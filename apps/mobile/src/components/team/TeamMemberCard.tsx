/**
 * TeamMemberCard Component
 *
 * Displays a team member with their presence status,
 * current activity, and status message.
 *
 * @module components/team/TeamMemberCard
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, MapPin, Briefcase } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';
import type { TeamMember, PresenceStatus } from '../../store/presence';

interface TeamMemberCardProps {
  member: TeamMember;
  onMessage?: (member: TeamMember) => void;
}

/**
 * Get status color based on presence status
 */
function getStatusColor(status: PresenceStatus): string {
  switch (status) {
    case 'Online':
      return colors.semantic.success.main;
    case 'Away':
      return colors.semantic.warning.main;
    case 'Busy':
      return colors.semantic.error.main;
    case 'Offline':
    default:
      return colors.silver[400];
  }
}

/**
 * Get initials from name
 */
function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '??';
}

/**
 * Format last seen time
 */
function formatLastSeen(status: PresenceStatus, lastSeenAt: string): string {
  if (status === 'Online') {
    return 'Online';
  }

  if (status === 'Away') {
    try {
      const ago = formatDistanceToNow(new Date(lastSeenAt), { addSuffix: false });
      return `Away - ${ago} ago`;
    } catch {
      return 'Away';
    }
  }

  return 'Offline';
}

/**
 * TeamMemberCard displays a team member with their presence status
 */
export function TeamMemberCard({ member, onMessage }: TeamMemberCardProps) {
  const initials = getInitials(member.profile?.firstName, member.profile?.lastName);
  const statusColor = getStatusColor(member.status);
  const lastSeenText = formatLastSeen(member.status, member.lastSeenAt);
  const fullName = member.profile
    ? `${member.profile.firstName} ${member.profile.lastName}`
    : 'Unknown User';

  return (
    <View style={styles.card}>
      <View style={styles.memberInfo}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {member.profile?.avatarUrl ? (
            <Image
              source={{ uri: member.profile.avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {/* Status dot */}
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>

          {member.profile?.designation && (
            <Text style={styles.designation} numberOfLines={1}>
              {member.profile.designation}
            </Text>
          )}

          <View style={styles.statusRow}>
            <View
              style={[styles.statusBadge, { borderColor: statusColor }]}
            >
              <View
                style={[styles.statusIndicator, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {lastSeenText}
              </Text>
            </View>
          </View>

          {/* Current activity */}
          {member.currentProject && (
            <View style={styles.activityRow}>
              <Briefcase size={12} color={colors.silver[400]} />
              <Text style={styles.activityText} numberOfLines={1}>
                {member.currentProject.name}
                {member.currentTask ? ` - ${member.currentTask.name}` : ''}
              </Text>
            </View>
          )}

          {/* Work mode */}
          {member.currentWorkMode && (
            <View style={styles.activityRow}>
              <MapPin size={12} color={colors.silver[400]} />
              <Text style={styles.activityText}>{member.currentWorkMode}</Text>
            </View>
          )}

          {/* Status message */}
          {member.statusMessage && (
            <Text style={styles.statusMessage} numberOfLines={2}>
              "{member.statusMessage}"
            </Text>
          )}
        </View>
      </View>

      {/* Message button */}
      {onMessage && (
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => onMessage(member)}
          accessibilityLabel={`Message ${fullName}`}
        >
          <MessageSquare size={20} color={colors.blue[600]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  memberInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
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
  details: {
    marginLeft: spacing[3],
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  designation: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[1],
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  activityText: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    flex: 1,
  },
  statusMessage: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
});

export default TeamMemberCard;
