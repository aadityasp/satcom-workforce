/**
 * Authentication Service
 *
 * Handles core authentication logic including login, token generation,
 * password hashing, device verification, and session management.
 *
 * Uses database-backed refresh tokens for secure session management.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/**
 * JWT payload structure for access tokens
 */
export interface JwtPayload {
  sub: string;      // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT payload structure for refresh tokens
 */
export interface RefreshTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Store for OTP codes (in production, use Redis)
  private otpCodes: Map<string, { code: string; expiresAt: Date; deviceFingerprint: string }> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
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
   * Refresh access token using refresh token (with token rotation)
   */
  async refreshToken(refreshToken: string) {
    // Verify JWT signature
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find all non-expired refresh tokens for this user
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    // Find the matching token by comparing hashes
    let matchingToken = null;
    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isMatch) {
        matchingToken = token;
        break;
      }
    }

    if (!matchingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or disabled');
    }

    // Token rotation: delete old token
    await this.prisma.refreshToken.delete({
      where: { id: matchingToken.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Validate refresh token for strategy
   */
  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Logout - invalidate refresh token from database
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Find and delete the specific refresh token
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId },
      });

      for (const token of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
        if (isMatch) {
          await this.prisma.refreshToken.delete({
            where: { id: token.id },
          });
          break;
        }
      }
    } else {
      // No specific token provided - delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices - delete all refresh tokens
   */
  async logoutAllDevices(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

  /**
   * Request password reset - send email with secure token
   * Returns same response regardless of email existence (no enumeration)
   */
  async requestPasswordReset(email: string) {
    // Always return same response to prevent email enumeration
    const genericResponse = { message: 'If the email exists, a reset link has been sent' };

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Add slight delay to match timing of successful case
      await new Promise(resolve => setTimeout(resolve, 100));
      return genericResponse;
    }

    // Delete any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate reset token (random string, not JWT)
    const resetToken = uuidv4() + '-' + uuidv4(); // Long random token
    const tokenHash = await bcrypt.hash(resetToken, 10);

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send email (async, don't wait for delivery)
    this.emailService.sendPasswordResetEmail(user.email, resetToken).catch(err => {
      this.logger.error(`Failed to send password reset email: ${err.message}`);
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PasswordResetRequested',
        entityType: 'User',
        entityId: user.id,
      },
    });

    return genericResponse;
  }

  /**
   * Confirm password reset with token
   * Validates token, updates password, invalidates all sessions
   */
  async confirmPasswordReset(token: string, newPassword: string) {
    // Find all non-expired, unused tokens
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    // Find matching token (compare hash)
    let matchingToken = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(token, t.tokenHash);
      if (isMatch) {
        matchingToken = t;
        break;
      }
    }

    if (!matchingToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: matchingToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: matchingToken.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all refresh tokens for this user (force re-login)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: matchingToken.userId },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: matchingToken.userId,
        action: 'PasswordReset',
        entityType: 'User',
        entityId: matchingToken.userId,
      },
    });

    return { message: 'Password reset successful. Please login with your new password.' };
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
   * Generate access and refresh tokens with database-backed storage
   */
  private async generateTokens(user: { id: string; email: string; role: string }) {
    // Access token payload includes role for authorization
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    // Refresh token payload (minimal - no role, longer lived)
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Hash refresh token before storing in database
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store hashed refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

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
