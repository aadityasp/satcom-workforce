/**
 * Chat Gateway - WebSocket handler for real-time messaging
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);
      client.data.userId = userId;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
    }
  }

  @SubscribeMessage('chat:join')
  handleJoinThread(@ConnectedSocket() client: Socket, @MessageBody() data: { threadId: string }) {
    client.join(`thread:${data.threadId}`);
  }

  @SubscribeMessage('chat:typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { threadId: string }) {
    client.to(`thread:${data.threadId}`).emit('chat:typing:start', {
      threadId: data.threadId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('chat:typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { threadId: string }) {
    client.to(`thread:${data.threadId}`).emit('chat:typing:stop', {
      threadId: data.threadId,
      userId: client.data.userId,
    });
  }

  emitNewMessage(threadId: string, message: any) {
    this.server.to(`thread:${threadId}`).emit('chat:message', { threadId, message });
  }
}
