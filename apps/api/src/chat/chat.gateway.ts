/**
 * Chat Gateway - WebSocket handler for real-time messaging
 *
 * Events emitted:
 * - chat:message - New message broadcast to thread room
 * - chat:delivered - Delivery confirmation to message sender
 * - chat:read - Read receipts broadcast to message senders
 * - chat:edited - Message edit broadcast to thread room
 * - chat:deleted - Message delete broadcast to thread room
 * - chat:typing:start - User started typing
 * - chat:typing:stop - User stopped typing
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ChatMessageType } from '@prisma/client';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto';

interface SendMessagePayload {
  threadId: string;
  type: ChatMessageType;
  content?: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface DeliveredPayload {
  messageIds: string[];
}

interface MarkReadPayload {
  threadId: string;
}

interface TypingPayload {
  threadId: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId> (multi-device)
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private chatService: ChatService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.warn(`Connection attempt without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const companyId = payload.companyId;

      // Track multi-device connections
      const userSocketSet = this.userSockets.get(userId) || new Set();
      userSocketSet.add(client.id);
      this.userSockets.set(userId, userSocketSet);
      this.socketUsers.set(client.id, userId);

      // Store user data on socket for later use
      client.data.userId = userId;
      client.data.companyId = companyId;

      // Join company room for potential company-wide broadcasts
      client.join(`company:${companyId}`);

      // Auto-join all thread rooms this user is a member of
      const memberships = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { threadId: true },
      });

      for (const membership of memberships) {
        client.join(`thread:${membership.threadId}`);
      }

      this.logger.log(
        `User ${userId} connected (${userSocketSet.size} device(s), ${memberships.length} threads)`,
      );
    } catch (error) {
      this.logger.warn(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    // Remove this socket from tracking
    this.socketUsers.delete(client.id);
    const userSocketSet = this.userSockets.get(userId);

    if (userSocketSet) {
      userSocketSet.delete(client.id);

      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected (last device)`);
      } else {
        this.logger.log(
          `User ${userId} disconnected (${userSocketSet.size} devices remaining)`,
        );
      }
    }
  }

  /**
   * Handle chat:send - Send a new message via WebSocket
   */
  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      const dto: CreateMessageDto = {
        type: data.type,
        content: data.content,
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
      };

      const message = await this.chatService.sendMessage(
        userId,
        data.threadId,
        dto,
      );

      // Broadcast to all members in the thread room
      this.server.to(`thread:${data.threadId}`).emit('chat:message', {
        threadId: data.threadId,
        message,
      });

      this.logger.log(
        `Message sent in thread ${data.threadId} by user ${userId}`,
      );

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Send message failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle chat:delivered - Mark messages as delivered and notify senders
   */
  @SubscribeMessage('chat:delivered')
  async handleDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeliveredPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      await this.chatService.markDelivered(data.messageIds, userId);

      // Get the messages to find their senders
      const messages = await this.prisma.chatMessage.findMany({
        where: { id: { in: data.messageIds } },
        select: { id: true, senderId: true, threadId: true },
      });

      // Notify each sender that their message was delivered
      const now = new Date().toISOString();
      for (const msg of messages) {
        this.emitToUser(msg.senderId, 'chat:delivered', {
          messageId: msg.id,
          threadId: msg.threadId,
          deliveredTo: userId,
          deliveredAt: now,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Mark delivered failed for ${userId}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle chat:mark-read - Mark thread as read and broadcast read receipts
   */
  @SubscribeMessage('chat:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkReadPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      const readMessageIds = await this.chatService.markRead(
        userId,
        data.threadId,
      );

      if (readMessageIds.length > 0) {
        // Get the messages to find their senders
        const messages = await this.prisma.chatMessage.findMany({
          where: { id: { in: readMessageIds } },
          select: { id: true, senderId: true },
        });

        // Notify each sender that their message was read
        const now = new Date().toISOString();
        for (const msg of messages) {
          this.emitToUser(msg.senderId, 'chat:read', {
            messageId: msg.id,
            threadId: data.threadId,
            readBy: userId,
            readAt: now,
          });
        }
      }

      this.logger.log(
        `User ${userId} marked ${readMessageIds.length} messages as read in thread ${data.threadId}`,
      );

      return { success: true, count: readMessageIds.length };
    } catch (error) {
      this.logger.error(`Mark read failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle chat:typing:start - User started typing
   */
  @SubscribeMessage('chat:typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    client.to(`thread:${data.threadId}`).emit('chat:typing:start', {
      threadId: data.threadId,
      userId,
    });
  }

  /**
   * Handle chat:typing:stop - User stopped typing
   */
  @SubscribeMessage('chat:typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    client.to(`thread:${data.threadId}`).emit('chat:typing:stop', {
      threadId: data.threadId,
      userId,
    });
  }

  /**
   * Handle chat:join - Manually join a thread room (for new threads)
   */
  @SubscribeMessage('chat:join')
  handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    client.join(`thread:${data.threadId}`);
    this.logger.log(`User ${userId} joined thread room ${data.threadId}`);
    return { success: true };
  }

  /**
   * Broadcast new message to thread (called from controller)
   */
  emitNewMessage(threadId: string, message: any) {
    this.server.to(`thread:${threadId}`).emit('chat:message', {
      threadId,
      message,
    });
  }

  /**
   * Broadcast message edited to thread (called from controller)
   */
  emitMessageEdited(threadId: string, message: any) {
    this.server.to(`thread:${threadId}`).emit('chat:edited', {
      threadId,
      message,
    });
  }

  /**
   * Broadcast message deleted to thread (called from controller)
   */
  emitMessageDeleted(threadId: string, messageId: string) {
    this.server.to(`thread:${threadId}`).emit('chat:deleted', {
      threadId,
      messageId,
    });
  }

  /**
   * Emit event to a specific user (all their connected devices)
   */
  private emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Join a user to a thread room (called when new thread is created)
   * Uses fetchSockets to get connected sockets in the namespace
   */
  async joinUserToThread(userId: string, threadId: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      // Fetch all sockets in the namespace and filter by user's socket IDs
      const allSockets = await this.server.fetchSockets();
      for (const socket of allSockets) {
        if (socketIds.has(socket.id)) {
          socket.join(`thread:${threadId}`);
        }
      }
    }
  }
}
