# Phase 6: Chat - Research

**Researched:** 2026-01-24
**Domain:** Real-time messaging, WebSocket communication, Message status tracking
**Confidence:** HIGH

## Summary

Phase 6 builds on substantial existing infrastructure from Phase 5's presence system. The codebase already has:
- **ChatGateway** with Socket.IO for basic room management and typing indicators
- **ChatService** with thread creation (direct/group), message sending, and read tracking
- **ChatController** with REST endpoints for threads and messages
- **Prisma models:** ChatThread, ChatMember, ChatMessage with existing schema
- **StorageService** for MinIO file uploads (reusable for image attachments)
- **Zustand + Socket.IO pattern** proven in presence store

What needs to be built/enhanced:
1. **Message Status Tracking** - Extend schema for sent/delivered/read states per recipient
2. **Enhanced Gateway Events** - Add message delivery acknowledgments, read receipt broadcasting
3. **Company-Scoped Rooms** - Add company isolation to chat (currently no company check)
4. **Chat Store (Frontend)** - Zustand store for conversations, messages, real-time updates
5. **Chat UI Components** - Conversation list, message thread, compose area, typing indicators
6. **Browser Notifications** - Web Notification API for new message alerts
7. **Edit/Delete Messages** - Soft delete and edit-within-window functionality

**Primary recommendation:** Extend the existing ChatGateway/ChatService. Add message status tracking with a new MessageStatus model. Follow the established Zustand + Socket.IO pattern from presence store.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/websockets | ^10.3.0 | WebSocket gateway support | Already installed, NestJS native |
| @nestjs/platform-socket.io | ^10.3.0 | Socket.IO adapter for NestJS | Already installed, production-ready |
| socket.io | ^4.6.1 | Server-side WebSocket library | Already installed, handles reconnection/rooms |
| socket.io-client | ^4.6.1 | Client-side WebSocket library | Already installed in frontend |
| zustand | ^4.4.7 | Client state management | Already used for auth/presence, ideal for chat |
| minio | ^7.x | S3-compatible storage for attachments | Already used via StorageService |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.2.0 | Message timestamp formatting | Already installed, for relative times |
| class-validator | ^0.14.x | DTO validation | Already installed, for message DTOs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling for new messages | Socket.IO events | Real-time delivery vs. battery/bandwidth overhead - Socket.IO preferred |
| Single WebSocket namespace | Separate /chat namespace | Separation of concerns - use /chat namespace like /presence |
| Client timestamp | Server timestamp | Server authoritative to prevent clock skew - always server |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── chat/                          # EXISTING - Enhance
│   ├── chat.module.ts             # ENHANCE: Add PrismaModule import
│   ├── chat.gateway.ts            # ENHANCE: Add company rooms, delivery acks, read receipts
│   ├── chat.service.ts            # ENHANCE: Add message status, edit/delete, pagination
│   ├── chat.controller.ts         # ENHANCE: Add edit/delete endpoints, user search
│   └── dto/
│       ├── create-message.dto.ts      # NEW: Message creation with type, content
│       ├── edit-message.dto.ts        # NEW: Message edit validation
│       ├── create-thread.dto.ts       # NEW: Thread creation DTOs
│       └── index.ts                   # Export barrel

apps/api/prisma/
└── schema.prisma                  # ENHANCE: Add MessageStatus model, deletedAt field

