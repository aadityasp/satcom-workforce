/**
 * Presence Gateway - WebSocket handler for real-time presence
 *
 * Events emitted:
 * - user:online - When user connects
 * - user:offline - When user disconnects
 * - presence:update - Heartbeat with status, GPS, current activity
 * - activity:changed - When user changes current project/task
 * - status:updated - When user posts/clears status message
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
import { Cron } from '@nestjs/schedule';
import { PresenceService } from './presence.service';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceStatus } from '@prisma/client';

interface HeartbeatPayload {
  projectId?: string;
  taskId?: string;
  latitude?: number;
  longitude?: number;
}

interface SetActivityPayload {
  projectId: string;
  taskId?: string;
}

interface StatusPayload {
  message: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId> (multi-device)
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  private readonly AWAY_THRESHOLD = 15 * 60 * 1000; // 15 minutes

  constructor(
    private presenceService: PresenceService,
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

      // Join company room for targeted broadcasts
      client.join(`company:${companyId}`);

      // Update presence
      await this.presenceService.updatePresence(userId, {});

      // Broadcast online status (only if first connection for this user)
      if (userSocketSet.size === 1) {
        this.server.to(`company:${companyId}`).emit('user:online', {
          userId,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(`User ${userId} connected (first device)`);
      } else {
        this.logger.log(`User ${userId} connected (additional device, total: ${userSocketSet.size})`);
      }
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

      // Only mark offline if no more connections for this user
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        await this.presenceService.setOffline(userId);

        // Get company from any room the client was in
        const rooms = Array.from(client.rooms);
        const companyRoom = rooms.find(r => r.startsWith('company:'));
        if (companyRoom) {
          this.server.to(companyRoom).emit('user:offline', {
            userId,
            timestamp: new Date().toISOString(),
          });
        }
        this.logger.log(`User ${userId} disconnected (last device)`);
      } else {
        this.logger.log(`User ${userId} disconnected (${userSocketSet.size} devices remaining)`);
      }
    }
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: HeartbeatPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    try {
      const session = await this.presenceService.updatePresence(userId, {
        projectId: data.projectId,
        taskId: data.taskId,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      // Get company room
      const rooms = Array.from(client.rooms);
      const companyRoom = rooms.find(r => r.startsWith('company:'));

      if (companyRoom) {
        this.server.to(companyRoom).emit('presence:update', {
          userId,
          status: session.status,
          lastSeenAt: session.lastSeenAt,
          currentProjectId: session.currentProjectId,
          currentTaskId: session.currentTaskId,
          lastLatitude: session.lastLatitude ? Number(session.lastLatitude) : null,
          lastLongitude: session.lastLongitude ? Number(session.lastLongitude) : null,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Heartbeat failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('activity:set')
  async handleSetActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetActivityPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    try {
      const session = await this.presenceService.setActivity(
        userId,
        data.projectId,
        data.taskId,
      );

      // Get company room
      const rooms = Array.from(client.rooms);
      const companyRoom = rooms.find(r => r.startsWith('company:'));

      if (companyRoom) {
        this.server.to(companyRoom).emit('activity:changed', {
          userId,
          projectId: session.currentProjectId,
          taskId: session.currentTaskId,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, session };
    } catch (error) {
      this.logger.error(`Set activity failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('status:post')
  async handlePostStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StatusPayload,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    try {
      const session = await this.presenceService.postStatusUpdate(userId, data.message);

      // Get company room
      const rooms = Array.from(client.rooms);
      const companyRoom = rooms.find(r => r.startsWith('company:'));

      if (companyRoom) {
        this.server.to(companyRoom).emit('status:updated', {
          userId,
          statusMessage: session.statusMessage,
          statusUpdatedAt: session.statusUpdatedAt,
        });
      }

      return { success: true, session };
    } catch (error) {
      this.logger.error(`Post status failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('status:clear')
  async handleClearStatus(@ConnectedSocket() client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    try {
      await this.presenceService.clearStatus(userId);

      // Get company room
      const rooms = Array.from(client.rooms);
      const companyRoom = rooms.find(r => r.startsWith('company:'));

      if (companyRoom) {
        this.server.to(companyRoom).emit('status:updated', {
          userId,
          statusMessage: null,
          statusUpdatedAt: null,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Clear status failed for ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cron job to clean up stale sessions
   * Runs every 5 minutes to mark users as offline if no heartbeat in 15 minutes
   */
  @Cron('*/5 * * * *')
  async cleanupStaleSessions() {
    const threshold = new Date(Date.now() - this.AWAY_THRESHOLD);

    try {
      const stale = await this.prisma.presenceSession.findMany({
        where: {
          lastSeenAt: { lt: threshold },
          status: { not: PresenceStatus.Offline },
        },
        include: {
          user: { select: { companyId: true } },
        },
      });

      if (stale.length === 0) return;

      // Update all stale sessions to Offline
      await this.prisma.presenceSession.updateMany({
        where: {
          id: { in: stale.map(s => s.id) },
        },
        data: { status: PresenceStatus.Offline },
      });

      // Broadcast offline events per company
      const byCompany = new Map<string, string[]>();
      for (const session of stale) {
        const companyId = session.user.companyId;
        const users = byCompany.get(companyId) || [];
        users.push(session.userId);
        byCompany.set(companyId, users);
      }

      for (const [companyId, userIds] of byCompany) {
        for (const userId of userIds) {
          this.server.to(`company:${companyId}`).emit('user:offline', {
            userId,
            reason: 'stale_session',
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(`Cleaned up ${stale.length} stale presence sessions`);
    } catch (error) {
      this.logger.error(`Stale session cleanup failed: ${error.message}`);
    }
  }
}
