/**
 * Chat Controller
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateMessageDto,
  EditMessageDto,
  CreateDirectThreadDto,
  CreateGroupThreadDto,
} from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle() // Chat needs to be responsive, skip rate limiting
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
  async createDirect(@CurrentUser() user: any, @Body() body: CreateDirectThreadDto) {
    const data = await this.chatService.createDirectThread(user.id, body.userId);
    return { success: true, data };
  }

  @Post('threads/group')
  @ApiOperation({ summary: 'Create group thread' })
  async createGroup(@CurrentUser() user: any, @Body() body: CreateGroupThreadDto) {
    const data = await this.chatService.createGroupThread(user.id, body);
    return { success: true, data };
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages with pagination' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.chatService.getMessages(threadId, user.id, { cursor, limit });
    return { success: true, data };
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Body() body: CreateMessageDto,
  ) {
    const data = await this.chatService.sendMessage(user.id, threadId, body);
    return { success: true, data };
  }

  @Post('threads/:threadId/read')
  @ApiOperation({ summary: 'Mark thread as read' })
  async markRead(@CurrentUser() user: any, @Param('threadId') threadId: string) {
    const readMessageIds = await this.chatService.markRead(user.id, threadId);
    return { success: true, data: { readMessageIds } };
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit message (within 15 minutes)' })
  async editMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ) {
    const data = await this.chatService.editMessage(user.id, messageId, body.content);
    return { success: true, data };
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete message (soft delete)' })
  async deleteMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
  ) {
    const data = await this.chatService.deleteMessage(user.id, messageId);
    return { success: true, data };
  }

  @Get('users/search')
  @ApiOperation({ summary: 'Search users for chat (same company only)' })
  async searchUsers(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const data = await this.chatService.searchUsers(user.id, query || '', parsedLimit);
    return { success: true, data };
  }
}
