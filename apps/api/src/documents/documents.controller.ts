/**
 * Documents Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { DocumentType, UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Upload document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
  ) {
    const result = await this.documentsService.uploadDocument(
      user.companyId,
      user.id,
      file,
      dto,
    );
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get documents' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDocuments(
    @CurrentUser() user: any,
    @Query('type') type?: DocumentType,
    @Query('categoryId') categoryId?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.documentsService.getDocuments(user.companyId, {
      type,
      categoryId,
      userId: user.role === UserRole.Employee ? user.id : userId,
      search,
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.documentsService.getDocument(id, user.companyId);
    return { success: true, data: result };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.documentsService.getDownloadUrl(id, user.companyId);
    return { success: true, data: result };
  }

  @Patch(':id')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.documentsService.updateDocument(
      id,
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.documentsService.deleteDocument(id, user.companyId);
    return { success: true };
  }

  @Post('categories')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create document category' })
  async createCategory(
    @CurrentUser() user: any,
    @Body() dto: { name: string; description?: string },
  ) {
    const result = await this.documentsService.createCategory(
      user.companyId,
      dto.name,
      dto.description,
    );
    return { success: true, data: result };
  }

  @Get('categories/all')
  @ApiOperation({ summary: 'Get document categories' })
  async getCategories(@CurrentUser() user: any) {
    const result = await this.documentsService.getCategories(user.companyId);
    return { success: true, data: result };
  }

  @Get('stats/summary')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get document statistics' })
  async getStats(@CurrentUser() user: any) {
    const result = await this.documentsService.getStats(user.companyId);
    return { success: true, data: result };
  }
}
