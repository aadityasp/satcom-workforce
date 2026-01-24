import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimesheetDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  taskId: string;

  @ApiProperty()
  @IsNumber()
  @Min(15)
  @Max(1440)
  minutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
