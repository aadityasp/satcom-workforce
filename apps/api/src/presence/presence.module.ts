/**
 * Presence Module - Real-time presence tracking via WebSocket
 *
 * Features:
 * - WebSocket gateway for real-time presence updates
 * - GPS capture in heartbeats
 * - Activity and status broadcasting
 * - Scheduled cleanup of stale sessions (cron job)
 *
 * Note: ScheduleModule.forRoot() is configured in AppModule
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from './presence.service';
import { PresenceGateway } from './presence.gateway';
import { PresenceController } from './presence.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceGateway],
  exports: [PresenceService],
})
export class PresenceModule {}
