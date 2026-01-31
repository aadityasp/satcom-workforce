/**
 * Integrations Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, IntegrationStatus } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create integration' })
  async createIntegration(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.integrationsService.createIntegration(
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get integrations' })
  async getIntegrations(@CurrentUser() user: any) {
    const result = await this.integrationsService.getIntegrations(user.companyId);
    return { success: true, data: result };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available integration types' })
  async getAvailableIntegrations() {
    const result = this.integrationsService.getAvailableIntegrations();
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration by ID' })
  async getIntegration(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const integrations = await this.integrationsService.getIntegrations(user.companyId);
    const integration = integrations.find((i: any) => i.id === id);
    return { success: true, data: integration };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update integration status' })
  async updateIntegration(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { status: IntegrationStatus; errorMessage?: string },
  ) {
    const result = await this.integrationsService.updateStatus(
      id,
      user.companyId,
      dto.status,
      dto.errorMessage,
    );
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration' })
  async deleteIntegration(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.integrationsService.deleteIntegration(id, user.companyId);
    return { success: true };
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger integration sync' })
  async syncIntegration(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.integrationsService.syncIntegration(id, user.companyId);
    return { success: true, data: result };
  }
}
