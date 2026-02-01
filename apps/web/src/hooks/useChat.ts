/**
 * useChat Hook
 *
 * Manages chat connection, conversation fetching, and message loading.
 * Auto-connects to chat WebSocket on mount with valid token.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useChatStore, Conversation, ChatMessage } from '@/store/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1';

interface UseChatOptions {
  autoConnect?: boolean;
}

interface UserSearchResult {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
}

export function useChat(options: UseChatOptions = {}) {
  const { autoConnect = true } = options;
  const { accessToken, user } = useAuthStore();
  const isAuthenticated = !!user;
  const {
    socket,
    isConnected,
    connectionError,
    conversations,
    activeConversationId,
    isLoadingConversations,
    isLoadingMessages,
    connect,
    disconnect,
    setConversations,
    setActiveConversation,
    addConversation,
    setMessages,
    prependMessages,
    updateMessage,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    setLoadingConversations,
    setLoadingMessages,
    joinThread,
  } = useChatStore();

  const hasConnected = useRef(false);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && accessToken && isAuthenticated && !hasConnected.current) {
      hasConnected.current = true;
      connect(accessToken);
    }

    return () => {
      // Don't disconnect on unmount - let store manage lifecycle
    };
  }, [autoConnect, accessToken, isAuthenticated, connect]);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    if (!accessToken) return;

    setLoadingConversations(true);
    try {
      const response = await fetch(`${API_URL}/chat/threads`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const { data } = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('[useChat] Failed to fetch conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [accessToken, setConversations, setLoadingConversations]);

  // Fetch messages for a thread
  const fetchMessages = useCallback(
    async (threadId: string, cursor?: string) => {
      if (!accessToken) return;

      setLoadingMessages(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', '50');

        const response = await fetch(
          `${API_URL}/chat/threads/${threadId}/messages?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const { data } = await response.json();

        if (cursor) {
          // Prepend older messages
          prependMessages(threadId, data.messages, data.hasMore);
        } else {
          // Initial load
          setMessages(threadId, data.messages, data.hasMore);
        }

        return data;
      } catch (error) {
        console.error('[useChat] Failed to fetch messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    },
    [accessToken, setMessages, prependMessages, setLoadingMessages]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(
    async (threadId: string) => {
      const messages = useChatStore.getState().messages.get(threadId);
      if (!messages || messages.length === 0) return;

      const oldestMessage = messages[0];
      await fetchMessages(threadId, oldestMessage.id);
    },
    [fetchMessages]
  );

  // Create direct message thread
  const createDirectThread = useCallback(
    async (userId: string): Promise<Conversation | null> => {
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_URL}/chat/threads/direct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to create thread');
        }

        const { data } = await response.json();
        addConversation(data);
        joinThread(data.id);
        return data;
      } catch (error) {
        console.error('[useChat] Failed to create direct thread:', error);
        return null;
      }
    },
    [accessToken, addConversation, joinThread]
  );

  // Create group thread
  const createGroupThread = useCallback(
    async (name: string, memberIds: string[]): Promise<Conversation | null> => {
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_URL}/chat/threads/group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name, memberIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to create group thread');
        }

        const { data } = await response.json();
        addConversation(data);
        joinThread(data.id);
        return data;
      } catch (error) {
        console.error('[useChat] Failed to create group thread:', error);
        return null;
      }
    },
    [accessToken, addConversation, joinThread]
  );

  // Search users for new conversation
  const searchUsers = useCallback(
    async (query: string): Promise<UserSearchResult[]> => {
      if (!accessToken) return [];

      try {
        const response = await fetch(
          `${API_URL}/chat/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to search users');
        }

        const { data } = await response.json();
        return data;
      } catch (error) {
        console.error('[useChat] Failed to search users:', error);
        return [];
      }
    },
    [accessToken]
  );

  // Edit message via REST
  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<ChatMessage | null> => {
      console.log('[useChat] editMessage called', { messageId, content, API_URL, hasToken: !!accessToken });
      if (!accessToken) {
        console.log('[useChat] No access token');
        return null;
      }

      try {
        const url = `${API_URL}/chat/messages/${messageId}`;
        console.log('[useChat] Fetching:', url);
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        });

        console.log('[useChat] Response status:', response.status);
        if (!response.ok) {
          const error = await response.json();
          console.log('[useChat] Error response:', error);
          throw new Error(error.message || 'Failed to edit message');
        }

        const { data } = await response.json();
        console.log('[useChat] Edit response data:', data);
        // Update the message in the store
        if (data && data.threadId) {
          updateMessage(data.threadId, messageId, {
            content: data.content,
            isEdited: true,
            editedAt: data.updatedAt,
          });
        }
        return data;
      } catch (error) {
        console.error('[useChat] Failed to edit message:', error);
        throw error;
      }
    },
    [accessToken, updateMessage]
  );

  // Delete message via REST
  const deleteMessage = useCallback(
    async (messageId: string): Promise<ChatMessage | null> => {
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete message');
        }

        const { data } = await response.json();
        // Update the message in the store to show as deleted
        if (data && data.threadId) {
          updateMessage(data.threadId, messageId, {
            deletedAt: data.deletedAt || new Date().toISOString(),
            content: null,
          });
        }
        return data;
      } catch (error) {
        console.error('[useChat] Failed to delete message:', error);
        throw error;
      }
    },
    [accessToken, updateMessage]
  );

  // Fetch conversations on mount
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchConversations();
    }
  }, [isAuthenticated, accessToken, fetchConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId && accessToken) {
      // Check if messages already loaded
      const existingMessages = useChatStore.getState().messages.get(activeConversationId);
      if (!existingMessages || existingMessages.length === 0) {
        fetchMessages(activeConversationId);
      }
    }
  }, [activeConversationId, accessToken, fetchMessages]);

  return {
    // Connection state
    isConnected,
    connectionError,

    // Data
    conversations,
    activeConversationId,
    isLoadingConversations,
    isLoadingMessages,

    // Actions
    connect: () => accessToken && connect(accessToken),
    disconnect,
    setActiveConversation,
    fetchConversations,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,

    // Thread management
    createDirectThread,
    createGroupThread,
    searchUsers,

    // Message operations
    editMessage,
    deleteMessage,
  };
}

export default useChat;
