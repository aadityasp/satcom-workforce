'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useChatStore, ChatMessage, Conversation } from '@/store/chat';
import { useChat } from '@/hooks';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Loader2 } from 'lucide-react';

interface MessageThreadProps {
  conversation: Conversation;
}

export function MessageThread({ conversation }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadMoreMessages, isLoadingMessages, editMessage, deleteMessage } = useChat({ autoConnect: false });

  const messages = useChatStore((state) => state.messages.get(conversation.id) || []);
  const hasMore = useChatStore((state) => state.hasMoreMessages.get(conversation.id) ?? true);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Group consecutive messages from same sender
  const groupedMessages = messages.reduce<{ message: ChatMessage; isGrouped: boolean; showAvatar: boolean }[]>(
    (acc, msg, index) => {
      const prevMsg = messages[index - 1];
      const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;
      const nextMsg = messages[index + 1];
      const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId;

      acc.push({ message: msg, isGrouped, showAvatar });
      return acc;
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMessages && hasMore) {
      loadMoreMessages(conversation.id);
    }
  }, [conversation.id, loadMoreMessages, isLoadingMessages, hasMore]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto flex flex-col"
    >
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMessages}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            {isLoadingMessages && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Load older messages
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1">
        {groupedMessages.map(({ message, isGrouped, showAvatar }) => (
          <MessageBubble
            key={message.id}
            message={message}
            showAvatar={showAvatar}
            isGrouped={isGrouped}
            onEdit={async (messageId, content) => {
              await editMessage(messageId, content);
            }}
            onDelete={async (messageId) => {
              await deleteMessage(messageId);
            }}
          />
        ))}
      </div>

      {/* Typing indicator */}
      <TypingIndicator threadId={conversation.id} members={conversation.members} />

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
