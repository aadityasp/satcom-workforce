/**
 * Reset Password DTO
 *
 * Request body for confirming password reset with token.
 */

import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password (8-72 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt limit
  newPassword: string;
}
