import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PostStatusDto {
  @ApiProperty({ description: 'Status message text', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  message: string;
}
