/**
 * Verify OTP DTO
 *
 * Validates OTP verification request.
 */

import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'OTP code sent to user',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  otpCode: string;

  @ApiProperty({
    description: 'Device fingerprint',
    example: 'abc123xyz',
  })
  @IsString()
  deviceFingerprint: string;

  @ApiProperty({
    description: 'User-friendly device name',
    example: 'iPhone 15 Pro',
  })
  @IsString()
  deviceName: string;
}
