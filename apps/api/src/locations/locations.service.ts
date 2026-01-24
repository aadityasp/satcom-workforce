/**
 * Locations Service
 *
 * Handles office location CRUD operations for geofence management.
 * All operations are scoped to company (tenant isolation).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all office locations for a company
   */
  async findAll(companyId: string, includeInactive = false) {
    return this.prisma.officeLocation.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single office location by ID
   */
  async findOne(id: string, companyId: string) {
    const location = await this.prisma.officeLocation.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!location) {
      throw new NotFoundException('Office location not found');
    }

    return location;
  }

  /**
   * Create a new office location
   */
  async create(companyId: string, userId: string, dto: CreateLocationDto) {
    const location = await this.prisma.officeLocation.create({
      data: {
        companyId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'CREATE',
        entityType: 'OfficeLocation',
        entityId: location.id,
        after: {
          name: location.name,
          address: location.address,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          radiusMeters: location.radiusMeters,
        },
      },
    });

    return location;
  }

  /**
   * Update an existing office location
   */
  async update(id: string, companyId: string, userId: string, dto: UpdateLocationDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.officeLocation.update({
      where: { id },
      data: dto,
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'UPDATE',
        entityType: 'OfficeLocation',
        entityId: id,
        before: {
          name: existing.name,
          address: existing.address,
          latitude: Number(existing.latitude),
          longitude: Number(existing.longitude),
          radiusMeters: existing.radiusMeters,
          isActive: existing.isActive,
        },
        after: {
          name: updated.name,
          address: updated.address,
          latitude: Number(updated.latitude),
          longitude: Number(updated.longitude),
          radiusMeters: updated.radiusMeters,
          isActive: updated.isActive,
        },
      },
    });

    return updated;
  }

  /**
   * Soft delete an office location by setting isActive = false
   */
  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.officeLocation.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'DELETE',
        entityType: 'OfficeLocation',
        entityId: id,
        before: {
          name: existing.name,
          isActive: true,
        },
        after: {
          name: updated.name,
          isActive: false,
        },
      },
    });

    return updated;
  }
}
