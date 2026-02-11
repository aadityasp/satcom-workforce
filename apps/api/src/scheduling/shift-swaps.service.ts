/**
 * Shift Swaps Service
 *
 * Manages shift swap requests with approval workflows,
 * coverage validation, and notifications.
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShiftStatus, ShiftSwapStatus, NotificationType, UserRole } from '@prisma/client';
import { format, differenceInHours } from 'date-fns';

export interface RequestSwapDto {
  shiftId: string;
  requestedToUserId: string;
  reason?: string;
}

export interface RespondToSwapDto {
  accept: boolean;
  reason?: string;
}

@Injectable()
export class ShiftSwapsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Request a shift swap
   */
  async requestSwap(
    requesterUserId: string,
    companyId: string,
    dto: RequestSwapDto
  ) {
    // Validate the shift exists and belongs to requester
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: dto.shiftId,
        userId: requesterUserId,
        companyId,
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress] },
      },
      include: {
        user: { include: { profile: true } },
        location: true,
        department: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found or cannot be swapped');
    }

    // Check minimum notice period (e.g., 24 hours)
    const hoursUntilShift = differenceInHours(shift.startTime, new Date());
    if (hoursUntilShift < 24) {
      throw new BadRequestException(
        'Shift swaps must be requested at least 24 hours in advance'
      );
    }

    // Validate requested user exists and is eligible
    const requestedUser = await this.prisma.user.findFirst({
      where: {
        id: dto.requestedToUserId,
        companyId,
        isActive: true,
        role: { in: [UserRole.Employee, UserRole.Manager] },
      },
      include: { profile: true },
    });

    if (!requestedUser) {
      throw new NotFoundException('Requested user not found or not eligible');
    }

    if (requestedUser.id === requesterUserId) {
      throw new BadRequestException('Cannot request swap with yourself');
    }

    // Check if requested user already has a conflicting shift
    const conflictingShift = await this.prisma.shift.findFirst({
      where: {
        userId: dto.requestedToUserId,
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress] },
        OR: [
          {
            startTime: { lte: shift.startTime },
            endTime: { gt: shift.startTime },
          },
          {
            startTime: { lt: shift.endTime },
            endTime: { gte: shift.endTime },
          },
          {
            startTime: { gte: shift.startTime },
            endTime: { lte: shift.endTime },
          },
        ],
      },
    });

    if (conflictingShift) {
      throw new BadRequestException(
        'Requested user has a conflicting shift at this time'
      );
    }

    // Check if swap request already exists
    const existingRequest = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        shiftId: dto.shiftId,
        status: { in: [ShiftSwapStatus.Pending, ShiftSwapStatus.Accepted] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A swap request already exists for this shift');
    }

    // Create swap request
    const swapRequest = await this.prisma.shiftSwapRequest.create({
      data: {
        shiftId: dto.shiftId,
        requestedById: requesterUserId,
        requestedToId: dto.requestedToUserId,
        reason: dto.reason,
        status: ShiftSwapStatus.Pending,
      },
      include: {
        shift: {
          include: {
            location: true,
            department: true,
          },
        },
        requestedBy: { include: { profile: true } },
        requestedTo: { include: { profile: true } },
      },
    });

    // Notify the requested user
    await this.notifications.sendToUser(dto.requestedToUserId, {
      type: NotificationType.ShiftSwapRequest,
      title: 'Shift Swap Request',
      body: `${swapRequest.requestedBy.profile?.firstName || 'Someone'} wants to swap their shift on ${format(shift.startTime, 'MMM d')} with you`,
      data: { swapRequestId: swapRequest.id },
    });

    // Notify managers
    const managers = await this.prisma.user.findMany({
      where: {
        companyId,
        role: { in: [UserRole.Manager, UserRole.HR, UserRole.SuperAdmin] },
        isActive: true,
      },
    });

    for (const manager of managers) {
      await this.notifications.sendToUser(manager.id, {
        type: NotificationType.ShiftSwapRequest,
        title: 'New Shift Swap Request',
        body: `Shift swap requested for ${format(shift.startTime, 'MMM d')}`,
        data: { swapRequestId: swapRequest.id },
      });
    }

    return swapRequest;
  }

  /**
   * Respond to a swap request (by requested user)
   */
  async respondToSwap(
    swapRequestId: string,
    responderUserId: string,
    dto: RespondToSwapDto
  ) {
    const swapRequest = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        id: swapRequestId,
        requestedToId: responderUserId,
        status: ShiftSwapStatus.Pending,
      },
      include: {
        shift: {
          include: {
            location: true,
            department: true,
          },
        },
        requestedBy: { include: { profile: true } },
        requestedTo: { include: { profile: true } },
      },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found or already processed');
    }

    if (dto.accept) {
      // Update to manager approval pending
      const updated = await this.prisma.shiftSwapRequest.update({
        where: { id: swapRequestId },
        data: {
          status: ShiftSwapStatus.Accepted, // Will need manager approval
          respondedAt: new Date(),
          respondReason: dto.reason,
        },
        include: {
          shift: true,
          requestedBy: { include: { profile: true } },
          requestedTo: { include: { profile: true } },
        },
      });

      // Notify managers for final approval
      const managers = await this.prisma.user.findMany({
        where: {
          companyId: swapRequest.shift.companyId,
          role: { in: [UserRole.Manager, UserRole.HR, UserRole.SuperAdmin] },
          isActive: true,
        },
      });

      for (const manager of managers) {
        await this.notifications.sendToUser(manager.id, {
          type: NotificationType.ShiftSwapRequest,
          title: 'Shift Swap Pending Approval',
          body: `${updated.requestedTo.profile?.firstName} accepted swap for ${format(swapRequest.shift.startTime, 'MMM d')} - awaiting your approval`,
          data: { swapRequestId },
        });
      }

      // Notify requester
      await this.notifications.sendToUser(swapRequest.requestedById, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Request Accepted',
        body: `${updated.requestedTo.profile?.firstName} accepted your swap request - pending manager approval`,
        data: { swapRequestId },
      });

      return updated;
    } else {
      // Rejected
      const updated = await this.prisma.shiftSwapRequest.update({
        where: { id: swapRequestId },
        data: {
          status: ShiftSwapStatus.Rejected,
          respondedAt: new Date(),
          respondReason: dto.reason,
        },
      });

      // Notify requester
      await this.notifications.sendToUser(swapRequest.requestedById, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Request Declined',
        body: `${swapRequest.requestedTo.profile?.firstName} declined your swap request`,
        data: { swapRequestId },
      });

      return updated;
    }
  }

  /**
   * Manager approval of swap request
   */
  async approveSwap(
    swapRequestId: string,
    managerUserId: string,
    approved: boolean,
    notes?: string
  ) {
    const swapRequest = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        id: swapRequestId,
        status: ShiftSwapStatus.Accepted, // Must be at manager approval stage
      },
      include: {
        shift: true,
        requestedBy: { include: { profile: true } },
        requestedTo: { include: { profile: true } },
      },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found or not ready for approval');
    }

    // Verify manager has permission
    const manager = await this.prisma.user.findFirst({
      where: {
        id: managerUserId,
        companyId: swapRequest.shift.companyId,
        role: { in: [UserRole.Manager, UserRole.HR, UserRole.SuperAdmin] },
        isActive: true,
      },
    });

    if (!manager) {
      throw new BadRequestException('Not authorized to approve swaps');
    }

    if (approved) {
      // Execute the swap
      await this.prisma.$transaction(async (tx) => {
        // Update swap request
        await tx.shiftSwapRequest.update({
          where: { id: swapRequestId },
          data: {
            status: ShiftSwapStatus.Accepted,
            approvedById: managerUserId,
          },
        });

        // Update shift to new user
        await tx.shift.update({
          where: { id: swapRequest.shiftId },
          data: {
            userId: swapRequest.requestedToId,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorId: managerUserId,
            action: 'ShiftSwapApproved',
            entityType: 'ShiftSwapRequest',
            entityId: swapRequestId,
            before: { userId: swapRequest.requestedById },
            after: { userId: swapRequest.requestedToId },
            reason: notes,
          },
        });
      });

      // Notify both users
      await this.notifications.sendToUser(swapRequest.requestedById, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Approved!',
        body: `Your shift swap for ${format(swapRequest.shift.startTime, 'MMM d')} has been approved`,
        data: { swapRequestId },
      });

      await this.notifications.sendToUser(swapRequest.requestedToId, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Approved!',
        body: `You are now assigned to the shift on ${format(swapRequest.shift.startTime, 'MMM d')}`,
        data: { swapRequestId },
      });

      return { success: true, message: 'Swap approved and executed' };
    } else {
      // Rejected by manager
      await this.prisma.shiftSwapRequest.update({
        where: { id: swapRequestId },
        data: {
          status: ShiftSwapStatus.Rejected,
          approvedById: managerUserId,
        },
      });

      // Notify both users
      await this.notifications.sendToUser(swapRequest.requestedById, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Declined',
        body: `Your shift swap for ${format(swapRequest.shift.startTime, 'MMM d')} was not approved`,
        data: { swapRequestId },
      });

      await this.notifications.sendToUser(swapRequest.requestedToId, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Declined',
        body: `The shift swap was not approved by management`,
        data: { swapRequestId },
      });

      return { success: true, message: 'Swap rejected' };
    }
  }

  /**
   * Cancel a swap request
   */
  async cancelSwap(swapRequestId: string, userId: string) {
    const swapRequest = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        id: swapRequestId,
        requestedById: userId,
        status: { in: [ShiftSwapStatus.Pending, ShiftSwapStatus.Accepted] },
      },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found or cannot be cancelled');
    }

    await this.prisma.shiftSwapRequest.update({
      where: { id: swapRequestId },
      data: {
        status: ShiftSwapStatus.Cancelled,
      },
    });

    // Notify requested user if they already accepted
    if (swapRequest.status === ShiftSwapStatus.Accepted) {
      await this.notifications.sendToUser(swapRequest.requestedToId, {
        type: NotificationType.ShiftSwapRequest,
        title: 'Swap Cancelled',
        body: 'The shift swap request was cancelled by the requester',
        data: { swapRequestId },
      });
    }

    return { success: true, message: 'Swap request cancelled' };
  }

  /**
   * Get all swap requests for a company
   */
  async getSwapRequests(
    companyId: string,
    options: {
      status?: ShiftSwapStatus;
      userId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { status, userId } = options;

    const where: any = {
      shift: { companyId },
    };

    if (status) where.status = status;
    if (userId) {
      where.OR = [
        { requestedById: userId },
        { requestedToId: userId },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shiftSwapRequest.findMany({
        where,
        include: {
          shift: {
            include: {
              location: true,
              department: true,
            },
          },
          requestedBy: { include: { profile: true } },
          requestedTo: { include: { profile: true } },
          approvedBy: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shiftSwapRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get swap request by ID
   */
  async getSwapRequest(swapRequestId: string, companyId: string) {
    const swapRequest = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        id: swapRequestId,
        shift: { companyId },
      },
      include: {
        shift: {
          include: {
            location: true,
            department: true,
          },
        },
        requestedBy: { include: { profile: true } },
        requestedTo: { include: { profile: true } },
        approvedBy: { include: { profile: true } },
      },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found');
    }

    return swapRequest;
  }

  /**
   * Get available employees for swap
   */
  async getAvailableEmployees(
    shiftId: string,
    companyId: string
  ) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, companyId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Get all active employees except current assignee
    const employees = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: [UserRole.Employee, UserRole.Manager] },
        id: { not: shift.userId },
      },
      include: {
        profile: true,
        availability: true,
      },
    });

    // Filter out those with conflicts
    const availableEmployees = [];

    for (const employee of employees) {
      const conflictingShift = await this.prisma.shift.findFirst({
        where: {
          userId: employee.id,
          status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress] },
          OR: [
            {
              startTime: { lte: shift.startTime },
              endTime: { gt: shift.startTime },
            },
            {
              startTime: { lt: shift.endTime },
              endTime: { gte: shift.endTime },
            },
          ],
        },
      });

      if (!conflictingShift) {
        availableEmployees.push({
          id: employee.id,
          name: employee.profile 
            ? `${employee.profile.firstName} ${employee.profile.lastName}`
            : employee.email,
          avatarUrl: employee.profile?.avatarUrl,
          department: employee.profile?.department,
        });
      }
    }

    return availableEmployees;
  }

  /**
   * Get swap statistics
   */
  async getSwapStats(companyId: string, startDate: Date, endDate: Date) {
    const swaps = await this.prisma.shiftSwapRequest.findMany({
      where: {
        shift: { companyId },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const total = swaps.length;
    const pending = swaps.filter(s => s.status === ShiftSwapStatus.Pending).length;
    const managerApproved = swaps.filter(s => s.status === ShiftSwapStatus.Accepted).length;
    const approved = swaps.filter(s => s.status === ShiftSwapStatus.Accepted).length;
    const rejected = swaps.filter(s => s.status === ShiftSwapStatus.Rejected).length;
    const cancelled = swaps.filter(s => s.status === ShiftSwapStatus.Cancelled).length;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      pending,
      managerApproved,
      approved,
      rejected,
      cancelled,
      approvalRate: Math.round(approvalRate * 10) / 10,
    };
  }
}
