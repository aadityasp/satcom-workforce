/**
 * Admin Service - Policies, settings, and audit log management
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getWorkPolicy(companyId: string) {
    return this.prisma.workPolicy.findUnique({ where: { companyId } });
  }

  async updateWorkPolicy(companyId: string, data: any, actorId: string) {
    // ADM-1 fix: Validate policy values are positive numbers
    if (data.standardWorkHours !== undefined && (typeof data.standardWorkHours !== 'number' || data.standardWorkHours <= 0)) {
      throw new BadRequestException('standardWorkHours must be a positive number');
    }
    if (data.maxHoursPerDay !== undefined && (typeof data.maxHoursPerDay !== 'number' || data.maxHoursPerDay <= 0)) {
      throw new BadRequestException('maxHoursPerDay must be a positive number');
    }
    if (data.breakDurationMinutes !== undefined && (typeof data.breakDurationMinutes !== 'number' || data.breakDurationMinutes < 0)) {
      throw new BadRequestException('breakDurationMinutes must be a non-negative number');
    }
    if (data.lunchDurationMinutes !== undefined && (typeof data.lunchDurationMinutes !== 'number' || data.lunchDurationMinutes < 0)) {
      throw new BadRequestException('lunchDurationMinutes must be a non-negative number');
    }
    if (data.overtimeThresholdMinutes !== undefined && (typeof data.overtimeThresholdMinutes !== 'number' || data.overtimeThresholdMinutes <= 0)) {
      throw new BadRequestException('overtimeThresholdMinutes must be a positive number');
    }
    if (data.maxOvertimeMinutes !== undefined && (typeof data.maxOvertimeMinutes !== 'number' || data.maxOvertimeMinutes < 0)) {
      throw new BadRequestException('maxOvertimeMinutes must be a non-negative number');
    }

    const before = await this.getWorkPolicy(companyId);
    const policy = await this.prisma.workPolicy.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'PolicyUpdated', entityType: 'WorkPolicy', entityId: policy.id, before: before ?? undefined, after: data },
    });

    return policy;
  }

  async getGeofencePolicy(companyId: string) {
    return this.prisma.geofencePolicy.findUnique({ where: { companyId } });
  }

  async updateGeofencePolicy(companyId: string, data: any, actorId: string) {
    const policy = await this.prisma.geofencePolicy.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'GeofenceUpdated', entityType: 'GeofencePolicy', entityId: policy.id },
    });

    return policy;
  }

  async getOfficeLocations(companyId: string) {
    return this.prisma.officeLocation.findMany({ where: { companyId, isActive: true } });
  }

  async createOfficeLocation(companyId: string, data: any, actorId: string) {
    const location = await this.prisma.officeLocation.create({
      data: { companyId, ...data },
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'GeofenceUpdated', entityType: 'OfficeLocation', entityId: location.id },
    });

    return location;
  }

  async getAnomalyRules(companyId: string) {
    return this.prisma.anomalyRule.findMany({ where: { companyId } });
  }

  async updateAnomalyRule(ruleId: string, data: any, actorId: string) {
    const rule = await this.prisma.anomalyRule.update({
      where: { id: ruleId },
      data,
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'AnomalyRuleUpdated', entityType: 'AnomalyRule', entityId: ruleId },
    });

    return rule;
  }

  async getAuditLogs(companyId: string, options: {
    actorId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 50;
    const { actorId, action, entityType, startDate, endDate } = options;
    const where: any = { actor: { companyId } };

    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDashboardSummary(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      onlineCount,
      checkedInCount,
      onLeaveCount,
      openAnomalies,
      pendingLeaves,
      totalActive,
    ] = await Promise.all([
      this.prisma.presenceSession.count({ where: { user: { companyId }, status: 'Online' } }),
      this.prisma.attendanceDay.count({
        where: { user: { companyId }, date: today, events: { some: { type: 'CheckIn' } } },
      }),
      this.prisma.leaveRequest.count({
        where: { user: { companyId }, status: 'Approved', startDate: { lte: today }, endDate: { gte: today } },
      }),
      this.prisma.anomalyEvent.count({ where: { user: { companyId }, status: 'Open' } }),
      this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'Pending' } }),
      this.prisma.user.count({ where: { companyId, isActive: true } }),
    ]);

    return {
      onlineCount,
      checkedInCount,
      onLeaveCount,
      openAnomalies,
      pendingLeaveRequests: pendingLeaves,
      todayAttendanceRate: totalActive > 0 ? Math.round((checkedInCount / totalActive) * 100 * 10) / 10 : 0,
    };
  }
}
