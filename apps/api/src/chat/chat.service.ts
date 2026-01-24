/**
 * Chat Service - Handles chat thread and message operations
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChatThreadType, ChatMessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getThreads(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { thread: { lastMessageAt: 'desc' } },
    });

    return memberships.map((m) => ({
      ...m.thread,
      unreadCount: m.unreadCount,
    }));
  }

  async createDirectThread(userId: string, otherUserId: string) {
    // Check if thread exists
    const existing = await this.prisma.chatThread.findFirst({
      where: {
        type: ChatThreadType.Direct,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
    });

    if (existing) return existing;

    return this.prisma.chatThread.create({
      data: {
        type: ChatThreadType.Direct,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: { members: true },
    });
  }

  async createGroupThread(userId: string, data: { name: string; memberIds: string[]; projectId?: string }) {
    return this.prisma.chatThread.create({
      data: {
        type: data.projectId ? ChatThreadType.Project : ChatThreadType.Group,
        name: data.name,
        projectId: data.projectId,
        members: {
          create: [userId, ...data.memberIds].map((id) => ({ userId: id })),
        },
      },
      include: { members: true },
    });
  }

  async getMessages(threadId: string, options: { before?: string; limit?: number }) {
    const { before, limit = 50 } = options;
    const where: any = { threadId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    return this.prisma.chatMessage.findMany({
      where,
      include: { sender: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async sendMessage(userId: string, threadId: string, data: { type: ChatMessageType; content?: string }) {
    // Verify membership
    const member = await this.prisma.chatMember.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    if (!member) {
      throw new BadRequestException('Not a member of this thread');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderId: userId,
        type: data.type,
        content: data.content,
      },
      include: { sender: { include: { profile: true } } },
    });

    // Update thread last message
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Increment unread for other members
    await this.prisma.chatMember.updateMany({
      where: { threadId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

    return message;
  }

  async markRead(userId: string, threadId: string) {
    await this.prisma.chatMember.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: new Date(), unreadCount: 0 },
    });
  }
}
