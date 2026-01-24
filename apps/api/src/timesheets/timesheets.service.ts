/**
 * Timesheets Service
 *
 * Handles timesheet entry CRUD operations and validation.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';

@Injectable()
export class TimesheetsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new timesheet entry
   */
  async create(userId: string, createDto: CreateTimesheetDto) {
    // Validate task belongs to project
    const task = await this.prisma.task.findUnique({
      where: { id: createDto.taskId },
      include: { project: true },
    });

    if (!task || task.projectId !== createDto.projectId) {
      throw new BadRequestException('Task does not belong to project');
    }

    // Check daily total doesn't exceed 24 hours
    const existingEntries = await this.prisma.timesheetEntry.findMany({
      where: {
        userId,
        date: new Date(createDto.date),
      },
    });

    const existingMinutes = existingEntries.reduce((sum, e) => sum + e.minutes, 0);
    if (existingMinutes + createDto.minutes > 1440) {
      throw new BadRequestException('Total time exceeds 24 hours for this day');
    }

    const entry = await this.prisma.timesheetEntry.create({
      data: {
        userId,
        date: new Date(createDto.date),
        projectId: createDto.projectId,
        taskId: createDto.taskId,
        minutes: createDto.minutes,
        notes: createDto.notes,
      },
      include: {
        project: true,
        task: true,
      },
    });

    return entry;
  }

  /**
   * Get timesheet entries
   */
  async findAll(
    userId: string,
    options: {
      projectId?: string;
      startDate: Date;
      endDate: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { projectId, startDate, endDate, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const [entries, total] = await Promise.all([
      this.prisma.timesheetEntry.findMany({
        where,
        include: {
          project: true,
          task: true,
          attachments: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timesheetEntry.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update timesheet entry
   */
  async update(id: string, userId: string, updateDto: UpdateTimesheetDto) {
    const entry = await this.prisma.timesheetEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestException('Cannot update another user\'s entry');
    }

    // Validate daily total if minutes changed
    if (updateDto.minutes) {
      const existingEntries = await this.prisma.timesheetEntry.findMany({
        where: {
          userId,
          date: entry.date,
          id: { not: id },
        },
      });

      const existingMinutes = existingEntries.reduce((sum, e) => sum + e.minutes, 0);
      if (existingMinutes + updateDto.minutes > 1440) {
        throw new BadRequestException('Total time exceeds 24 hours');
      }
    }

    return this.prisma.timesheetEntry.update({
      where: { id },
      data: updateDto,
      include: {
        project: true,
        task: true,
      },
    });
  }

  /**
   * Delete timesheet entry
   */
  async remove(id: string, userId: string) {
    const entry = await this.prisma.timesheetEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestException('Cannot delete another user\'s entry');
    }

    await this.prisma.timesheetEntry.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Get all projects with their tasks for a company
   */
  async getProjectsWithTasks(companyId: string) {
    return this.prisma.project.findMany({
      where: { companyId, isActive: true },
      include: {
        tasks: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get timesheet summary
   */
  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: true,
        task: true,
      },
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

    // Group by project
    const byProject = entries.reduce((acc, e) => {
      const key = e.projectId;
      if (!acc[key]) {
        acc[key] = { projectId: key, projectName: e.project.name, minutes: 0 };
      }
      acc[key].minutes += e.minutes;
      return acc;
    }, {} as Record<string, any>);

    // Group by date
    const byDate = entries.reduce((acc, e) => {
      const key = e.date.toISOString().split('T')[0];
      if (!acc[key]) {
        acc[key] = { date: key, minutes: 0 };
      }
      acc[key].minutes += e.minutes;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalMinutes,
      byProject: Object.values(byProject),
      byDate: Object.values(byDate),
    };
  }
}
