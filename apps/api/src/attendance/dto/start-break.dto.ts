/**
 * Start Break DTO
 */

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BreakType } from '@prisma/client';

export class StartBreakDto {
  @ApiProperty({ enum: BreakType })
  @IsEnum(BreakType)
  type: BreakType;
}
