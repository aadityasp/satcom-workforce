/**
 * Password Reset DTO
 *
 * Validates password reset request.
 */

import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'john.doe@satcom.com',
  })
  @IsEmail()
  email: string;
}
