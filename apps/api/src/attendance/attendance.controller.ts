/**
 * Attendance Controller
 *
 * Handles HTTP endpoints for attendance operations.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StartBreakDto } from './dto/start-break.dto';
import { OverrideAttendanceDto } from './dto/override-attendance.dto';
import {
  AttendanceDayResponseDto,
  CheckInResponseDto,
  CheckOutResponseDto,
} from './dto/attendance-day.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Check in for the day
   */
  @Post('check-in')
  @ApiOperation({ summary: 'Check in for the day' })
  async checkIn(
    @CurrentUser() user: any,
    @Body() checkInDto: CheckInDto,
  ) {
    const result = await this.attendanceService.checkIn(
      user.id,
      user.companyId,
      checkInDto,
    );
    return { success: true, data: result };
  }

  /**
   * Check out for the day
   */
  @Post('check-out')
  @ApiOperation({ summary: 'Check out for the day' })
  @ApiOkResponse({ type: CheckOutResponseDto, description: 'Check-out response with summary' })
  async checkOut(
    @CurrentUser() user: any,
    @Body() checkOutDto: CheckOutDto,
  ) {
    const result = await this.attendanceService.checkOut(user.id, user.companyId, checkOutDto);
    return { success: true, data: result };
  }

  /**
   * Start a break
   */
  @Post('break/start')
  @ApiOperation({ summary: 'Start a break' })
  async startBreak(
    @CurrentUser() user: any,
    @Body() startBreakDto: StartBreakDto,
  ) {
    const result = await this.attendanceService.startBreak(user.id, startBreakDto);
    return { success: true, data: result };
  }

  /**
   * End a break
   */
  @Post('break/:breakId/end')
  @ApiOperation({ summary: 'End a break' })
  async endBreak(
    @CurrentUser() user: any,
    @Param('breakId') breakId: string,
  ) {
    const result = await this.attendanceService.endBreak(user.id, user.companyId, breakId);
    return { success: true, data: result };
  }

  /**
   * Get today's attendance with full context
   */
  @Get('today')
  @ApiOperation({ summary: "Get today's attendance with full context" })
  @ApiOkResponse({ type: AttendanceDayResponseDto, description: 'Attendance day with policy' })
  async getToday(@CurrentUser() user: any) {
    const result = await this.attendanceService.getToday(user.id, user.companyId);
    return { success: true, data: result };
  }

  /**
   * Get attendance history
   */
  @Get()
  @ApiOperation({ summary: 'Get attendance history' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @CurrentUser() user: any,
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Non-HR/Admin can only view own attendance
    const targetUserId =
      user.role === UserRole.HR || user.role === UserRole.SuperAdmin
        ? userId || user.id
        : user.id;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.attendanceService.getHistory(targetUserId, {
      startDate: start,
      endDate: end,
      page,
      limit,
    });

    return { success: true, ...result };
  }

  /**
   * Get attendance summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @CurrentUser() user: any,
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const targetUserId =
      user.role === UserRole.HR || user.role === UserRole.SuperAdmin
        ? userId || user.id
        : user.id;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.attendanceService.getSummary(
      targetUserId,
      start,
      end,
    );

    return { success: true, data: result };
  }

  /**
   * Override attendance event (HR/Admin)
   */
  @Patch(':eventId/override')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Override attendance event' })
  async override(
    @Param('eventId') eventId: string,
    @Body() overrideDto: OverrideAttendanceDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.attendanceService.overrideAttendance(
      eventId,
      overrideDto,
      user.id,
    );
    return { success: true, data: result };
  }

  /**
   * Get check-in locations for map visualization (Super Admin only)
   */
  @Get('locations')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get check-in locations for map' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO string)' })
  async getCheckInLocations(
    @CurrentUser() user: { companyId: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Default to last 7 days if no dates provided
    const locEnd = endDate ? new Date(endDate) : new Date();
    const locStart = startDate ? new Date(startDate) : new Date(locEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const locations = await this.attendanceService.getCheckInLocations(
      user.companyId,
      {
        startDate: locStart,
        endDate: locEnd,
      },
    );
    return { success: true, data: locations };
  }
}
