/**
 * Training Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole, TrainingStatus } from '@prisma/client';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create training program' })
  async createTraining(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.trainingService.createTraining(
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get training programs' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getTrainings(
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.trainingService.getTrainings(user.companyId, {
      categoryId,
      search,
    });
    return { success: true, data: result };
  }

  @Post('assign')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Assign training to employees' })
  async assignTraining(
    @CurrentUser() user: any,
    @Body() dto: { trainingId: string; userIds: string[]; dueDate?: string },
  ) {
    const result = await this.trainingService.assignTraining(
      dto.trainingId,
      user.companyId,
      user.id,
      {
        userIds: dto.userIds,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    );
    return { success: true, data: result };
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get training assignments' })
  @ApiQuery({ name: 'status', required: false })
  async getAssignments(
    @CurrentUser() user: any,
    @Query('status') status?: TrainingStatus,
  ) {
    const result = await this.trainingService.getUserTrainings(user.id, {
      status,
    });
    return { success: true, data: result };
  }

  @Patch('assignments/:id/progress')
  @ApiOperation({ summary: 'Update training progress' })
  async updateProgress(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { progress: number; notes?: string },
  ) {
    const result = await this.trainingService.updateProgress(
      id,
      user.id,
      dto.progress,
      dto.notes,
    );
    return { success: true, data: result };
  }

  @Post('certifications')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create certification' })
  async createCertification(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.trainingService.createCertification(
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get('certifications')
  @ApiOperation({ summary: 'Get certifications' })
  async getCertifications(@CurrentUser() user: any) {
    const result = await this.trainingService.getUserCertifications(user.id);
    return { success: true, data: result };
  }

  @Post('certifications/award')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Award certification to employee' })
  async awardCertification(
    @CurrentUser() user: any,
    @Body() dto: {
      certificationId: string;
      userId: string;
      issuedDate: string;
      expiryDate?: string;
      certificateUrl?: string;
    },
  ) {
    const result = await this.trainingService.awardCertification(
      dto.certificationId,
      user.companyId,
      user.id,
      {
        userId: dto.userId,
        issuedDate: new Date(dto.issuedDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        certificateUrl: dto.certificateUrl,
      },
    );
    return { success: true, data: result };
  }

  @Get('certifications/user')
  @ApiOperation({ summary: 'Get current user certifications' })
  @ApiQuery({ name: 'userId', required: false })
  async getUserCertifications(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === UserRole.Employee ? user.id : (userId || user.id);
    const result = await this.trainingService.getUserCertifications(targetUserId);
    return { success: true, data: result };
  }

  @Get('compliance')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get training compliance report' })
  async getComplianceReport(@CurrentUser() user: any) {
    const result = await this.trainingService.getComplianceReport(user.companyId);
    return { success: true, data: result };
  }
}