apps/web/src/
├── store/
│   └── chat.ts                    # NEW: Zustand store for chat state
├── hooks/
│   └── useChat.ts                 # NEW: Hook for chat operations
├── components/
│   └── chat/                      # NEW
│       ├── ConversationList.tsx       # Sidebar with conversations
│       ├── ConversationItem.tsx       # Single conversation row
│       ├── MessageThread.tsx          # Message display area
│       ├── MessageBubble.tsx          # Individual message
│       ├── MessageComposer.tsx        # Text input with send
│       ├── TypingIndicator.tsx        # "User is typing..."
│       ├── MessageStatus.tsx          # Checkmarks for sent/delivered/read
│       ├── UserSearchModal.tsx        # Start new DM modal
│       └── GroupCreateModal.tsx       # Create group chat modal
├── app/
│   └── chat/
│       └── page.tsx               # NEW: Chat page with conversations
```

### Pattern 1: Chat Store with Socket.IO Integration

**What:** Centralized chat state following the presence store pattern
**When to use:** Always for real-time chat in this codebase
**Example:**
```typescript
// Source: Based on presence.ts pattern + Socket.IO chat docs
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface ChatState {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Map<string, Message[]>;  // threadId -> messages
  typingUsers: Map<string, string[]>; // threadId -> userIds

  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (threadId: string, content: string, type?: MessageType) => void;
  markAsRead: (threadId: string) => void;
  startTyping: (threadId: string) => void;
  stopTyping: (threadId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  isConnected: false,
  conversations: [],
  activeConversationId: null,
  messages: new Map(),
  typingUsers: new Map(),

  connect: (token: string) => {
    const socket = io(`${API_URL}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    // Message events
    socket.on('chat:message', ({ threadId, message }) => {
      set((state) => {
        const existing = state.messages.get(threadId) || [];
        return {
          messages: new Map(state.messages).set(threadId, [...existing, message]),
        };
      });
    });

    socket.on('chat:delivered', ({ threadId, messageId, userId }) => {
      // Update message delivery status
    });

    socket.on('chat:read', ({ threadId, messageIds, userId }) => {
      // Update message read status
    });

    socket.on('chat:typing:start', ({ threadId, userId }) => {
      set((state) => {
        const typing = state.typingUsers.get(threadId) || [];
        if (!typing.includes(userId)) {
          return {
            typingUsers: new Map(state.typingUsers).set(threadId, [...typing, userId]),
          };
        }
        return state;
      });
    });

    socket.on('chat:typing:stop', ({ threadId, userId }) => {
      set((state) => {
        const typing = state.typingUsers.get(threadId) || [];
        return {
          typingUsers: new Map(state.typingUsers).set(threadId, typing.filter(id => id !== userId)),
        };
      });
    });

    set({ socket });
  },

  sendMessage: (threadId: string, content: string, type = 'Text') => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('chat:send', { threadId, content, type });
    }
  },
}));
```

### Pattern 2: Message Status Tracking (Sent -> Delivered -> Read)

**What:** Three-state tracking with per-recipient status
**When to use:** For all messages to show checkmarks like WhatsApp
**Example:**
```typescript
// Source: WhatsApp system design + existing schema patterns
// Backend: Update message status when recipient receives
@SubscribeMessage('chat:delivered')
async handleDelivered(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { messageIds: string[] },
) {
  const userId = client.data.userId;

  // Update status in database
  await this.chatService.markDelivered(data.messageIds, userId);

  // Notify sender(s) about delivery
  for (const messageId of data.messageIds) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { thread: true },
    });
    if (message) {
      // Emit to sender's sockets
      this.emitToUser(message.senderId, 'chat:delivered', {
        threadId: message.threadId,
        messageId,
        userId,
      });
    }
  }
}

// Schema extension:
model MessageStatus {
  id          String    @id @default(uuid())
  messageId   String
  userId      String    // Recipient
  deliveredAt DateTime?
  readAt      DateTime?

  message ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User        @relation(fields: [userId], references: [id])

  @@unique([messageId, userId])
  @@map("message_statuses")
}
```

### Pattern 3: Company-Scoped Chat Rooms

**What:** Join company room on connect for isolation
**When to use:** Always - ensures users only see conversations in their company
**Example:**
```typescript
// Source: Existing presence.gateway.ts pattern
async handleConnection(client: Socket) {
  try {
    const token = client.handshake.auth.token;
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    const companyId = payload.companyId;

    // Store user data on socket
    client.data.userId = userId;
    client.data.companyId = companyId;

    // Join company room for new message notifications
    client.join(`company:${companyId}`);

    // Track multi-device
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    // Join all user's conversation rooms
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      select: { threadId: true },
    });
    for (const m of memberships) {
      client.join(`thread:${m.threadId}`);
    }

    this.logger.log(`Chat: User ${userId} connected`);
  } catch {
    client.disconnect();
  }
}
```

### Pattern 4: Typing Indicator with Debounce

**What:** Debounced typing events to reduce noise
**When to use:** In MessageComposer component
**Example:**
```typescript
// Source: Socket.IO chat patterns + debounce best practices
// Frontend component
function MessageComposer({ threadId }: { threadId: string }) {
  const { startTyping, stopTyping, sendMessage } = useChatStore();
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Start typing if not already indicated
    startTyping(threadId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(threadId);
    }, 2000);
  };

  const handleSend = () => {
    if (content.trim()) {
      sendMessage(threadId, content.trim());
      setContent('');
      stopTyping(threadId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(threadId);
    };
  }, [threadId]);

  return (/* ... */);
}
```

### Pattern 5: Cursor-Based Message Pagination

**What:** Load older messages on scroll using cursor pagination
**When to use:** When loading message history
**Example:**
```typescript
// Source: Prisma pagination docs + existing chat.service.ts
async getMessages(threadId: string, options: { cursor?: string; limit?: number }) {
  const { cursor, limit = 50 } = options;

  const messages = await this.prisma.chatMessage.findMany({
    where: { threadId },
    take: -limit,  // Negative to get messages BEFORE cursor
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { include: { profile: true } },
      statuses: {
        select: {
          userId: true,
          deliveredAt: true,
          readAt: true,
        },
      },
    },
  });

  // Check if there are more messages
  const hasMore = messages.length === limit;

  return {
    messages,
    hasMore,
    cursor: messages.length > 0 ? messages[0].id : null,
  };
}
```

### Anti-Patterns to Avoid

- **Polling for new messages:** Use WebSocket events exclusively for real-time
- **Storing full message history in store:** Keep only active conversation's messages + recent for list preview
- **Sending typing on every keystroke:** Debounce to prevent flooding (2 second timeout)
- **Client-generated timestamps:** Always use server-side `createdAt` for ordering consistency
- **Fetching all messages at once:** Use cursor pagination, load 50 at a time on scroll
- **Not joining thread rooms:** Must join `thread:{id}` room to receive messages

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message delivery guarantee | Custom retry logic | Socket.IO acknowledgments | Built-in callback confirms receipt |
| Reconnection handling | Manual WebSocket reconnect | Socket.IO `reconnection: true` | Exponential backoff, state preservation |
| File upload | Multipart form handling | StorageService presigned URLs | Already built, handles MinIO integration |
| Relative timestamps | Custom date formatting | date-fns `formatRelative` | Already installed, locale-aware |
| Auto-linking URLs | Custom regex | Browser's linkify or simple regex | Edge cases are many |
| Scroll position management | Manual scroll tracking | CSS `flex-direction: column-reverse` + `overflow-anchor` | Native browser behavior |
| Unread count calculation | Client-side counting | Server-side `unreadCount` on ChatMember | Consistent across devices |

**Key insight:** The existing ChatService already handles thread creation, message sending, and unread tracking. Focus on real-time delivery, status tracking, and UI - not core CRUD.

## Common Pitfalls

### Pitfall 1: Missing Company Isolation

**What goes wrong:** Users see conversations from other companies
**Why it happens:** ChatGateway doesn't validate company membership
**How to avoid:**
```typescript
// When creating direct thread, verify same company:
async createDirectThread(userId: string, otherUserId: string) {
  const [user, other] = await Promise.all([
    this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
    this.prisma.user.findUnique({ where: { id: otherUserId }, select: { companyId: true } }),
  ]);

  if (user.companyId !== other.companyId) {
    throw new BadRequestException('Cannot message users from different companies');
  }
  // ... continue
}
```
**Warning signs:** Users appearing in search who shouldn't be reachable

### Pitfall 2: Duplicate Messages on Reconnect

**What goes wrong:** Same message appears multiple times after network issues
**Why it happens:** Re-emitted events without idempotency
**How to avoid:**
- Generate message ID client-side (UUID) before sending
- Server checks if message ID already exists
- Client deduplicates by ID when receiving
```typescript
sendMessage: (threadId, content) => {
  const tempId = crypto.randomUUID();  // Client-generated
  socket.emit('chat:send', { threadId, content, tempId });
}
// Server: check for duplicate tempId before insert
```
**Warning signs:** Messages appearing twice intermittently

### Pitfall 3: Memory Leak from Conversation Listeners

**What goes wrong:** Old conversation listeners accumulate, causing duplicate updates
**Why it happens:** Not cleaning up when switching conversations
**How to avoid:**
```typescript
// When switching active conversation, leave old room
const setActiveConversation = (threadId: string) => {
  const { socket, activeConversationId } = get();
  if (activeConversationId && activeConversationId !== threadId) {
    // Don't need to leave - server handles via rooms
    // But clear typing state
    socket?.emit('chat:typing:stop', { threadId: activeConversationId });
  }
  set({ activeConversationId: threadId });
};
```
**Warning signs:** Typing indicator appears in wrong conversation

### Pitfall 4: Read Receipts Causing N+1 Queries

**What goes wrong:** Slow message loading as each message fetches status separately
**Why it happens:** Not batching status queries with messages
**How to avoid:**
```typescript
// Include statuses in message query (already shown in pagination example)
include: {
  statuses: {
    select: { userId: true, deliveredAt: true, readAt: true },
  },
}
// For status aggregation: "All read" = all recipients have readAt
```
**Warning signs:** Slow message thread load times, many DB queries

### Pitfall 5: Image Upload Blocks UI

**What goes wrong:** UI freezes while uploading large image
**Why it happens:** Synchronous upload in send flow
**How to avoid:**
1. Show optimistic message with loading placeholder
2. Get presigned URL from StorageService
3. Upload directly to MinIO from client
4. Update message with final URL via REST or emit
```typescript
const sendImageMessage = async (threadId: string, file: File) => {
  // 1. Get upload URL
  const { uploadUrl, objectKey } = await api.post('/storage/upload-url', {
    folder: 'chat',
    fileName: file.name,
    contentType: file.type,
  });

  // 2. Show optimistic message with loading state
  addOptimisticMessage(threadId, { type: 'File', status: 'uploading' });

  // 3. Upload file
  await fetch(uploadUrl, { method: 'PUT', body: file });

  // 4. Send message with attachment URL
  socket.emit('chat:send', {
    threadId,
    type: 'File',
    attachmentUrl: objectKey,
    attachmentType: file.type,
  });
};
```
**Warning signs:** Send button unresponsive during image uploads

### Pitfall 6: Browser Notification Permission Denied Forever

**What goes wrong:** User denies permission, can never enable notifications
**Why it happens:** Requesting permission on page load (bad UX)
**How to avoid:**
- Only request on explicit user action (button click)
- Show explanation before system prompt
- Provide in-app notifications as fallback
```typescript
const enableNotifications = async () => {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'denied') {
    // Show instructions to enable in browser settings
    showManualEnableInstructions();
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};
```
**Warning signs:** Low notification opt-in rate

## Code Examples

### Prisma Schema Extension for Message Status

```prisma
// Source: Based on existing schema + WhatsApp design patterns

// Extend ChatMessage
model ChatMessage {
  id              String          @id @default(uuid())
  threadId        String
  senderId        String
  type            ChatMessageType
  content         String?
  attachmentUrl   String?
  attachmentType  String?
  durationSeconds Int?
  isEdited        Boolean         @default(false)
  editedAt        DateTime?
  deletedAt       DateTime?       // NEW: Soft delete timestamp

  createdAt       DateTime        @default(now())

  // Relations
  thread   ChatThread      @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender   User            @relation(fields: [senderId], references: [id])
  statuses MessageStatus[] // NEW: Per-recipient status tracking

  @@index([threadId, createdAt])
  @@index([senderId])
  @@map("chat_messages")
}

// NEW: Per-recipient message status
model MessageStatus {
  id          String    @id @default(uuid())
  messageId   String
  userId      String    // Recipient user
  deliveredAt DateTime?
  readAt      DateTime?
  createdAt   DateTime  @default(now())

  message ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User        @relation("MessageRecipient", fields: [userId], references: [id])

  @@unique([messageId, userId])
  @@index([userId])
  @@map("message_statuses")
}

// Update User model
model User {
  // ... existing fields
  messageStatuses MessageStatus[] @relation("MessageRecipient") // NEW
}
```

### Enhanced Chat Gateway

```typescript
// Source: Existing chat.gateway.ts + presence.gateway.ts patterns
@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const companyId = payload.companyId;

      client.data.userId = userId;
      client.data.companyId = companyId;

      // Track multi-device
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);

      // Join company room
      client.join(`company:${companyId}`);

      // Join all user's thread rooms
      const memberships = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { threadId: true },
      });
      for (const m of memberships) {
        client.join(`thread:${m.threadId}`);
      }

      this.logger.log(`User ${userId} connected to chat`);
    } catch (error) {
      this.logger.warn(`Chat connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; content: string; type?: string; tempId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      const message = await this.chatService.sendMessage(userId, data.threadId, {
        type: (data.type as any) || 'Text',
        content: data.content,
      });

      // Broadcast to thread room
      this.server.to(`thread:${data.threadId}`).emit('chat:message', {
        threadId: data.threadId,
        message,
        tempId: data.tempId,  // For client-side deduplication
      });

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('chat:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.chatService.markRead(userId, data.threadId);

    // Notify senders that messages were read
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: data.threadId },
      include: { members: true },
    });

    // Broadcast read receipt to other members
    for (const member of thread?.members || []) {
      if (member.userId !== userId) {
        this.emitToUser(member.userId, 'chat:read', {
          threadId: data.threadId,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Helper: emit to all sockets of a user
  private emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
```

### Browser Notification Helper

```typescript
// Source: MDN Web Push API Best Practices
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    // Cannot re-request - user must enable in browser settings
    return false;
  }

  // Only request on user action - this should be called from a button click
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showChatNotification(
  sender: string,
  message: string,
  threadId: string,
): void {
  if (Notification.permission !== 'granted') return;

  // Don't show if tab is active
  if (document.visibilityState === 'visible') return;

  const notification = new Notification(sender, {
    body: message.length > 100 ? message.slice(0, 97) + '...' : message,
    icon: '/chat-icon.png',
    tag: `chat-${threadId}`,  // Replace previous from same thread
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    // Navigate to conversation
    window.location.href = `/chat?thread=${threadId}`;
    notification.close();
  };

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}
```

### Message Edit/Delete with Time Window

```typescript
// Source: Based on existing service patterns
const EDIT_WINDOW_MINUTES = 15;

async editMessage(userId: string, messageId: string, newContent: string) {
  const message = await this.prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new NotFoundException('Message not found');
  }

  if (message.senderId !== userId) {
    throw new ForbiddenException('Can only edit own messages');
  }

  const minutesSinceSent = (Date.now() - message.createdAt.getTime()) / 60000;
  if (minutesSinceSent > EDIT_WINDOW_MINUTES) {
    throw new BadRequestException('Edit window expired');
  }

  return this.prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
    },
  });
}

async deleteMessage(userId: string, messageId: string) {
  const message = await this.prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new NotFoundException('Message not found');
  }

  if (message.senderId !== userId) {
    throw new ForbiddenException('Can only delete own messages');
  }

  // Soft delete - keep record but clear content
  return this.prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      content: null,
      attachmentUrl: null,
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for messages | WebSocket events | Standard since 2015+ | Real-time without polling overhead |
| Single checkmark | Three-state status (sent/delivered/read) | WhatsApp popularized 2014+ | Clear delivery feedback |
| Blocking file upload | Presigned URL + direct upload | Standard for S3/MinIO | Non-blocking UI |
| Alert boxes for notifications | Web Notification API | Widely supported 2020+ | Native OS integration |
| Global socket listeners | Room-based messaging | Socket.IO standard | Efficient targeting |

**Deprecated/outdated:**
- Long polling for chat: WebSocket is standard
- Client-side message ordering: Server timestamps authoritative
- Eager loading all history: Cursor pagination for performance

## Open Questions

1. **Message Edit Window Duration**
   - What we know: Need edit capability (CONTEXT.md)
   - What's unclear: How long should users be able to edit?
   - Recommendation: 15 minutes, common in Slack/Teams

2. **Typing Indicator Timeout**
   - What we know: Need typing indicators (CONTEXT.md)
   - What's unclear: How long to show before auto-clearing?
   - Recommendation: 5 seconds after last keystroke, 10 second max display

3. **Max Group Size**
   - What we know: "No minimum/maximum member limits enforced" per CONTEXT.md
   - What's unclear: Should there be a soft limit for performance?
   - Recommendation: Warn at 50 members, no hard limit

4. **Offline Message Queue**
   - What we know: Messages should persist if recipient offline
   - What's unclear: How long to retain for delivery?
   - Recommendation: Indefinite - messages stored in DB, delivered on connect

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/api/src/chat/*` - Gateway, service, controller patterns already implemented
- Existing codebase: `apps/api/src/presence/presence.gateway.ts` - Proven Socket.IO patterns for this project
- Existing codebase: `apps/web/src/store/presence.ts` - Zustand + Socket.IO integration pattern
- [Socket.IO v4 Documentation](https://socket.io/docs/v4/) - Rooms, acknowledgments, events
- [Socket.IO Private Messaging Tutorial](https://socket.io/get-started/private-messaging-part-1/) - Room-based DM patterns
- [Prisma Cursor Pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination) - Message history pagination

### Secondary (MEDIUM confidence)
- [NestJS WebSocket Gateways](https://docs.nestjs.com/websockets/gateways) - Gateway lifecycle hooks
- [MDN Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API) - Browser notification patterns
- [WhatsApp System Design](https://medium.com/@m.romaniiuk/system-design-chat-application-1d6fbf21b372) - Message status tracking patterns
- [Socket.IO Best Practices](https://ably.com/topic/socketio) - Production patterns

### Tertiary (LOW confidence)
- WebSearch articles on typing indicator debounce patterns
- Community posts on read receipt database design

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and patterns established
- Architecture: HIGH - Extending existing proven patterns from Phase 5
- Pitfalls: HIGH - Based on official docs and real codebase analysis
- Message status design: MEDIUM - Based on industry patterns, needs validation

**Research date:** 2026-01-24
**Valid until:** 45 days (stable domain, existing infrastructure)
