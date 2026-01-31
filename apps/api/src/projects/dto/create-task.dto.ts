import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Project ID this task belongs to' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ minLength: 3, maxLength: 50, description: 'Task name' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({ minLength: 2, maxLength: 10, description: 'Task code (unique within project, e.g., DEV, QA)' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;
}
