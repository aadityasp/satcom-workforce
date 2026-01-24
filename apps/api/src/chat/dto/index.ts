/**
 * Chat DTOs - Request validation for chat operations
 */
import { IsString, IsOptional, IsArray, IsUUID, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ enum: ChatMessageType })
  @IsEnum(ChatMessageType)
  type: ChatMessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentType?: string;

  @ApiPropertyOptional({ description: 'Client-generated ID for idempotency' })
  @IsOptional()
  @IsString()
  tempId?: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class CreateDirectThreadDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class CreateGroupThreadDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
