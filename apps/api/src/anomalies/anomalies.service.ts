/**
 * Anomalies Service - CRUD operations for anomaly events
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { AnomalyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomaliesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, options: {
    userId?: string;
    status?: AnomalyStatus;
    type?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, status, type, severity, page = 1, limit = 20 } = options;
    const where: any = { user: { companyId } };

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;

    const [data, total] = await Promise.all([
      this.prisma.anomalyEvent.findMany({
        where,
        include: { user: { include: { profile: true } }, rule: true },
        orderBy: { detectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.anomalyEvent.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary(companyId: string) {
    const anomalies = await this.prisma.anomalyEvent.findMany({
      where: { user: { companyId } },
      select: { status: true, severity: true, type: true },
    });

    const total = anomalies.length;
    const open = anomalies.filter(a => a.status === AnomalyStatus.Open).length;
    const acknowledged = anomalies.filter(a => a.status === AnomalyStatus.Acknowledged).length;
    const resolved = anomalies.filter(a => a.status === AnomalyStatus.Resolved).length;

    const bySeverity = Object.entries(
      anomalies.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([severity, count]) => ({ severity, count }));

    const byType = Object.entries(
      anomalies.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({ type, count }));

    return { total, open, acknowledged, resolved, bySeverity, byType };
  }

  async acknowledge(id: string, actorId: string, notes?: string) {
    const anomaly = await this.prisma.anomalyEvent.findUnique({ where: { id } });
    if (!anomaly) throw new NotFoundException('Anomaly not found');

    return this.prisma.anomalyEvent.update({
      where: { id },
      data: {
        status: AnomalyStatus.Acknowledged,
        acknowledgedBy: actorId,
        acknowledgedAt: new Date(),
        resolutionNotes: notes,
      },
    });
  }

  async resolve(id: string, actorId: string, notes: string) {
    const anomaly = await this.prisma.anomalyEvent.findUnique({ where: { id } });
    if (!anomaly) throw new NotFoundException('Anomaly not found');

    return this.prisma.anomalyEvent.update({
      where: { id },
      data: {
        status: AnomalyStatus.Resolved,
        resolvedBy: actorId,
        resolvedAt: new Date(),
        resolutionNotes: notes,
      },
    });
  }

  async dismiss(id: string, actorId: string, reason: string) {
    const anomaly = await this.prisma.anomalyEvent.findUnique({ where: { id } });
    if (!anomaly) throw new NotFoundException('Anomaly not found');

    return this.prisma.anomalyEvent.update({
      where: { id },
      data: {
        status: AnomalyStatus.Dismissed,
        resolvedBy: actorId,
        resolvedAt: new Date(),
        resolutionNotes: reason,
      },
    });
  }
}
