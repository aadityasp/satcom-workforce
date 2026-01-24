/**
 * Anomalies Controller
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AnomalyStatus } from '@prisma/client';
import { AnomaliesService } from './anomalies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Anomalies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SuperAdmin)
@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get()
  @ApiOperation({ summary: 'Get anomaly events' })
  async findAll(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
    @Query('status') status?: AnomalyStatus,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.anomaliesService.findAll(user.companyId, {
      userId, status, type, severity, page, limit,
    });
    return { success: true, ...result };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get anomaly summary' })
  async getSummary(@CurrentUser() user: any) {
    const data = await this.anomaliesService.getSummary(user.companyId);
    return { success: true, data };
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge anomaly' })
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { notes?: string },
  ) {
    const data = await this.anomaliesService.acknowledge(id, user.id, body.notes);
    return { success: true, data };
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve anomaly' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { notes: string },
  ) {
    const data = await this.anomaliesService.resolve(id, user.id, body.notes);
    return { success: true, data };
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss anomaly' })
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason: string },
  ) {
    const data = await this.anomaliesService.dismiss(id, user.id, body.reason);
    return { success: true, data };
  }
}
