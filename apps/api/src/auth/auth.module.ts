/**
 * Authentication Module
 *
 * Handles user authentication, JWT token management, device verification,
 * and password reset functionality.
 *
 * Global guards are registered here:
 * - JwtAuthGuard: Protects all routes by default (use @Public() to bypass)
 * - RolesGuard: Enforces role-based access (use @Roles() to specify)
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    RolesGuard,
    // Global throttle guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth guard (use @Public() to bypass)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard (use @Roles() to enforce)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtRefreshGuard, RolesGuard],
})
export class AuthModule {}
