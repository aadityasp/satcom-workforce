/**
 * Timesheets Controller
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Timesheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create timesheet entry' })
  async create(
    @CurrentUser() user: any,
    @Body() createDto: CreateTimesheetDto,
  ) {
    const result = await this.timesheetsService.create(user.id, createDto);
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get timesheet entries' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.timesheetsService.findAll(user.id, {
      projectId,
      startDate: start,
      endDate: end,
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get timesheet summary' })
  async getSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const summaryEnd = endDate ? new Date(endDate) : new Date();
    const summaryStart = startDate ? new Date(startDate) : new Date(summaryEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.timesheetsService.getSummary(
      user.id,
      summaryStart,
      summaryEnd,
    );
    return { success: true, data: result };
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get available projects with tasks' })
  async getProjects(@CurrentUser() user: any) {
    const result = await this.timesheetsService.getProjectsWithTasks(user.companyId);
    return { success: true, data: result };
  }

  @Get('attachment/*')
  @ApiOperation({ summary: 'Get presigned download URL for attachment' })
  async getAttachmentUrl(@Param('0') objectKey: string, @CurrentUser() user: any) {
    const url = await this.timesheetsService.getAttachmentDownloadUrl(objectKey, user.id);
    return { success: true, data: { url } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single timesheet entry' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.timesheetsService.findOne(id, user.id);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update timesheet entry' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateTimesheetDto,
  ) {
    const result = await this.timesheetsService.update(id, user.id, updateDto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete timesheet entry' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.timesheetsService.remove(id, user.id);
    return { success: true, data: result };
  }
}
