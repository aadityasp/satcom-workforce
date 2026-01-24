/**
 * Chat Controller
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatMessageType } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Get chat threads' })
  async getThreads(@CurrentUser() user: any) {
    const data = await this.chatService.getThreads(user.id);
    return { success: true, data };
  }

  @Post('threads/direct')
  @ApiOperation({ summary: 'Create direct message thread' })
  async createDirect(@CurrentUser() user: any, @Body() body: { userId: string }) {
    const data = await this.chatService.createDirectThread(user.id, body.userId);
    return { success: true, data };
  }

  @Post('threads/group')
  @ApiOperation({ summary: 'Create group thread' })
  async createGroup(@CurrentUser() user: any, @Body() body: { name: string; memberIds: string[]; projectId?: string }) {
    const data = await this.chatService.createGroupThread(user.id, body);
    return { success: true, data };
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages' })
  async getMessages(
    @Param('threadId') threadId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.chatService.getMessages(threadId, { before, limit });
    return { success: true, data };
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Body() body: { type: ChatMessageType; content?: string },
  ) {
    const data = await this.chatService.sendMessage(user.id, threadId, body);
    return { success: true, data };
  }

  @Post('threads/:threadId/read')
  @ApiOperation({ summary: 'Mark thread as read' })
  async markRead(@CurrentUser() user: any, @Param('threadId') threadId: string) {
    await this.chatService.markRead(user.id, threadId);
    return { success: true };
  }
}
