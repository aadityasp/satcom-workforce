/**
 * Authentication Service
 *
 * Handles core authentication logic including login, token generation,
 * password hashing, device verification, and session management.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string;      // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  // Store for refresh tokens (in production, use Redis)
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  // Store for OTP codes (in production, use Redis)
  private otpCodes: Map<string, { code: string; expiresAt: Date; deviceFingerprint: string }> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Authenticate user with email and password
   */
  async login(loginDto: LoginDto) {
    const { email, password, deviceFingerprint } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        devices: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if device is verified
    let requiresOtp = false;
    if (deviceFingerprint) {
      const existingDevice = user.devices.find(
        (d) => d.fingerprint === deviceFingerprint && d.isVerified,
      );
      if (!existingDevice) {
        // New device - requires OTP verification
        requiresOtp = true;
        await this.sendOtp(user.id, user.phone || user.email, deviceFingerprint);
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'Login',
        entityType: 'User',
        entityId: user.id,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
          ? {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              designation: user.profile.designation,
              avatarUrl: user.profile.avatarUrl,
            }
          : null,
      },
      requiresOtp,
    };
  }

  /**
   * Verify OTP for new device
   */
  async verifyOtp(userId: string, verifyOtpDto: VerifyOtpDto) {
    const { otpCode, deviceFingerprint, deviceName } = verifyOtpDto;

    const storedOtp = this.otpCodes.get(userId);
    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOtp.expiresAt < new Date()) {
      this.otpCodes.delete(userId);
      throw new BadRequestException('OTP expired');
    }

    if (storedOtp.code !== otpCode) {
      throw new BadRequestException('Invalid OTP');
    }

    if (storedOtp.deviceFingerprint !== deviceFingerprint) {
      throw new BadRequestException('Device mismatch');
    }

    // Clear OTP
    this.otpCodes.delete(userId);

    // Register device as verified
    await this.prisma.deviceRecord.upsert({
      where: {
        userId_fingerprint: {
          userId,
          fingerprint: deviceFingerprint,
        },
      },
      create: {
        userId,
        fingerprint: deviceFingerprint,
        deviceName,
        platform: 'unknown', // Would be set from client
        isVerified: true,
        lastUsedAt: new Date(),
      },
      update: {
        isVerified: true,
        lastUsedAt: new Date(),
        deviceName,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'DeviceVerified',
        entityType: 'DeviceRecord',
        entityId: deviceFingerprint,
      },
    });

    return { verified: true };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const storedToken = this.refreshTokens.get(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or disabled');
    }

    // Generate new access token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h');

    return {
      accessToken,
      expiresIn: this.parseExpiresIn(expiresIn),
    };
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken?: string) {
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token (in production, send via email)
    const resetToken = uuidv4();
    // Store token with expiry (would use Redis in production)

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PasswordReset',
        entityType: 'User',
        entityId: user.id,
      },
    });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token: string, newPassword: string) {
    // TODO: Validate token and reset password
    throw new BadRequestException('Password reset not implemented');
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate JWT payload and return user
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));

    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt,
    });

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h');

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(expiresIn),
    };
  }

  /**
   * Send OTP for device verification
   */
  private async sendOtp(userId: string, contact: string, deviceFingerprint: string) {
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6);
    const otpExpiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);

    // Generate OTP
    const code = Math.random()
      .toString()
      .slice(2, 2 + otpLength);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + otpExpiryMinutes);

    this.otpCodes.set(userId, {
      code,
      expiresAt,
      deviceFingerprint,
    });

    // TODO: Send via SMS or email
    console.log(`OTP for ${contact}: ${code}`);

    return code;
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([hdms])/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 3600;
    }
  }
}
