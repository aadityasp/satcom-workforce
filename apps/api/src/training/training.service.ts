/**
 * Training Service
 *
 * Manages training programs, courses, certifications,
 * and employee training records.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrainingStatus, CertificationStatus, NotificationType } from '@prisma/client';
import { addDays, isBefore, format } from 'date-fns';

export interface CreateTrainingDto {
  title: string;
  description?: string;
  categoryId?: string;
  duration: number; // minutes
  requiredForRoles?: string[];
  recurrenceMonths?: number; // Recurring training every N months
}

export interface AssignTrainingDto {
  userIds: string[];
  dueDate?: Date;
}

@Injectable()
export class TrainingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Create training program
   */
  async createTraining(companyId: string, actorId: string, dto: CreateTrainingDto) {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Training title is required');
    }
    if (dto.duration <= 0) {
      throw new BadRequestException('Duration must be a positive number');
    }
    if (dto.description && dto.description.length > 10000) {
      throw new BadRequestException('Description cannot exceed 10000 characters');
    }
    if (dto.recurrenceMonths !== undefined && dto.recurrenceMonths <= 0) {
      throw new BadRequestException('Recurrence months must be a positive number');
    }
    return this.prisma.training.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        duration: dto.duration,
        requiredForRoles: dto.requiredForRoles || [],
        recurrenceMonths: dto.recurrenceMonths,
        createdBy: actorId,
      },
    });
  }

  /**
   * Get training programs
   */
  async getTrainings(companyId: string, options: { categoryId?: string; search?: string }) {
    const where: any = { companyId };
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.training.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Assign training to employees
   */
  async assignTraining(
    trainingId: string,
    companyId: string,
    actorId: string,
    dto: AssignTrainingDto
  ) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, companyId },
    });

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    if (!dto.userIds || dto.userIds.length === 0) {
      throw new BadRequestException('At least one user ID is required');
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds }, companyId },
    });
    if (users.length !== dto.userIds.length) {
      throw new BadRequestException('One or more users not found in this company');
    }

    const assignments = [];
    for (const userId of dto.userIds) {
      const assignment = await this.prisma.trainingAssignment.create({
        data: {
          trainingId,
          userId,
          status: TrainingStatus.Assigned,
          assignedBy: actorId,
          dueDate: dto.dueDate,
        },
        include: {
          training: true,
          user: { include: { profile: true } },
        },
      });

      assignments.push(assignment);

      // Notify employee
      await this.notifications.sendToUser(userId, {
        type: NotificationType.System,
        title: 'New Training Assigned',
        body: `You have been assigned to "${training.title}"`,
        data: { trainingId, assignmentId: assignment.id },
      });
    }

    return { success: true, assignments };
  }

  /**
   * Get employee training assignments
   */
  async getUserTrainings(userId: string, options: { status?: TrainingStatus }) {
    const where: any = { userId };
    if (options.status) where.status = options.status;

    return this.prisma.trainingAssignment.findMany({
      where,
      include: {
        training: {
          include: { category: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  /**
   * Update training progress
   */
  async updateProgress(
    assignmentId: string,
    userId: string,
    progress: number,
    notes?: string
  ) {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    const assignment = await this.prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, userId },
    });

    if (!assignment) {
      throw new NotFoundException('Training assignment not found');
    }

    const status = progress >= 100 ? TrainingStatus.Completed : TrainingStatus.InProgress;

    return this.prisma.trainingAssignment.update({
      where: { id: assignmentId },
      data: {
        progress,
        status,
        completedAt: status === TrainingStatus.Completed ? new Date() : undefined,
        notes,
      },
    });
  }

  /**
   * Create certification
   */
  async createCertification(
    companyId: string,
    actorId: string,
    dto: {
      name: string;
      description?: string;
      issuingBody?: string;
      validityMonths?: number;
      requiredTrainingId?: string;
    }
  ) {
    return this.prisma.certification.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        issuingBody: dto.issuingBody,
        validityMonths: dto.validityMonths,
        requiredTrainingId: dto.requiredTrainingId,
        createdBy: actorId,
      },
    });
  }

  /**
   * Award certification to employee
   */
  async awardCertification(
    certificationId: string,
    companyId: string,
    actorId: string,
    dto: {
      userId: string;
      issuedDate: Date;
      expiryDate?: Date;
      certificateUrl?: string;
    }
  ) {
    const certification = await this.prisma.certification.findFirst({
      where: { id: certificationId, companyId },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    // Calculate expiry if not provided
    let expiryDate = dto.expiryDate;
    if (!expiryDate && certification.validityMonths) {
      expiryDate = addDays(dto.issuedDate, certification.validityMonths * 30);
    }

    const userCert = await this.prisma.userCertification.create({
      data: {
        certificationId,
        userId: dto.userId,
        issuedDate: dto.issuedDate,
        expiryDate,
        certificateUrl: dto.certificateUrl,
        status: CertificationStatus.Active,
        awardedBy: actorId,
      },
      include: {
        certification: true,
        user: { include: { profile: true } },
      },
    });

    // Notify employee
    await this.notifications.sendToUser(dto.userId, {
      type: NotificationType.System,
      title: 'Certification Awarded',
      body: `You have been awarded the "${certification.name}" certification`,
      data: { certificationId },
    });

    return userCert;
  }

  /**
   * Get employee certifications
   */
  async getUserCertifications(userId: string) {
    return this.prisma.userCertification.findMany({
      where: { userId },
      include: { certification: true },
      orderBy: { issuedDate: 'desc' },
    });
  }

  /**
   * Check for expiring certifications
   */
  async checkExpiringCertifications(companyId: string) {
    const thirtyDaysFromNow = addDays(new Date(), 30);

    const expiring = await this.prisma.userCertification.findMany({
      where: {
        certification: { companyId },
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
        status: CertificationStatus.Active,
      },
      include: {
        certification: true,
        user: { include: { profile: true } },
      },
    });

    // Send notifications
    for (const cert of expiring) {
      const daysUntilExpiry = Math.ceil(
        (cert.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await this.notifications.sendToUser(cert.userId, {
        type: NotificationType.System,
        title: 'Certification Expiring Soon',
        body: `Your "${cert.certification.name}" certification expires in ${daysUntilExpiry} days`,
        data: { certificationId: cert.certificationId },
      });
    }

    return expiring;
  }

  /**
   * Get training compliance report
   */
  async getComplianceReport(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      include: {
        profile: true,
        trainingAssignments: {
          include: { training: true },
        },
        userCertifications: {
          include: { certification: true },
        },
      },
    });

    const report = users.map((user: any) => {
      const requiredTrainings = (user.trainingAssignments || []).filter(
        (a: any) => a.training.requiredForRoles?.includes(user.role)
      );

      const completedTrainings = requiredTrainings.filter(
        (a: any) => a.status === TrainingStatus.Completed
      );

      const validCertifications = (user.userCertifications || []).filter(
        (c: any) => c.status === CertificationStatus.Active &&
        (!c.expiryDate || isBefore(new Date(), c.expiryDate))
      );

      return {
        userId: user.id,
        name: user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user.email,
        role: user.role,
        trainingCompliance: requiredTrainings.length > 0
          ? (completedTrainings.length / requiredTrainings.length) * 100
          : 100,
        certificationsCount: validCertifications.length,
        pendingTrainings: requiredTrainings.filter((a: any) => a.status !== TrainingStatus.Completed).length,
      };
    });

    return {
      totalEmployees: users.length,
      compliantEmployees: report.filter(r => r.trainingCompliance >= 100).length,
      averageCompliance: report.length > 0
        ? report.reduce((sum, r) => sum + r.trainingCompliance, 0) / report.length
        : 0,
      details: report,
    };
  }
}
