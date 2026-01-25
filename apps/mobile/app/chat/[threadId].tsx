/**
 * Message Thread Screen
 *
 * Displays messages for a specific conversation with real-time updates,
 * message sending, and typing indicators.
 *
 * @module app/chat/[threadId]
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { colors, typography, spacing } from '../../src/theme';
import { useMessages } from '../../src/hooks';
import {
  useChatStore,
  useTypingUsers,
  useConversationMessages,
  useHasMoreMessages,
  ChatMessage,
} from '../../src/store/chat';
import {
  MessageBubble,
  ChatInput,
  TypingIndicator,
} from '../../src/components/chat';

export default function MessageThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Get store data
  const currentUserId = useChatStore((state) => state.currentUserId);
  const conversations = useChatStore((state) => state.conversations);
  const { startTyping, stopTyping, markAsRead } = useChatStore();

  // Get messages from store directly
  const messages = useConversationMessages(threadId || '');
  const hasMore = useHasMoreMessages(threadId || '');
  const typingUserIds = useTypingUsers(threadId || '');

  // Use the messages hook for loading
  const { isLoading, loadMore, sendMessage } = useMessages(threadId || '');

  // Find conversation for header and members
  const conversation = conversations.find((c) => c.id === threadId);

  // Set header title dynamically
  useEffect(() => {
    if (!conversation) return;

    let title = conversation.name || 'Chat';

    // For direct messages, show other person's name
    if (conversation.type === 'Direct' && currentUserId) {
      const otherMember = conversation.members.find(
        (m) => m.userId !== currentUserId
      );
      if (otherMember?.user?.profile) {
        title = `${otherMember.user.profile.firstName} ${otherMember.user.profile.lastName}`;
      } else if (otherMember?.user?.email) {
        title = otherMember.user.email;
      }
    }

    navigation.setOptions({ title });
  }, [conversation, currentUserId, navigation]);

  // Mark as read on mount and when receiving new messages
  useEffect(() => {
    if (threadId) {
      markAsRead(threadId);
    }
  }, [threadId, messages.length, markAsRead]);

  // Scroll to bottom on new message (only after initial load)
  useEffect(() => {
    if (messages.length > 0 && initialLoadDone) {
      // Check if the last message is from the current user (we just sent it)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId === currentUserId) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }
  }, [messages.length, currentUserId, initialLoadDone]);

  // Mark initial load complete
  useEffect(() => {
    if (messages.length > 0 && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [messages.length, initialLoadDone]);

  // Handle send message
  const handleSend = async (content: string) => {
    try {
      await sendMessage(content);
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (threadId) {
      startTyping(threadId);
    }
  }, [threadId, startTyping]);

  const handleTypingStop = useCallback(() => {
    if (threadId) {
      stopTyping(threadId);
    }
  }, [threadId, stopTyping]);

  // Handle load more (triggered when scrolling to top of inverted list)
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMore();
    }
  }, [isLoading, hasMore, loadMore]);

  // Render message item
  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isOwnMessage = item.senderId === currentUserId;

      // Show sender name for group chats (not for consecutive messages from same sender)
      // Note: in inverted list, index+1 is the previous message (shown above)
      const previousMessage = messages[index + 1];
      const showSender =
        conversation?.type !== 'Direct' &&
        !isOwnMessage &&
        (!previousMessage || previousMessage.senderId !== item.senderId);

      return (
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          showSender={showSender}
        />
      );
    },
    [currentUserId, conversation?.type, messages]
  );

  // Render list footer (load more indicator - at top of inverted list)
  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.blue[600]} />
        ) : (
          <Text style={styles.loadMoreText}>Load earlier messages</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Say hello!</Text>
      </View>
    );
  };

  if (!threadId) {
    return (
      <View style={styles.container}>
        <Text>Invalid thread</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()} // Reverse for inverted list
        keyExtractor={(item) => item.id || item.tempId || String(Math.random())}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messagesContent}
        ListHeaderComponent={
          conversation && typingUserIds.length > 0 ? (
            <TypingIndicator
              typingUserIds={typingUserIds}
              members={conversation.members}
            />
          ) : null
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        placeholder="Type a message..."
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    paddingVertical: spacing[2],
    flexGrow: 1,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginVertical: spacing[2],
  },
  loadMoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.blue[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
    transform: [{ scaleY: -1 }], // Flip back for inverted list
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '500',
    color: colors.navy[900],
  },
  emptySubtext: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    marginTop: spacing[1],
  },
});
