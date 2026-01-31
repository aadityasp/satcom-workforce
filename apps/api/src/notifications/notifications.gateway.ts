/**
 * Notifications Gateway - WebSocket handler for real-time notifications
 *
 * Events emitted:
 * - notification:new - New notification pushed to a user
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

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();

  constructor(private jwtService: JwtService) {}

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

      // Track multi-device connections
      const userSocketSet = this.userSockets.get(userId) || new Set();
      userSocketSet.add(client.id);
      this.userSockets.set(userId, userSocketSet);
      this.socketUsers.set(client.id, userId);

      // Store user data on socket
      client.data.userId = userId;
      client.data.companyId = payload.companyId;

      // Auto-join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(
        `User ${userId} connected to notifications (${userSocketSet.size} device(s))`,
      );
    } catch (error) {
      this.logger.warn(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    this.socketUsers.delete(client.id);
    const userSocketSet = this.userSockets.get(userId);

    if (userSocketSet) {
      userSocketSet.delete(client.id);

      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected from notifications (last device)`);
      } else {
        this.logger.log(
          `User ${userId} disconnected from notifications (${userSocketSet.size} devices remaining)`,
        );
      }
    }
  }

  /**
   * Handle subscribe - Subscribe to user notifications
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const authenticatedUserId = this.socketUsers.get(client.id);
    if (!authenticatedUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Users can only subscribe to their own notifications
    if (data.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    client.join(`user:${data.userId}`);
    this.logger.log(`User ${data.userId} subscribed to notifications`);
    return { success: true };
  }

  /**
   * Send notification to a specific user via their socket(s)
   */
  sendNotificationToUser(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit('notification:new', notification);
      }
      this.logger.log(
        `Notification sent to user ${userId} on ${sockets.size} device(s)`,
      );
    }
  }

  /**
   * Broadcast notification to all connected users in a room
   */
  broadcastToRoom(room: string, notification: any) {
    this.server.to(room).emit('notification:new', notification);
  }

  /**
   * Check if a user is currently connected
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
