import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['projectId'])) {
  @ApiPropertyOptional({ description: 'Whether the task is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
