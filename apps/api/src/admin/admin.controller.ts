/**
 * Admin Controller
 */
import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('policies/work')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get work policy' })
  async getWorkPolicy(@CurrentUser() user: any) {
    const data = await this.adminService.getWorkPolicy(user.companyId);
    return { success: true, data };
  }

  @Patch('policies/work')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update work policy' })
  async updateWorkPolicy(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.adminService.updateWorkPolicy(user.companyId, body, user.id);
    return { success: true, data };
  }

  @Get('policies/geofence')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get geofence policy' })
  async getGeofencePolicy(@CurrentUser() user: any) {
    const data = await this.adminService.getGeofencePolicy(user.companyId);
    return { success: true, data };
  }

  @Patch('policies/geofence')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update geofence policy' })
  async updateGeofencePolicy(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.adminService.updateGeofencePolicy(user.companyId, body, user.id);
    return { success: true, data };
  }

  @Get('office-locations')
  @ApiOperation({ summary: 'Get office locations' })
  async getOfficeLocations(@CurrentUser() user: any) {
    const data = await this.adminService.getOfficeLocations(user.companyId);
    return { success: true, data };
  }

  @Post('office-locations')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create office location' })
  async createOfficeLocation(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.adminService.createOfficeLocation(user.companyId, body, user.id);
    return { success: true, data };
  }

  @Get('anomaly-rules')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get anomaly rules' })
  async getAnomalyRules(@CurrentUser() user: any) {
    const data = await this.adminService.getAnomalyRules(user.companyId);
    return { success: true, data };
  }

  @Patch('anomaly-rules/:id')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update anomaly rule' })
  async updateAnomalyRule(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    const data = await this.adminService.updateAnomalyRule(id, user.companyId, body, user.id);
    return { success: true, data };
  }

  @Get('audit-logs')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.adminService.getAuditLogs(user.companyId, {
      actorId,
      action,
      entityType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Get('dashboard/summary')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get dashboard summary' })
  async getDashboardSummary(@CurrentUser() user: any) {
    const data = await this.adminService.getDashboardSummary(user.companyId);
    return { success: true, data };
  }
}
