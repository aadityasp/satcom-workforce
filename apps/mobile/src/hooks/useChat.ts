/**
 * useChat Hook
 *
 * Manages chat connection, conversation fetching, and message loading.
 * Auto-connects to chat WebSocket on mount with valid token.
 *
 * @module hooks/useChat
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import {
  useChatStore,
  Conversation,
  ChatMessage,
} from '../store/chat';
import { API_URL } from '../lib/api';

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

/**
 * Main chat hook for connection and state management
 * Auto-connects to chat WebSocket on mount
 */
export function useChat(options: UseChatOptions = {}) {
  const { autoConnect = true } = options;
  const { accessToken, user } = useAuthStore();
  const isAuthenticated = !!user;
  const {
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
        const errorBody = await response.text();
        console.error('[useChat] Threads fetch error:', response.status, errorBody);
        throw new Error(`Failed: ${response.status}`);
      }

      const result = await response.json();
      setConversations(result.data || []);
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
      if (!accessToken) return null;

      try {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to edit message');
        }

        const { data } = await response.json();
        // Update the message in the store
        if (data && data.threadId) {
          updateMessage(data.threadId, messageId, {
            content: data.content,
            isEdited: true,
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

/**
 * Hook for conversation list with refresh capability
 */
export function useConversationList() {
  const { accessToken } = useAuthStore();
  const {
    conversations,
    isLoadingConversations,
    setConversations,
    setLoadingConversations,
    addConversation,
    joinThread,
  } = useChatStore();

  const refresh = useCallback(async () => {
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
      console.error('[useConversationList] Failed to refresh:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [accessToken, setConversations, setLoadingConversations]);

  const createConversation = useCallback(
    async (userIds: string[], name?: string): Promise<Conversation | null> => {
      if (!accessToken) return null;

      try {
        const endpoint = userIds.length === 1 ? '/chat/threads/direct' : '/chat/threads/group';
        const body =
          userIds.length === 1
            ? { userId: userIds[0] }
            : { name: name || 'Group', memberIds: userIds };

        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error('Failed to create conversation');
        }

        const { data } = await response.json();
        addConversation(data);
        joinThread(data.id);
        return data;
      } catch (error) {
        console.error('[useConversationList] Failed to create conversation:', error);
        return null;
      }
    },
    [accessToken, addConversation, joinThread]
  );

  return {
    conversations,
    isLoading: isLoadingConversations,
    refresh,
    createConversation,
  };
}

/**
 * Hook for messages in a specific thread
 */
export function useMessages(threadId: string) {
  const { accessToken } = useAuthStore();
  const {
    isLoadingMessages,
    setMessages,
    prependMessages,
    setLoadingMessages,
    sendMessage,
    markAsRead,
  } = useChatStore();

  // Get messages for this thread from store
  const messages = useChatStore((state) => state.messages.get(threadId) || []);
  const hasMore = useChatStore((state) => state.hasMoreMessages.get(threadId) ?? true);

  // Fetch initial messages
  useEffect(() => {
    if (!accessToken || !threadId) return;

    const existingMessages = useChatStore.getState().messages.get(threadId);
    if (existingMessages && existingMessages.length > 0) return;

    const fetchInitial = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(
          `${API_URL}/chat/threads/${threadId}/messages?limit=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch messages');

        const { data } = await response.json();
        setMessages(threadId, data.messages, data.hasMore);
      } catch (error) {
        console.error('[useMessages] Failed to fetch:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchInitial();
  }, [accessToken, threadId, setMessages, setLoadingMessages]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!accessToken || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    setLoadingMessages(true);
    try {
      const response = await fetch(
        `${API_URL}/chat/threads/${threadId}/messages?cursor=${oldestMessage.id}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load more');

      const { data } = await response.json();
      prependMessages(threadId, data.messages, data.hasMore);
    } catch (error) {
      console.error('[useMessages] Failed to load more:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken, threadId, hasMore, messages, prependMessages, setLoadingMessages]);

  // Send message wrapper
  const send = useCallback(
    async (content: string) => {
      await sendMessage(threadId, content);
    },
    [threadId, sendMessage]
  );

  // Mark as read wrapper
  const read = useCallback(() => {
    markAsRead(threadId);
  }, [threadId, markAsRead]);

  return {
    messages,
    isLoading: isLoadingMessages,
    hasMore,
    loadMore,
    sendMessage: send,
    markAsRead: read,
  };
}

export default useChat;
