/**
 * Storage Controller
 */
import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get presigned upload URL' })
  async getUploadUrl(@Body() body: { folder: string; fileName: string; fileType: string; fileSize: number }) {
    const { folder, fileName, fileType, fileSize } = body;

    if (!ALLOWED_TYPES.includes(fileType)) {
      throw new BadRequestException('File type not allowed');
    }

    if (fileSize > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    const result = await this.storageService.getUploadUrl(folder, fileName, fileType);
    return { success: true, data: result };
  }

  @Get('download-url')
  @ApiOperation({ summary: 'Get presigned download URL' })
  async getDownloadUrl(@Query('objectKey') objectKey: string) {
    const url = await this.storageService.getDownloadUrl(objectKey);
    return { success: true, data: { downloadUrl: url } };
  }
}
