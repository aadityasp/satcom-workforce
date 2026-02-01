/**
 * Integrations Module
 *
 * Third-party integrations and API webhooks.
 */

import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController, WebhooksController],
  providers: [IntegrationsService, WebhooksService],
  exports: [IntegrationsService, WebhooksService],
})
export class IntegrationsModule {}
