/**
 * Presence Controller - REST endpoints for presence and activity tracking
 */
import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PresenceStatus, UserRole } from '@prisma/client';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SetActivityDto, PostStatusDto, UpdatePresenceDto } from './dto';

@ApiTags('Presence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('list')
  @ApiOperation({ summary: 'Get team availability list with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: PresenceStatus })
  @ApiQuery({ name: 'department', required: false, type: String })
  async getList(
    @CurrentUser() user: any,
    @Query('status') status?: PresenceStatus,
    @Query('department') department?: string,
  ) {
    const users = await this.presenceService.getAvailabilityList(
      user.companyId,
      { status, department },
    );
    return { success: true, data: { users } };
  }

  @Post('heartbeat')
  @ApiOperation({ summary: 'Send presence heartbeat with optional GPS' })
  async heartbeat(
    @CurrentUser() user: any,
    @Body() body: UpdatePresenceDto,
  ) {
    await this.presenceService.updatePresence(user.id, body);
    return { success: true };
  }

  @Post('activity')
  @ApiOperation({ summary: 'Set current activity (project/task)' })
  async setActivity(
    @CurrentUser() user: any,
    @Body() body: SetActivityDto,
  ) {
    const session = await this.presenceService.setActivity(
      user.id,
      body.projectId,
      body.taskId,
    );
    return { success: true, data: { session } };
  }

  @Post('status')
  @ApiOperation({ summary: 'Post a status update message' })
  async postStatus(
    @CurrentUser() user: any,
    @Body() body: PostStatusDto,
  ) {
    const session = await this.presenceService.postStatusUpdate(user.id, body.message);
    return { success: true, data: { session } };
  }

  @Delete('status')
  @ApiOperation({ summary: 'Clear current status message' })
  async clearStatus(@CurrentUser() user: any) {
    await this.presenceService.clearStatus(user.id);
    return { success: true };
  }

  @Get('team-activity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get team activity (manager/HR/admin view)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  async getTeamActivity(
    @CurrentUser() user: any,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    const activities = await this.presenceService.getTeamActivity(
      user.id,
      user.role,
      user.companyId,
      targetDate,
    );
    return { success: true, data: { activities } };
  }

  @Get('task-breakdown')
  @ApiOperation({ summary: 'Get task time breakdown for current user' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getTaskBreakdown(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const breakdown = await this.presenceService.getTaskTimeBreakdown(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: breakdown };
  }
}
