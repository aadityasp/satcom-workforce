/**
 * Scheduling Controller
 *
 * HTTP endpoints for shift management, templates, and swap requests.
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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole, ShiftStatus, ShiftSwapStatus } from '@prisma/client';
import { SchedulingService } from './scheduling.service';
import { ShiftTemplatesService } from './shift-templates.service';
import { ShiftSwapsService } from './shift-swaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scheduling')
export class SchedulingController {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly templatesService: ShiftTemplatesService,
    private readonly swapsService: ShiftSwapsService,
  ) {}

  // ============================================================
  // Shifts
  // ============================================================

  @Post('shifts')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create a new shift' })
  async createShift(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.schedulingService.createShift(
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get('shifts')
  @ApiOperation({ summary: 'Get shifts' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getShifts(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: ShiftStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Employees can only see their own shifts unless they're managers
    const targetUserId =
      user.role === UserRole.Employee && !userId
        ? user.id
        : userId;

    // Default to current month if no dates provided
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const result = await this.schedulingService.getShifts(user.companyId, {
      startDate: start,
      endDate: end,
      userId: targetUserId,
      departmentId,
      locationId,
      status,
      page,
      limit,
    });

    return { success: true, ...result };
  }

  @Get('shifts/:id')
  @ApiOperation({ summary: 'Get shift by ID' })
  async getShift(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.schedulingService.getShift(id, user.companyId);
    return { success: true, data: result };
  }

  @Patch('shifts/:id')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update shift' })
  async updateShift(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.schedulingService.updateShift(
      id,
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Delete('shifts/:id')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Cancel shift' })
  async cancelShift(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    const result = await this.schedulingService.cancelShift(
      id,
      user.companyId,
      user.id,
      reason,
    );
    return { success: true, data: result };
  }

  @Post('shifts/:id/clock-in')
  @ApiOperation({ summary: 'Clock in for shift' })
  async clockIn(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('latitude') latitude?: number,
    @Body('longitude') longitude?: number,
  ) {
    const result = await this.schedulingService.clockIn(
      id,
      user.id,
      latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
    );
    return { success: true, data: result };
  }

  @Post('shifts/:id/clock-out')
  @ApiOperation({ summary: 'Clock out for shift' })
  async clockOut(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('latitude') latitude?: number,
    @Body('longitude') longitude?: number,
  ) {
    const result = await this.schedulingService.clockOut(
      id,
      user.id,
      latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
    );
    return { success: true, data: result };
  }

  // ============================================================
  // Auto Scheduling
  // ============================================================

  @Post('auto-schedule')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Generate AI-optimized schedule' })
  async autoSchedule(
    @CurrentUser() user: any,
    @Body() dto: {
      startDate: string;
      endDate: string;
      minStaffCount: number;
      maxStaffCount: number;
      shiftDuration: number;
      breakDuration: number;
      optimizeFor?: 'cost' | 'preference' | 'coverage' | 'balanced';
    },
  ) {
    const result = await this.schedulingService.autoSchedule(
      user.companyId,
      user.id,
      new Date(dto.startDate),
      new Date(dto.endDate),
      {
        minStaffCount: dto.minStaffCount,
        maxStaffCount: dto.maxStaffCount,
        shiftDuration: dto.shiftDuration,
        breakDuration: dto.breakDuration,
        optimizeFor: dto.optimizeFor,
      },
    );
    return { success: true, data: result };
  }

  @Get('analytics')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get scheduling analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Default to current month if no dates provided
    const analyticsEnd = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const analyticsStart = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const result = await this.schedulingService.getAnalytics(
      user.companyId,
      analyticsStart,
      analyticsEnd,
    );
    return { success: true, data: result };
  }

  // ============================================================
  // Shift Templates
  // ============================================================

  @Post('templates')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create shift template' })
  async createTemplate(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.templatesService.create(user.companyId, user.id, dto);
    return { success: true, data: result };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get shift templates' })
  async getTemplates(@CurrentUser() user: any) {
    const result = await this.templatesService.findAll(user.companyId);
    return { success: true, data: result };
  }

  @Post('templates/:id/apply')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Apply template to create shifts' })
  async applyTemplate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: {
      startDate: string;
      endDate: string;
      userIds: string[];
    },
  ) {
    const result = await this.schedulingService.createShiftsFromTemplate(
      user.companyId,
      user.id,
      id,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.userIds,
    );
    return { success: true, data: result };
  }

  // ============================================================
  // Shift Swaps
  // ============================================================

  @Post('swaps')
  @ApiOperation({ summary: 'Request a shift swap' })
  async requestSwap(
    @CurrentUser() user: any,
    @Body() dto: {
      shiftId: string;
      requestedToUserId: string;
      reason?: string;
    },
  ) {
    const result = await this.swapsService.requestSwap(
      user.id,
      user.companyId,
      dto,
    );
    return { success: true, data: result };
  }

  @Post('swaps/:id/respond')
  @ApiOperation({ summary: 'Respond to swap request' })
  async respondToSwap(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { accept: boolean; reason?: string },
  ) {
    const result = await this.swapsService.respondToSwap(id, user.id, dto);
    return { success: true, data: result };
  }

  @Post('swaps/:id/approve')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Approve/reject swap request' })
  async approveSwap(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { approved: boolean; notes?: string },
  ) {
    const result = await this.swapsService.approveSwap(
      id,
      user.id,
      dto.approved,
      dto.notes,
    );
    return { success: true, data: result };
  }

  @Delete('swaps/:id')
  @ApiOperation({ summary: 'Cancel swap request' })
  async cancelSwap(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.swapsService.cancelSwap(id, user.id);
    return { success: true, data: result };
  }

  @Get('swaps')
  @ApiOperation({ summary: 'Get swap requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSwapRequests(
    @CurrentUser() user: any,
    @Query('status') status?: ShiftSwapStatus,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.swapsService.getSwapRequests(user.companyId, {
      status,
      userId: userId || (user.role === UserRole.Employee ? user.id : undefined),
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Get('swaps/:id')
  @ApiOperation({ summary: 'Get swap request by ID' })
  async getSwapRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.swapsService.getSwapRequest(id, user.companyId);
    return { success: true, data: result };
  }

  @Get('swaps/available-employees/:shiftId')
  @ApiOperation({ summary: 'Get available employees for swap' })
  async getAvailableEmployees(
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.swapsService.getAvailableEmployees(
      shiftId,
      user.companyId,
    );
    return { success: true, data: result };
  }
}
