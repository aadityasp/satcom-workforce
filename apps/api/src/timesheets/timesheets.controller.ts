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
    const result = await this.timesheetsService.findAll(user.id, {
      projectId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
    const result = await this.timesheetsService.getSummary(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: result };
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get available projects with tasks' })
  async getProjects(@CurrentUser() user: any) {
    const result = await this.timesheetsService.getProjectsWithTasks(user.companyId);
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
