/**
 * Availability Service
 *
 * Manages employee availability and preferences.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format, getDay } from 'date-fns';

export interface AvailabilitySlotDto {
  dayOfWeek: number;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  isPreferred?: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Set user availability
   */
  async setAvailability(
    userId: string,
    slots: AvailabilitySlotDto[]
  ) {
    for (const slot of slots) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new BadRequestException('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }
      if (!/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
        throw new BadRequestException('Time must be in HH:mm format');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.userAvailability.deleteMany({
        where: { userId },
      });

      return tx.userAvailability.createMany({
        data: slots.map(slot => ({
          userId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isPreferred: slot.isPreferred ?? true,
        })),
      });
    });

    return { success: true, count: created.count };
  }

  /**
   * Get user availability
   */
  async getAvailability(userId: string) {
    const availability = await this.prisma.userAvailability.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Group by day of week
    const grouped = availability.reduce((acc, slot) => {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek];
      if (!acc[dayName]) acc[dayName] = [];
      acc[dayName].push(slot);
      return acc;
    }, {} as Record<string, typeof availability>);

    return {
      userId,
      slots: availability,
      grouped,
    };
  }

  /**
   * Check if user is available during a time period
   */
  async isUserAvailable(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const dayOfWeek = getDay(startTime);
    const startStr = format(startTime, 'HH:mm');
    const endStr = format(endTime, 'HH:mm');

    const availability = await this.prisma.userAvailability.findFirst({
      where: {
        userId,
        dayOfWeek,
        startTime: { lte: startStr },
        endTime: { gte: endStr },
      },
    });

    return !!availability;
  }

  /**
   * Get available users for a time slot
   */
  async getAvailableUsers(
    companyId: string,
    startTime: Date,
    endTime: Date
  ) {
    const dayOfWeek = getDay(startTime);
    const startStr = format(startTime, 'HH:mm');
    const endStr = format(endTime, 'HH:mm');

    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        availability: {
          some: {
            dayOfWeek,
            startTime: { lte: startStr },
            endTime: { gte: endStr },
          },
        },
      },
      include: {
        profile: true,
        availability: {
          where: {
            dayOfWeek,
            startTime: { lte: startStr },
            endTime: { gte: endStr },
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      name: user.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user.email,
      avatarUrl: user.profile?.avatarUrl,
      availability: user.availability[0],
    }));
  }
}
