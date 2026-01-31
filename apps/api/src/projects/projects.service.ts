/**
 * Projects Service
 *
 * Handles project and task CRUD operations for admin management.
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // ===== Projects =====

  /**
   * Create a new project
   */
  async createProject(companyId: string, dto: CreateProjectDto) {
    // Check code uniqueness
    const existing = await this.prisma.project.findUnique({
      where: { code: dto.code }
    });
    if (existing) {
      throw new ConflictException('Project code already exists');
    }

    return this.prisma.project.create({
      data: {
        companyId,
        ...dto
      },
      include: {
        tasks: true,
        manager: {
          include: { profile: true }
        }
      },
    });
  }

  /**
   * Get all projects for a company
   */
  async findAllProjects(companyId: string, includeInactive = false) {
    return this.prisma.project.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        tasks: {
          where: includeInactive ? {} : { isActive: true }
        },
        manager: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a project by ID
   */
  async findProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        manager: {
          include: { profile: true }
        }
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, dto: UpdateProjectDto) {
    await this.findProjectById(id); // Verify exists

    // Check code uniqueness if code is being updated
    if (dto.code) {
      const existing = await this.prisma.project.findFirst({
        where: {
          code: dto.code,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Project code already exists');
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: {
        tasks: true,
        manager: {
          include: { profile: true }
        }
      },
    });
  }

  /**
   * Deactivate a project (soft delete)
   */
  async deactivateProject(id: string) {
    return this.updateProject(id, { isActive: false });
  }

  // ===== Tasks =====

  /**
   * Create a new task
   */
  async createTask(dto: CreateTaskDto) {
    // Verify project exists
    await this.findProjectById(dto.projectId);

    // Check code uniqueness within project
    const existing = await this.prisma.task.findUnique({
      where: {
        projectId_code: {
          projectId: dto.projectId,
          code: dto.code
        }
      },
    });
    if (existing) {
      throw new ConflictException('Task code already exists in this project');
    }

    return this.prisma.task.create({
      data: dto,
      include: { project: true },
    });
  }

  /**
   * Get a task by ID
   */
  async findTaskById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  /**
   * Update a task
   */
  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.findTaskById(id);

    // Check code uniqueness if code is being updated
    if (dto.code) {
      const existing = await this.prisma.task.findFirst({
        where: {
          projectId: task.projectId,
          code: dto.code,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Task code already exists in this project');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: dto,
      include: { project: true },
    });
  }

  /**
   * Deactivate a task (soft delete)
   */
  async deactivateTask(id: string) {
    return this.updateTask(id, { isActive: false });
  }

  /**
   * Get all tasks for a project
   */
  async findTasksByProject(projectId: string, includeInactive = false) {
    return this.prisma.task.findMany({
      where: {
        projectId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: { name: 'asc' },
    });
  }
}
