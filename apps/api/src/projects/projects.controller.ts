/**
 * Projects Controller
 *
 * Admin-only endpoints for managing projects and tasks.
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
import { UserRole } from '@prisma/client';

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Projects (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('admin/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ===== Projects =====

  @Post()
  @ApiOperation({ summary: 'Create project (SuperAdmin only)' })
  async createProject(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    const result = await this.projectsService.createProject(user.companyId, dto);
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAllProjects(
    @CurrentUser() user: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const result = await this.projectsService.findAllProjects(
      user.companyId,
      includeInactive === 'true',
    );
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findProject(@Param('id') id: string) {
    const result = await this.projectsService.findProjectById(id);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const result = await this.projectsService.updateProject(id, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate project (soft delete)' })
  async deactivateProject(@Param('id') id: string) {
    const result = await this.projectsService.deactivateProject(id);
    return { success: true, data: result };
  }

  // ===== Tasks =====

  @Post('tasks')
  @ApiOperation({ summary: 'Create task in project' })
  async createTask(@Body() dto: CreateTaskDto) {
    const result = await this.projectsService.createTask(dto);
    return { success: true, data: result };
  }

  @Get(':projectId/tasks')
  @ApiOperation({ summary: 'List tasks in project' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findTasks(
    @Param('projectId') projectId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const result = await this.projectsService.findTasksByProject(
      projectId,
      includeInactive === 'true',
    );
    return { success: true, data: result };
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const result = await this.projectsService.updateTask(id, dto);
    return { success: true, data: result };
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Deactivate task (soft delete)' })
  async deactivateTask(@Param('id') id: string) {
    const result = await this.projectsService.deactivateTask(id);
    return { success: true, data: result };
  }
}
