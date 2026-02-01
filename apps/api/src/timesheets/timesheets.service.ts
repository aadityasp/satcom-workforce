/**
 * Timesheets Service
 *
 * Handles timesheet entry CRUD operations and validation.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { differenceInMinutes, startOfDay, isSameDay } from 'date-fns';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';

@Injectable()
export class TimesheetsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Create a new timesheet entry
   */
  async create(userId: string, createDto: CreateTimesheetDto) {
    // Calculate minutes from start/end times
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);
    const minutes = differenceInMinutes(endTime, startTime);

    if (minutes <= 0) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate taskId is required (per database schema)
    if (!createDto.taskId) {
      throw new BadRequestException('Task ID is required');
    }

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
    if (existingMinutes + minutes > 1440) {
      throw new BadRequestException('Total time exceeds 24 hours for this day');
    }

    // Create the entry
    const entry = await this.prisma.timesheetEntry.create({
      data: {
        userId,
        date: new Date(createDto.date),
        projectId: createDto.projectId,
        taskId: createDto.taskId,
        minutes,
        notes: createDto.notes,
      },
      include: {
        project: true,
        task: true,
        attachments: true,
      },
    });

    // Link attachments if provided
    if (createDto.attachmentKeys && createDto.attachmentKeys.length > 0) {
      await this.prisma.timesheetAttachment.createMany({
        data: createDto.attachmentKeys.map((objectKey) => ({
          timesheetEntryId: entry.id,
          fileName: objectKey.split('/').pop() || objectKey,
          fileUrl: objectKey,
          fileType: this.getFileTypeFromKey(objectKey),
          fileSize: 0, // Size unknown from key, can be fetched later if needed
        })),
      });

      // Fetch entry with attachments
      return this.prisma.timesheetEntry.findUnique({
        where: { id: entry.id },
        include: {
          project: true,
          task: true,
          attachments: true,
        },
      });
    }

    return entry;
  }

  /**
   * Helper to determine file type from object key
   */
  private getFileTypeFromKey(objectKey: string): string {
    const extension = objectKey.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return typeMap[extension] || 'application/octet-stream';
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
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 50;
    const { projectId, startDate, endDate } = options;
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
      include: { attachments: true },
    });

    if (!entry) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestException('Cannot update another user\'s entry');
    }

    // Same-day check: can only edit today's entries
    const today = startOfDay(new Date());
    if (!isSameDay(entry.date, today)) {
      throw new BadRequestException('Can only edit today\'s entries');
    }

    // Calculate minutes if start/end times changed
    let minutes: number | undefined;
    if (updateDto.startTime && updateDto.endTime) {
      const startTime = new Date(updateDto.startTime);
      const endTime = new Date(updateDto.endTime);
      const diff = differenceInMinutes(endTime, startTime);

      if (diff <= 0) {
        throw new BadRequestException('End time must be after start time');
      }
      minutes = diff;
    }

    // Validate daily total if minutes changed
    if (minutes !== undefined) {
      const existingEntries = await this.prisma.timesheetEntry.findMany({
        where: {
          userId,
          date: entry.date,
          id: { not: id },
        },
      });

      const existingMinutes = existingEntries.reduce((sum, e) => sum + e.minutes, 0);
      if (existingMinutes + minutes > 1440) {
        throw new BadRequestException('Total time exceeds 24 hours');
      }
    }

    // Handle attachment updates
    if (updateDto.attachmentKeys !== undefined) {
      // Get current attachment URLs
      const currentKeys = entry.attachments.map((a) => a.fileUrl);
      const newKeys = updateDto.attachmentKeys;

      // Delete removed attachments
      const keysToRemove = currentKeys.filter((k) => !newKeys.includes(k));
      if (keysToRemove.length > 0) {
        await this.prisma.timesheetAttachment.deleteMany({
          where: {
            timesheetEntryId: id,
            fileUrl: { in: keysToRemove },
          },
        });
      }

      // Add new attachments
      const keysToAdd = newKeys.filter((k) => !currentKeys.includes(k));
      if (keysToAdd.length > 0) {
        await this.prisma.timesheetAttachment.createMany({
          data: keysToAdd.map((objectKey) => ({
            timesheetEntryId: id,
            fileName: objectKey.split('/').pop() || objectKey,
            fileUrl: objectKey,
            fileType: this.getFileTypeFromKey(objectKey),
            fileSize: 0,
          })),
        });
      }
    }

    // Build update data (exclude attachmentKeys which is handled separately)
    const { attachmentKeys: _, startTime: __, endTime: ___, ...updateData } = updateDto;

    return this.prisma.timesheetEntry.update({
      where: { id },
      data: {
        ...updateData,
        ...(minutes !== undefined ? { minutes } : {}),
      },
      include: {
        project: true,
        task: true,
        attachments: true,
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

    // Same-day check: can only delete today's entries
    const today = startOfDay(new Date());
    if (!isSameDay(entry.date, today)) {
      throw new BadRequestException('Can only delete today\'s entries');
    }

    // Attachments are cascade deleted via Prisma relation
    await this.prisma.timesheetEntry.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Get single timesheet entry with ownership check
   */
  async findOne(id: string, userId: string) {
    const entry = await this.prisma.timesheetEntry.findUnique({
      where: { id },
      include: {
        project: true,
        task: true,
        attachments: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (entry.userId !== userId) {
      throw new ForbiddenException('Cannot access another user\'s entry');
    }

    return entry;
  }

  /**
   * Get presigned download URL for attachment with ownership check
   */
  async getAttachmentDownloadUrl(objectKey: string, userId: string): Promise<string> {
    // Find the attachment and verify ownership
    const attachment = await this.prisma.timesheetAttachment.findFirst({
      where: { fileUrl: objectKey },
      include: {
        timesheetEntry: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.timesheetEntry.userId !== userId) {
      throw new ForbiddenException('Cannot access another user\'s attachment');
    }

    return this.storageService.getDownloadUrl(objectKey);
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
