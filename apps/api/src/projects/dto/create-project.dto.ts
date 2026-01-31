import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ minLength: 3, maxLength: 50, description: 'Project name' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({ minLength: 2, maxLength: 10, description: 'Unique project code (e.g., PROJ-001)' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Manager user ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
