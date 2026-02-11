/**
 * Leaves Service - Business logic for leave management
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async getLeaveTypes(companyId: string) {
    return this.prisma.leaveTypeConfig.findMany({
      where: { companyId, isActive: true },
    });
  }

  async getBalances(userId: string) {
    const currentYear = new Date().getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { userId, year: currentYear },
      include: { leaveType: true },
    });
  }

  async createRequest(userId: string, data: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) {
    if (!data.leaveTypeId || !data.startDate || !data.endDate) {
      throw new BadRequestException('leaveTypeId, startDate, and endDate are required');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format for startDate or endDate');
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping requests
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: [LeaveRequestStatus.Pending, LeaveRequestStatus.Approved] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException('Overlapping leave request exists');
    }

    // LV-1 fix: Check leave balance before creating request
    const currentYear = new Date().getFullYear();
    const balance = await this.prisma.leaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId: data.leaveTypeId,
        year: currentYear,
      },
    });

    if (!balance) {
      throw new BadRequestException('No leave balance found for this leave type');
    }

    const available = Number(balance.allocated) - Number(balance.used);
    if (totalDays > available) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${available} days, Requested: ${totalDays} days`,
      );
    }

    return this.prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId: data.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: data.reason,
      },
      include: { leaveType: true },
    });
  }

  async approveRequest(requestId: string, approverId: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== LeaveRequestStatus.Pending) {
      throw new BadRequestException('Request is not pending');
    }

    // LV-1 fix: Re-check balance and deduct upon approval (within a transaction)
    const currentYear = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.leaveBalance.findFirst({
        where: {
          userId: request.userId,
          leaveTypeId: request.leaveTypeId,
          year: currentYear,
        },
      });

      if (!balance) {
        throw new BadRequestException('No leave balance found for this leave type');
      }

      const available = Number(balance.allocated) - Number(balance.used);
      const requestedDays = Number(request.totalDays);
      if (requestedDays > available) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${available} days, Requested: ${requestedDays} days`,
        );
      }

      // Deduct balance
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { increment: requestedDays } },
      });

      // Approve the request
      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: LeaveRequestStatus.Approved,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });
    });
  }

  async rejectRequest(requestId: string, approverId: string, reason: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');

    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveRequestStatus.Rejected,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async getRequests(userId: string, options: { status?: LeaveRequestStatus; page?: number; limit?: number }) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { status } = options;
    const where: any = { userId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getHolidays(companyId: string, year: number) {
    return this.prisma.holiday.findMany({
      where: { companyId, year },
      orderBy: { date: 'asc' },
    });
  }

  async getAllPendingRequests(companyId: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        user: { companyId },
        status: LeaveRequestStatus.Pending,
      },
      include: {
        leaveType: true,
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
