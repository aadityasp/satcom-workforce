/**
 * Leaves Controller
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, LeaveRequestStatus } from '@prisma/client';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get leave types' })
  async getTypes(@CurrentUser() user: any) {
    const data = await this.leavesService.getLeaveTypes(user.companyId);
    return { success: true, data };
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get leave balances' })
  async getBalance(@CurrentUser() user: any) {
    const balances = await this.leavesService.getBalances(user.id);
    return { success: true, data: { balances } };
  }

  @Post('request')
  @ApiOperation({ summary: 'Create leave request' })
  async createRequest(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.leavesService.createRequest(user.id, body);
    return { success: true, data };
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get leave requests' })
  async getRequests(
    @CurrentUser() user: any,
    @Query('status') status?: LeaveRequestStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.leavesService.getRequests(user.id, { status, page, limit });
    return { success: true, ...result };
  }

  @Get('requests/pending')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get all pending leave requests for approval' })
  async getPendingRequests(@CurrentUser() user: any) {
    const data = await this.leavesService.getAllPendingRequests(user.companyId);
    return { success: true, data };
  }

  @Post('requests/:id/approve')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Approve leave request' })
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.leavesService.approveRequest(id, user.id);
    return { success: true, data };
  }

  @Post('requests/:id/reject')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Reject leave request' })
  async reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { reason: string }) {
    const data = await this.leavesService.rejectRequest(id, user.id, body.reason);
    return { success: true, data };
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Get holiday calendar' })
  async getHolidays(@CurrentUser() user: any, @Query('year') year?: number) {
    const data = await this.leavesService.getHolidays(user.companyId, year || new Date().getFullYear());
    return { success: true, data };
  }
}
