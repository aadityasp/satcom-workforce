/**
 * Presence Controller
 */
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Presence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('list')
  @ApiOperation({ summary: 'Get availability list' })
  async getList(@CurrentUser() user: any) {
    const users = await this.presenceService.getAvailabilityList(user.companyId);
    return { success: true, data: { users } };
  }

  @Post('heartbeat')
  @ApiOperation({ summary: 'Send presence heartbeat' })
  async heartbeat(@CurrentUser() user: any, @Body() body: { projectId?: string; taskId?: string }) {
    await this.presenceService.updatePresence(user.id, body);
    return { success: true };
  }
}
