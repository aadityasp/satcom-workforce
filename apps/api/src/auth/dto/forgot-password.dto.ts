/**
 * Forgot Password DTO
 *
 * Request body for initiating password reset.
 */

import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@satcom.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
