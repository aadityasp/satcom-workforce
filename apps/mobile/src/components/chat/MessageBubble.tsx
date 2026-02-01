/**
 * MessageBubble Component
 *
 * Individual message display with support for sent/received styling,
 * delivery status indicators, and deleted message placeholders.
 *
 * @module components/chat/MessageBubble
 */

import { View, Text, StyleSheet, Image } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { ChatMessage, MessageStatus } from '../../store/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showSender?: boolean;
}

/**
 * Format timestamp for message display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Message status indicator component
 */
function StatusIndicator({ status }: { status?: MessageStatus }) {
  if (!status) return null;

  switch (status) {
    case 'sending':
      return (
        <View style={styles.statusIcon}>
          <View style={styles.sendingDot} />
        </View>
      );
    case 'sent':
      return (
        <View style={[styles.statusIcon, { opacity: 0.7 }]}>
          <Check size={12} color="#FFFFFF" />
        </View>
      );
    case 'delivered':
      return (
        <View style={[styles.statusIcon, { opacity: 0.7 }]}>
          <CheckCheck size={12} color="#FFFFFF" />
        </View>
      );
    case 'read':
      return (
        <View style={styles.statusIcon}>
          <CheckCheck size={12} color={colors.blue[200]} />
        </View>
      );
    case 'failed':
      return (
        <View style={styles.statusIcon}>
          <Text style={styles.failedText}>!</Text>
        </View>
      );
    default:
      return null;
  }
}

export function MessageBubble({
  message,
  isOwnMessage,
  showSender = false,
}: MessageBubbleProps) {
  const isDeleted = !!message.deletedAt;

  const senderName = message.sender?.profile
    ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`
    : message.sender?.email || 'Unknown';

  const initials = message.sender?.profile
    ? `${message.sender.profile.firstName?.[0] || ''}${message.sender.profile.lastName?.[0] || ''}`
    : '?';

  const avatarUrl = message.sender?.profile?.avatarUrl;

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.containerOwn : styles.containerOther,
      ]}
    >
      {/* Avatar for other's messages */}
      {!isOwnMessage && (
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.bubbleWrapper, isOwnMessage && styles.bubbleWrapperOwn]}>
        {/* Sender name for group chats */}
        {showSender && !isOwnMessage && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
            isDeleted && styles.bubbleDeleted,
          ]}
        >
          {isDeleted ? (
            <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther, styles.deletedText]}>
              This message was deleted
            </Text>
          ) : (
            <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther]}>
              {message.content}
            </Text>
          )}
        </View>

        {/* Meta: time, edited, status */}
        <View style={[styles.metaRow, isOwnMessage && styles.metaRowOwn]}>
          <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
          {message.isEdited && !isDeleted && (
            <Text style={styles.editedText}>(edited)</Text>
          )}
          {isOwnMessage && !isDeleted && (
            <StatusIndicator status={message.clientStatus} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    marginVertical: spacing[1],
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing[2],
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.blue[600],
  },
  bubbleWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  bubbleWrapperOwn: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    marginBottom: spacing[0.5],
    marginLeft: spacing[2],
  },
  bubble: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    maxWidth: '100%',
  },
  bubbleOwn: {
    backgroundColor: colors.blue[600],
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.silver[100],
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleDeleted: {
    opacity: 0.6,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.4,
  },
  textOwn: {
    color: '#FFFFFF',
  },
  textOther: {
    color: colors.navy[900],
  },
  deletedText: {
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[0.5],
    paddingHorizontal: spacing[1],
    gap: spacing[1],
  },
  metaRowOwn: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
  },
  editedText: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[400],
  },
  statusIcon: {
    marginLeft: spacing[0.5],
  },
  sendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.silver[300],
  },
  failedText: {
    fontSize: typography.fontSize.xs,
    fontWeight: 'bold',
    color: colors.semantic.error.main,
  },
});

export default MessageBubble;
