/**
 * Presence Gateway - WebSocket handler for real-time presence
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
import { PresenceService } from './presence.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map();

  constructor(
    private presenceService: PresenceService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.userSockets.set(client.id, userId);
      await this.presenceService.updatePresence(userId, {});

      this.server.emit('user:online', { userId });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.userSockets.get(client.id);
    if (userId) {
      this.userSockets.delete(client.id);
      await this.presenceService.setOffline(userId);
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId?: string; taskId?: string },
  ) {
    const userId = this.userSockets.get(client.id);
    if (userId) {
      const session = await this.presenceService.updatePresence(userId, data);
      this.server.emit('presence:update', {
        userId,
        status: session.status,
        lastSeenAt: session.lastSeenAt,
      });
    }
  }
}
