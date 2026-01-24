/**
 * JWT Refresh Guard
 *
 * Protects the token refresh endpoint.
 * Validates refresh tokens using the jwt-refresh strategy.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
