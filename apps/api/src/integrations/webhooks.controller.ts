/**
 * Webhooks Controller
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
import { UserRole } from '@prisma/client';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register webhook' })
  async registerWebhook(
    @CurrentUser() user: any,
    @Body() dto: { url: string; events: string[]; secret?: string },
  ) {
    const result = await this.webhooksService.registerWebhook(
      user.companyId,
      dto.url,
      dto.events,
      dto.secret,
    );
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get webhooks' })
  async getWebhooks(@CurrentUser() user: any) {
    const result = await this.webhooksService.getWebhooks(user.companyId);
    return { success: true, data: result };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get available webhook events' })
  async getAvailableEvents() {
    const result = this.webhooksService.getAvailableEvents();
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook' })
  async updateWebhook(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    const result = await this.webhooksService.updateWebhook(
      id,
      user.companyId,
      dto,
    );
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.webhooksService.deleteWebhook(id, user.companyId);
    return { success: true };
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger webhook event' })
  async triggerEvent(
    @CurrentUser() user: any,
    @Body() dto: { eventType: string; data: any },
  ) {
    const result = await this.webhooksService.triggerEvent(
      user.companyId,
      dto.eventType,
      dto.data,
    );
    return { success: true, data: result };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  async getDeliveryHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.webhooksService.getDeliveryHistory(id, user.companyId);
    return { success: true, data: result };
  }
}
