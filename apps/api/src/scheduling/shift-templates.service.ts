/**
 * Shift Templates Service
 *
 * Manages reusable shift templates for quick scheduling.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTemplateDto {
  name: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  breakDuration: number;
  departmentId?: string;
  locationId?: string;
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
}

@Injectable()
export class ShiftTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, actorId: string, dto: CreateTemplateDto) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Template name is required');
    }
    if (dto.breakDuration < 0) {
      throw new BadRequestException('Break duration cannot be negative');
    }
    if (!dto.daysOfWeek || dto.daysOfWeek.length === 0) {
      throw new BadRequestException('At least one day of week is required');
    }
    if (dto.daysOfWeek.some(d => d < 0 || d > 6)) {
      throw new BadRequestException('Days of week must be between 0 (Sunday) and 6 (Saturday)');
    }
    return this.prisma.shiftTemplate.create({
      data: {
        companyId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakDuration: dto.breakDuration,
        departmentId: dto.departmentId,
        locationId: dto.locationId,
        daysOfWeek: dto.daysOfWeek,
        createdBy: actorId,
      },
      include: {
        department: true,
        location: true,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { companyId },
      include: {
        department: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const template = await this.prisma.shiftTemplate.findFirst({
      where: { id, companyId },
      include: {
        department: true,
        location: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(
    id: string,
    companyId: string,
    actorId: string,
    dto: Partial<CreateTemplateDto>
  ) {
    await this.findOne(id, companyId);

    return this.prisma.shiftTemplate.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: actorId,
      },
      include: {
        department: true,
        location: true,
      },
    });
  }

  async delete(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.shiftTemplate.delete({ where: { id } });
    return { deleted: true };
  }
}
