import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SetActivityDto {
  @ApiProperty({ description: 'Project ID to set as current activity' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: 'Task ID within the project' })
  @IsOptional()
  @IsString()
  taskId?: string;
}
