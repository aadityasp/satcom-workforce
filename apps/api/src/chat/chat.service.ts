/**
 * Chat Service - Handles chat thread and message operations
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatThreadType, ChatMessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto';

@Injectable()
export class ChatService {
  private readonly EDIT_WINDOW_MINUTES = 15;

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
    // Validate same company
    const [user, other] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
      this.prisma.user.findUnique({ where: { id: otherUserId }, select: { companyId: true } }),
    ]);

    if (!user || !other) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== other.companyId) {
      throw new BadRequestException('Cannot message users from different companies');
    }

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

    const includeMembers = {
      members: {
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
    };

    if (existing) {
      return this.prisma.chatThread.findUnique({
        where: { id: existing.id },
        include: includeMembers,
      });
    }

    return this.prisma.chatThread.create({
      data: {
        type: ChatThreadType.Direct,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: includeMembers,
    });
  }

  async createGroupThread(userId: string, data: { name: string; memberIds: string[]; projectId?: string }) {
    // Validate same company for all members
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const members = await this.prisma.user.findMany({
      where: { id: { in: data.memberIds } },
      select: { id: true, companyId: true },
    });

    const invalidMembers = members.filter((m) => m.companyId !== user.companyId);
    if (invalidMembers.length > 0) {
      throw new BadRequestException('Cannot add members from different companies');
    }

    const missingMembers = data.memberIds.filter((id) => !members.find((m) => m.id === id));
    if (missingMembers.length > 0) {
      throw new NotFoundException(`Users not found: ${missingMembers.join(', ')}`);
    }

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

  async getMessages(threadId: string, userId: string, options: { cursor?: string; limit?: number }) {
    const { cursor, limit = 50 } = options;

    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId },
      take: -limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { include: { profile: true } },
        statuses: {
          select: { userId: true, deliveredAt: true, readAt: true },
        },
      },
    });

    const hasMore = messages.length === limit;

    return {
      messages,
      hasMore,
      cursor: messages.length > 0 ? messages[0].id : null,
    };
  }

  async sendMessage(userId: string, threadId: string, data: CreateMessageDto) {
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
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
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

    // Create message status for all other members
    const members = await this.prisma.chatMember.findMany({
      where: { threadId, userId: { not: userId } },
      select: { userId: true },
    });

    if (members.length > 0) {
      await this.prisma.messageStatus.createMany({
        data: members.map((m) => ({
          messageId: message.id,
          userId: m.userId,
        })),
      });
    }

    return message;
  }

  async markDelivered(messageIds: string[], userId: string) {
    await this.prisma.messageStatus.updateMany({
      where: {
        messageId: { in: messageIds },
        userId,
        deliveredAt: null,
      },
      data: { deliveredAt: new Date() },
    });
  }

  async markRead(userId: string, threadId: string) {
    // Update unread count
    await this.prisma.chatMember.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: new Date(), unreadCount: 0 },
    });

    // Update message statuses
    const unreadMessages = await this.prisma.chatMessage.findMany({
      where: {
        threadId,
        senderId: { not: userId },
        statuses: { some: { userId, readAt: null } },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await this.prisma.messageStatus.updateMany({
        where: {
          messageId: { in: unreadMessages.map((m) => m.id) },
          userId,
          readAt: null,
        },
        data: { readAt: new Date(), deliveredAt: new Date() },
      });
    }

    return unreadMessages.map((m) => m.id);
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Can only edit own messages');
    if (message.deletedAt) throw new BadRequestException('Cannot edit deleted message');

    const minutesSinceSent = (Date.now() - message.createdAt.getTime()) / 60000;
    if (minutesSinceSent > this.EDIT_WINDOW_MINUTES) {
      throw new BadRequestException('Edit window expired (15 minutes)');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, isEdited: true, editedAt: new Date() },
      include: { sender: { include: { profile: true } } },
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Can only delete own messages');
    if (message.deletedAt) throw new BadRequestException('Message already deleted');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null, attachmentUrl: null },
    });
  }

  async searchUsers(userId: string, query: string, limit?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const takeCount = limit && !isNaN(limit) ? limit : 20;

    return this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
        id: { not: userId },
        isActive: true,
        OR: [
          { email: { contains: query, mode: 'insensitive' as const } },
          { profile: { firstName: { contains: query, mode: 'insensitive' as const } } },
          { profile: { lastName: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      include: { profile: true },
      take: takeCount,
    });
  }
}
