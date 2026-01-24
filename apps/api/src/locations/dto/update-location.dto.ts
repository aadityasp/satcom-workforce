import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @ApiPropertyOptional({ description: 'Whether the location is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
