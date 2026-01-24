/**
 * Login DTO
 *
 * Validates login request payload.
 */

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@satcom.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint for device verification',
    example: 'abc123xyz',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
