/**
 * JWT Refresh Strategy
 *
 * Passport strategy for validating refresh tokens.
 * Used to exchange refresh tokens for new access tokens.
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Validate refresh token payload and extract token for database lookup
   */
  async validate(req: Request, payload: RefreshTokenPayload) {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    return {
      userId: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
