import { IsString, IsOptional, IsDateString, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimesheetDto {
  @ApiProperty({ description: 'Date of the timesheet entry (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: 'Start time (ISO datetime string, e.g., 2026-01-24T09:00:00)' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time (ISO datetime string, e.g., 2026-01-24T17:00:00)' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Notes about the work done' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Array of MinIO object keys for file attachments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentKeys?: string[];
}
