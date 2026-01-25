/**
 * ConversationItem Component
 *
 * List item for displaying a conversation in the chat list.
 * Shows avatar, name, last message preview, timestamp, and unread badge.
 *
 * @module components/chat/ConversationItem
 */

import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { Conversation } from '../../store/chat';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

/**
 * Format timestamp to relative time (e.g., "2m ago", "Yesterday")
 */
function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationItem({
  conversation,
  currentUserId,
  onPress,
}: ConversationItemProps) {
  // For direct chats, show the other person's info
  const otherMember =
    conversation.type === 'Direct'
      ? conversation.members.find((m) => m.userId !== currentUserId)
      : null;

  const displayName =
    conversation.name ||
    (otherMember?.user?.profile
      ? `${otherMember.user.profile.firstName} ${otherMember.user.profile.lastName}`
      : otherMember?.user?.email) ||
    'Unknown';

  const initials = otherMember?.user?.profile
    ? `${otherMember.user.profile.firstName?.[0] || ''}${otherMember.user.profile.lastName?.[0] || ''}`
    : conversation.name?.[0]?.toUpperCase() || '?';

  const avatarUrl = otherMember?.user?.profile?.avatarUrl;

  const lastMessage = conversation.messages?.[0];
  const lastMessagePreview = lastMessage?.deletedAt
    ? 'Message deleted'
    : lastMessage?.content
    ? lastMessage.content.length > 35
      ? lastMessage.content.slice(0, 35) + '...'
      : lastMessage.content
    : 'No messages yet';

  const lastMessageTime = formatRelativeTime(conversation.lastMessageAt);
  const isGroup = conversation.type === 'Group' || conversation.type === 'Project';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, isGroup && styles.groupAvatar]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : isGroup ? (
          <Users size={20} color={colors.blue[600]} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.preview} numberOfLines={1}>
            {lastMessagePreview}
          </Text>
          <Text style={styles.time}>{lastMessageTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[100],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  groupAvatar: {
    backgroundColor: colors.silver[100],
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.blue[600],
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  name: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
    marginRight: spacing[2],
  },
  unreadBadge: {
    backgroundColor: colors.blue[600],
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing[1.5],
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginRight: spacing[2],
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
  },
});

export default ConversationItem;
