/**
 * Payroll Service
 *
 * Handles payroll calculations including:
 * - Regular hours
 * - Overtime
 * - Leave payouts
 * - Deductions
 * - Tax calculations
 * - Payslip generation
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceEventType, LeaveRequestStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, format, differenceInMinutes } from 'date-fns';

export interface PayrollPeriod {
  startDate: Date;
  endDate: Date;
}

export interface PayrollCalculation {
  userId: string;
  period: PayrollPeriod;
  regularHours: number;
  overtimeHours: number;
  leaveHours: number;
  grossPay: number;
  deductions: Deduction[];
  netPay: number;
}

export interface Deduction {
  type: string;
  amount: number;
  description: string;
}

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate payroll for a user
   */
  async calculatePayroll(
    userId: string,
    period: PayrollPeriod
  ): Promise<PayrollCalculation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, company: { include: { workPolicy: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hourlyRate = Number(user.profile?.hourlyRate) || 15;
    const overtimeRate = hourlyRate * 1.5;

    // Get attendance data
    const attendanceData = await this.calculateAttendanceHours(userId, period);

    // Get leave data
    const leaveData = await this.calculateLeaveHours(userId, period);

    // Calculate pay
    const regularPay = attendanceData.regularHours * hourlyRate;
    const overtimePay = attendanceData.overtimeHours * overtimeRate;
    const leavePay = leaveData.hours * hourlyRate;

    const grossPay = regularPay + overtimePay + leavePay;

    // Calculate deductions
    const deductions = this.calculateDeductions(grossPay, user.companyId);

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPay = grossPay - totalDeductions;

    return {
      userId,
      period,
      regularHours: attendanceData.regularHours,
      overtimeHours: attendanceData.overtimeHours,
      leaveHours: leaveData.hours,
      grossPay: Math.round(grossPay * 100) / 100,
      deductions,
      netPay: Math.round(netPay * 100) / 100,
    };
  }

  /**
   * Calculate attendance hours
   */
  private async calculateAttendanceHours(userId: string, period: PayrollPeriod) {
    const attendanceDays = await this.prisma.attendanceDay.findMany({
      where: {
        userId,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      include: {
        events: true,
      },
    });

    let regularHours = 0;
    let overtimeHours = 0;

    for (const day of attendanceDays) {
      const checkIn = day.events.find(e => e.type === AttendanceEventType.CheckIn);
      const checkOut = day.events.find(e => e.type === AttendanceEventType.CheckOut);

      if (checkIn && checkOut) {
        const totalMinutes = differenceInMinutes(
          new Date(checkOut.timestamp),
          new Date(checkIn.timestamp)
        );
        const hours = totalMinutes / 60;

        // Standard 8-hour day
        if (hours > 8) {
          regularHours += 8;
          overtimeHours += hours - 8;
        } else {
          regularHours += hours;
        }
      }

      // Add overtime from attendance record
      overtimeHours += (day.overtimeMinutes || 0) / 60;
    }

    return {
      regularHours: Math.round(regularHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
    };
  }

  /**
   * Calculate leave hours
   */
  private async calculateLeaveHours(userId: string, period: PayrollPeriod) {
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        userId,
        status: LeaveRequestStatus.Approved,
        OR: [
          {
            startDate: { gte: period.startDate, lte: period.endDate },
          },
          {
            endDate: { gte: period.startDate, lte: period.endDate },
          },
          {
            startDate: { lte: period.startDate },
            endDate: { gte: period.endDate },
          },
        ],
      },
    });

    let totalHours = 0;

    for (const leave of leaveRequests) {
      const start = leave.startDate < period.startDate ? period.startDate : leave.startDate;
      const end = leave.endDate > period.endDate ? period.endDate : leave.endDate;

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalHours += days * 8; // 8 hours per day
    }

    return { hours: totalHours };
  }

  /**
   * Calculate deductions
   */
  private calculateDeductions(grossPay: number, companyId: string): Deduction[] {
    const deductions: Deduction[] = [];

    // Tax deduction (simplified - would use actual tax tables)
    const taxRate = 0.15; // 15% tax
    deductions.push({
      type: 'Income Tax',
      amount: Math.round(grossPay * taxRate * 100) / 100,
      description: 'Federal income tax withholding',
    });

    // Social Security
    const ssRate = 0.062; // 6.2%
    deductions.push({
      type: 'Social Security',
      amount: Math.round(grossPay * ssRate * 100) / 100,
      description: 'Social Security contribution',
    });

    // Medicare
    const medicareRate = 0.0145; // 1.45%
    deductions.push({
      type: 'Medicare',
      amount: Math.round(grossPay * medicareRate * 100) / 100,
      description: 'Medicare contribution',
    });

    return deductions;
  }

  /**
   * Process payroll for multiple users
   */
  async processPayroll(
    companyId: string,
    period: PayrollPeriod,
    userIds?: string[]
  ) {
    const where: any = { companyId, isActive: true };
    if (userIds) where.id = { in: userIds };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    const results = [];
    for (const user of users) {
      try {
        const calculation = await this.calculatePayroll(user.id, period);
        results.push(calculation);
      } catch (error) {
        results.push({
          userId: user.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Generate payslip
   */
  async generatePayslip(userId: string, period: PayrollPeriod) {
    const calculation = await this.calculatePayroll(userId, period);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return {
      employee: {
        id: userId,
        name: user?.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user?.email,
        email: user?.email,
      },
      period: {
        start: format(period.startDate, 'yyyy-MM-dd'),
        end: format(period.endDate, 'yyyy-MM-dd'),
      },
      earnings: {
        regular: {
          hours: calculation.regularHours,
          rate: Number(user?.profile?.hourlyRate) || 15,
          amount: Math.round(calculation.regularHours * (Number(user?.profile?.hourlyRate) || 15) * 100) / 100,
        },
        overtime: {
          hours: calculation.overtimeHours,
          rate: (Number(user?.profile?.hourlyRate) || 15) * 1.5,
          amount: Math.round(calculation.overtimeHours * (Number(user?.profile?.hourlyRate) || 15) * 1.5 * 100) / 100,
        },
        leave: {
          hours: calculation.leaveHours,
          rate: Number(user?.profile?.hourlyRate) || 15,
          amount: Math.round(calculation.leaveHours * (Number(user?.profile?.hourlyRate) || 15) * 100) / 100,
        },
      },
      deductions: calculation.deductions,
      summary: {
        grossPay: calculation.grossPay,
        totalDeductions: calculation.deductions.reduce((sum, d) => sum + d.amount, 0),
        netPay: calculation.netPay,
      },
    };
  }

  /**
   * Get payroll summary for company
   */
  async getPayrollSummary(companyId: string, period: PayrollPeriod) {
    const payrolls = await this.processPayroll(companyId, period);

    const validPayrolls = payrolls.filter(p => !('error' in p)) as PayrollCalculation[];

    return {
      period: {
        start: format(period.startDate, 'yyyy-MM-dd'),
        end: format(period.endDate, 'yyyy-MM-dd'),
      },
      totalEmployees: validPayrolls.length,
      totalRegularHours: validPayrolls.reduce((sum, p) => sum + p.regularHours, 0),
      totalOvertimeHours: validPayrolls.reduce((sum, p) => sum + p.overtimeHours, 0),
      totalGrossPay: validPayrolls.reduce((sum, p) => sum + p.grossPay, 0),
      totalNetPay: validPayrolls.reduce((sum, p) => sum + p.netPay, 0),
      averageNetPay: validPayrolls.length > 0
        ? validPayrolls.reduce((sum, p) => sum + p.netPay, 0) / validPayrolls.length
        : 0,
    };
  }
}
