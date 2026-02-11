/**
 * Expenses Service
 *
 * Manages employee expense submissions, approvals,
 * and reimbursements.
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpenseStatus, ExpenseCategory, NotificationType, UserRole } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface CreateExpenseDto {
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  date: Date;
  description: string;
  receiptFile?: Express.Multer.File;
  projectId?: string;
  mileage?: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Submit expense
   */
  async submitExpense(
    userId: string,
    companyId: string,
    dto: CreateExpenseDto
  ) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Expense amount must be a positive number');
    }
    if (dto.amount > 1000000) {
      throw new BadRequestException('Expense amount cannot exceed 1,000,000');
    }
    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }
    if (dto.description.length > 5000) {
      throw new BadRequestException('Description cannot exceed 5000 characters');
    }
    if (dto.mileage !== undefined && dto.mileage < 0) {
      throw new BadRequestException('Mileage cannot be negative');
    }

    let receiptUrl: string | undefined;

    // Upload receipt if provided
    if (dto.receiptFile) {
      const upload = await this.storage.uploadFile(
        dto.receiptFile,
        `expenses/${companyId}/${userId}`
      );
      receiptUrl = upload.url;
    }

    const expense = await this.prisma.expense.create({
      data: {
        userId,
        companyId,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        date: dto.date,
        description: dto.description,
        receiptUrl,
        projectId: dto.projectId,
        mileage: dto.mileage,
        status: ExpenseStatus.Pending,
      },
      include: {
        user: { include: { profile: true } },
        project: true,
      },
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
        type: NotificationType.System,
        title: 'New Expense Submission',
        body: `${expense.user.profile?.firstName || 'An employee'} submitted a $${dto.amount} expense`,
        data: { expenseId: expense.id },
      });
    }

    return expense;
  }

  /**
   * Get expenses
   */
  async getExpenses(
    companyId: string,
    options: {
      userId?: string;
      status?: ExpenseStatus;
      category?: ExpenseCategory;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { userId, status, category, startDate, endDate } = options;

    const where: any = { companyId };
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          project: true,
          approvedByUser: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
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
   * Approve expense
   */
  async approveExpense(
    expenseId: string,
    companyId: string,
    approverId: string,
    notes?: string
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      include: { user: { include: { profile: true } } },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.Pending) {
      throw new BadRequestException('Expense is not pending approval');
    }

    // EXP-2 fix: Prevent self-approval of expenses
    if (expense.userId === approverId) {
      throw new BadRequestException('Cannot approve your own expense submission');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.Approved,
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
    });

    // Notify employee
    await this.notifications.sendToUser(expense.userId, {
      type: NotificationType.System,
      title: 'Expense Approved',
      body: `Your $${Number(expense.amount)} expense has been approved`,
      data: { expenseId },
    });

    return updated;
  }

  /**
   * Reject expense
   */
  async rejectExpense(
    expenseId: string,
    companyId: string,
    approverId: string,
    reason: string
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.Pending) {
      throw new BadRequestException('Expense is not pending approval');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.Rejected,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Notify employee
    await this.notifications.sendToUser(expense.userId, {
      type: NotificationType.System,
      title: 'Expense Rejected',
      body: `Your $${Number(expense.amount)} expense was not approved: ${reason}`,
      data: { expenseId },
    });

    return updated;
  }

  /**
   * Mark expense as reimbursed
   */
  async markReimbursed(
    expenseId: string,
    companyId: string,
    actorId: string,
    reimbursementMethod: string,
    reference?: string
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.Approved) {
      throw new BadRequestException('Expense must be approved before reimbursement');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.Reimbursed,
        reimbursedAt: new Date(),
        reimbursementMethod,
        reimbursementReference: reference,
      },
    });

    // Notify employee
    await this.notifications.sendToUser(expense.userId, {
      type: NotificationType.System,
      title: 'Expense Reimbursed',
      body: `Your $${Number(expense.amount)} expense has been reimbursed`,
      data: { expenseId },
    });

    return updated;
  }

  /**
   * Get expense summary
   */
  async getSummary(companyId: string, startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const byStatus = {
      pending: expenses.filter(e => e.status === ExpenseStatus.Pending),
      approved: expenses.filter(e => e.status === ExpenseStatus.Approved),
      rejected: expenses.filter(e => e.status === ExpenseStatus.Rejected),
      reimbursed: expenses.filter(e => e.status === ExpenseStatus.Reimbursed),
    };

    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum: number, e) => sum + Number(e.amount), 0),
      pendingAmount: byStatus.pending.reduce((sum: number, e) => sum + Number(e.amount), 0),
      approvedAmount: byStatus.approved.reduce((sum: number, e) => sum + Number(e.amount), 0),
      reimbursedAmount: byStatus.reimbursed.reduce((sum: number, e) => sum + Number(e.amount), 0),
      byCategory,
      byStatus: {
        pending: byStatus.pending.length,
        approved: byStatus.approved.length,
        rejected: byStatus.rejected.length,
        reimbursed: byStatus.reimbursed.length,
      },
    };
  }

  /**
   * Get expense policies
   */
  async getPolicies(companyId: string) {
    return this.prisma.expensePolicy.findMany({
      where: { companyId },
    });
  }

  /**
   * Create expense policy
   */
  async createPolicy(
    companyId: string,
    actorId: string,
    dto: {
      category: ExpenseCategory;
      maxAmount?: number;
      requiresReceipt: boolean;
      receiptThreshold?: number;
      notes?: string;
    }
  ) {
    if (dto.maxAmount !== undefined && dto.maxAmount < 0) {
      throw new BadRequestException('Max amount cannot be negative');
    }
    if (dto.receiptThreshold !== undefined && dto.receiptThreshold < 0) {
      throw new BadRequestException('Receipt threshold cannot be negative');
    }
    return this.prisma.expensePolicy.create({
      data: {
        companyId,
        category: dto.category,
        maxAmount: dto.maxAmount ?? 0,
        requiresReceipt: dto.requiresReceipt,
        receiptThreshold: dto.receiptThreshold,
        notes: dto.notes,
        createdBy: actorId,
      },
    });
  }
}
