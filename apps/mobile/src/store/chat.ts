/**
 * Mobile Chat Store
 *
 * Manages real-time chat state using Zustand with Socket.IO integration.
 * Handles conversations, messages, typing indicators, and delivery/read status.
 * Includes mobile-specific reconnection handling for app foreground/background
 * transitions and network connectivity changes.
 *
 * @module store/chat
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Types matching web implementation
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageRecipientStatus {
  userId: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  type: 'Text' | 'File' | 'Image' | 'Voice' | 'Location';
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    } | null;
  };
  statuses?: MessageRecipientStatus[];
  // Client-side tracking
  tempId?: string;
  clientStatus?: MessageStatus;
}

export interface Conversation {
  id: string;
  type: 'Direct' | 'Group' | 'Project';
  name?: string | null;
  projectId?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  members: {
    userId: string;
    user: {
      id: string;
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
      } | null;
    };
  }[];
  messages?: ChatMessage[]; // Last message for preview
}

interface ChatState {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  currentUserId: string | null;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;

  // Messages (per conversation)
  messages: Map<string, ChatMessage[]>;
  hasMoreMessages: Map<string, boolean>;
  isLoadingMessages: boolean;

  // Typing indicators (threadId -> userIds)
  typingUsers: Map<string, Set<string>>;

  // Cleanup functions (mobile-specific)
  _cleanupFns: (() => void)[];

  // Actions - Connection
  connect: (token: string) => void;
  disconnect: () => void;

  // Actions - Conversations
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversationId: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateUnreadCount: (threadId: string, count: number) => void;

  // Actions - Messages
  setMessages: (threadId: string, messages: ChatMessage[], hasMore: boolean) => void;
  addMessage: (threadId: string, message: ChatMessage) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  prependMessages: (threadId: string, messages: ChatMessage[], hasMore: boolean) => void;

  // Actions - Socket operations
  sendMessage: (threadId: string, content: string, type?: string) => Promise<void>;
  markAsRead: (threadId: string) => void;
  startTyping: (threadId: string) => void;
  stopTyping: (threadId: string) => void;
  joinThread: (threadId: string) => void;

  // Actions - Loading states
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
}

// Use machine IP for simulator access - localhost doesn't work from iOS simulator
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.86.167:3003/api/v1';
// Socket.IO needs the base URL without /api/v1 path
const SOCKET_URL = API_URL.replace(/\/api\/v\d+$/, '');

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  socket: null,
  isConnected: false,
  connectionError: null,
  currentUserId: null,
  conversations: [],
  activeConversationId: null,
  isLoadingConversations: false,
  messages: new Map(),
  hasMoreMessages: new Map(),
  isLoadingMessages: false,
  typingUsers: new Map(),
  _cleanupFns: [],

  connect: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      return; // Already connected
    }

    // Disconnect existing socket if any
    existingSocket?.disconnect();

    // Clean up any existing subscriptions
    const cleanups = get()._cleanupFns;
    cleanups.forEach((fn) => fn());

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // More attempts for mobile
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Longer for cellular
      timeout: 20000, // Longer timeout for slow networks
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[Chat] Connected to server');
      set({ isConnected: true, connectionError: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('[Chat] Connection error:', error.message);
      set({ connectionError: error.message, isConnected: false });
    });

    // Message events - new message received
    socket.on('chat:message', (data: { threadId: string; message: ChatMessage; tempId?: string }) => {
      const { activeConversationId, currentUserId } = get();

      set((state) => {
        const threadMessages = state.messages.get(data.threadId) || [];

        // Check for duplicate (by tempId or id)
        const existingIndex = threadMessages.findIndex(
          (m) => m.id === data.message.id || (data.tempId && m.tempId === data.tempId)
        );

        let newMessages: ChatMessage[];
        if (existingIndex >= 0) {
          // Update existing (was optimistic)
          newMessages = [...threadMessages];
          newMessages[existingIndex] = { ...data.message, clientStatus: 'sent' };
        } else {
          // Add new
          newMessages = [...threadMessages, { ...data.message, clientStatus: 'sent' }];
        }

        // Update conversation preview
        const conversations = state.conversations.map((c) =>
          c.id === data.threadId
            ? {
                ...c,
                lastMessageAt: data.message.createdAt,
                messages: [data.message],
                // Only increment unread if not our message and not active conversation
                unreadCount:
                  data.message.senderId === currentUserId || c.id === activeConversationId
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c
        );

        // Sort conversations by lastMessageAt
        conversations.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });

        return {
          messages: new Map(state.messages).set(data.threadId, newMessages),
          conversations,
        };
      });

      // Auto-mark as delivered if we're the recipient and message is from someone else
      const { currentUserId: userId } = get();
      if (userId && data.message.senderId !== userId) {
        socket.emit('chat:delivered', {
          messageIds: [data.message.id],
        });
      }
    });

    // Delivery receipt (our sent message was delivered)
    socket.on(
      'chat:delivered',
      (data: { messageId: string; threadId: string; deliveredTo: string; deliveredAt: string }) => {
        set((state) => {
          const threadMessages = state.messages.get(data.threadId);
          if (!threadMessages) return state;

          const newMessages = threadMessages.map((m) => {
            if (m.id === data.messageId) {
              return { ...m, clientStatus: 'delivered' as MessageStatus };
            }
            return m;
          });

          return {
            messages: new Map(state.messages).set(data.threadId, newMessages),
          };
        });
      }
    );

    // Read receipt (our sent message was read)
    socket.on(
      'chat:read',
      (data: { messageId: string; threadId: string; readBy: string; readAt: string }) => {
        set((state) => {
          const threadMessages = state.messages.get(data.threadId);
          if (!threadMessages) return state;

          const newMessages = threadMessages.map((m) => {
            if (m.id === data.messageId) {
              return { ...m, clientStatus: 'read' as MessageStatus };
            }
            return m;
          });

          return {
            messages: new Map(state.messages).set(data.threadId, newMessages),
          };
        });
      }
    );

    // Message edited
    socket.on('chat:edited', (data: { threadId: string; message: ChatMessage }) => {
      set((state) => {
        const threadMessages = state.messages.get(data.threadId);
        if (!threadMessages) return state;

        const newMessages = threadMessages.map((m) =>
          m.id === data.message.id ? { ...m, ...data.message } : m
        );

        return {
          messages: new Map(state.messages).set(data.threadId, newMessages),
        };
      });
    });

    // Message deleted
    socket.on('chat:deleted', (data: { threadId: string; messageId: string }) => {
      set((state) => {
        const threadMessages = state.messages.get(data.threadId);
        if (!threadMessages) return state;

        const newMessages = threadMessages.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedAt: new Date().toISOString(), content: null, attachmentUrl: null }
            : m
        );

        return {
          messages: new Map(state.messages).set(data.threadId, newMessages),
        };
      });
    });

    // New thread created (we were added to a conversation)
    socket.on('chat:thread:created', (data: { thread: Conversation }) => {
      set((state) => ({
        conversations: [data.thread, ...state.conversations],
      }));
      // Join the new thread room
      socket.emit('chat:join', { threadId: data.thread.id });
    });

    // Typing indicators
    socket.on('chat:typing:start', (data: { threadId: string; userId: string }) => {
      set((state) => {
        const threadTyping = new Set(state.typingUsers.get(data.threadId) || []);
        threadTyping.add(data.userId);
        return {
          typingUsers: new Map(state.typingUsers).set(data.threadId, threadTyping),
        };
      });

      // Auto-clear after 5 seconds if no stop received
      setTimeout(() => {
        set((state) => {
          const threadTyping = new Set(state.typingUsers.get(data.threadId) || []);
          threadTyping.delete(data.userId);
          return {
            typingUsers: new Map(state.typingUsers).set(data.threadId, threadTyping),
          };
        });
      }, 5000);
    });

    socket.on('chat:typing:stop', (data: { threadId: string; userId: string }) => {
      set((state) => {
        const threadTyping = new Set(state.typingUsers.get(data.threadId) || []);
        threadTyping.delete(data.userId);
        return {
          typingUsers: new Map(state.typingUsers).set(data.threadId, threadTyping),
        };
      });
    });

    // Mobile-specific: Reconnect when app comes to foreground
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && !socket.connected) {
          console.log('[Chat] App foregrounded, reconnecting...');
          socket.connect();
        }
      }
    );

    // Mobile-specific: Reconnect when network restored
    const netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && !socket.connected) {
        console.log('[Chat] Network restored, reconnecting...');
        socket.connect();
      }
    });

    // Store cleanup functions
    const newCleanupFns = [
      () => appStateSubscription.remove(),
      () => netInfoUnsubscribe(),
    ];

    // Extract userId from token (simple JWT decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      set({ currentUserId: payload.sub });
    } catch {
      console.warn('[Chat] Could not decode token for userId');
    }

    set({ socket, _cleanupFns: newCleanupFns });
  },

  disconnect: () => {
    const { socket, _cleanupFns } = get();

    // Clean up mobile-specific subscriptions
    _cleanupFns.forEach((fn) => fn());

    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        messages: new Map(),
        typingUsers: new Map(),
        currentUserId: null,
        _cleanupFns: [],
      });
    }
  },

  // Conversation actions
  setConversations: (conversations: Conversation[]) => {
    set({ conversations });
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });

    // Mark as read when switching to conversation
    if (conversationId) {
      const { socket } = get();
      if (socket?.connected) {
        socket.emit('chat:mark-read', { threadId: conversationId });
      }

      // Reset unread count locally
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    }
  },

  addConversation: (conversation: Conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));

    // Join room
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('chat:join', { threadId: conversation.id });
    }
  },

  updateUnreadCount: (threadId: string, count: number) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === threadId ? { ...c, unreadCount: count } : c
      ),
    }));
  },

  // Message actions
  setMessages: (threadId: string, messages: ChatMessage[], hasMore: boolean) => {
    set((state) => ({
      messages: new Map(state.messages).set(threadId, messages),
      hasMoreMessages: new Map(state.hasMoreMessages).set(threadId, hasMore),
    }));
  },

  addMessage: (threadId: string, message: ChatMessage) => {
    set((state) => {
      const existing = state.messages.get(threadId) || [];
      return {
        messages: new Map(state.messages).set(threadId, [...existing, message]),
      };
    });
  },

  updateMessage: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => {
    set((state) => {
      const existing = state.messages.get(threadId) || [];
      return {
        messages: new Map(state.messages).set(
          threadId,
          existing.map((m) => (m.id === messageId || m.tempId === messageId ? { ...m, ...updates } : m))
        ),
      };
    });
  },

  prependMessages: (threadId: string, messages: ChatMessage[], hasMore: boolean) => {
    set((state) => {
      const existing = state.messages.get(threadId) || [];
      return {
        messages: new Map(state.messages).set(threadId, [...messages, ...existing]),
        hasMoreMessages: new Map(state.hasMoreMessages).set(threadId, hasMore),
      };
    });
  },

  // Socket operations
  sendMessage: async (threadId: string, content: string, type = 'Text') => {
    const { socket, isConnected, currentUserId } = get();
    if (!socket || !isConnected) {
      throw new Error('Not connected to chat server');
    }

    // Generate temp ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Optimistic update
    const optimisticMessage: ChatMessage = {
      id: tempId,
      threadId,
      senderId: currentUserId || '',
      type: type as ChatMessage['type'],
      content,
      isEdited: false,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId || '', email: '', profile: null },
      tempId,
      clientStatus: 'sending',
    };

    get().addMessage(threadId, optimisticMessage);

    // Send via socket
    socket.emit('chat:send', { threadId, content, type, tempId }, (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        // Mark as failed
        get().updateMessage(threadId, tempId, { clientStatus: 'failed' });
      }
    });
  },

  markAsRead: (threadId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('chat:mark-read', { threadId });
    }
  },

  startTyping: (threadId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('chat:typing:start', { threadId });
    }
  },

  stopTyping: (threadId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('chat:typing:stop', { threadId });
    }
  },

  joinThread: (threadId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('chat:join', { threadId });
    }
  },

  // Loading states
  setLoadingConversations: (loading: boolean) => set({ isLoadingConversations: loading }),
  setLoadingMessages: (loading: boolean) => set({ isLoadingMessages: loading }),
}));

// Selectors
export const useTypingUsers = (threadId: string) => {
  return useChatStore((state) => Array.from(state.typingUsers.get(threadId) || []));
};

export const useConversationMessages = (threadId: string) => {
  return useChatStore((state) => state.messages.get(threadId) || []);
};

export const useHasMoreMessages = (threadId: string) => {
  return useChatStore((state) => state.hasMoreMessages.get(threadId) ?? true);
};

export const useTotalUnreadCount = () => {
  return useChatStore((state) =>
    state.conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  );
};

export const useActiveConversation = () => {
  return useChatStore((state) =>
    state.conversations.find((c) => c.id === state.activeConversationId)
  );
};
