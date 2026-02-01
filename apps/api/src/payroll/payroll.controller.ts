/**
 * Payroll Controller
 */

import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('calculate')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Calculate payroll for a user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async calculatePayroll(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.payrollService.calculatePayroll(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    return { success: true, data: result };
  }

  @Post('process')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Process payroll for company' })
  async processPayroll(
    @CurrentUser() user: any,
    @Body() dto: {
      startDate: string;
      endDate: string;
      userIds?: string[];
    },
  ) {
    const result = await this.payrollService.processPayroll(
      user.companyId,
      {
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      dto.userIds,
    );
    return { success: true, data: result };
  }

  @Get('payslip')
  @ApiOperation({ summary: 'Get payslip' })
  async getPayslip(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.payrollService.generatePayslip(user.id, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    return { success: true, data: result };
  }

  @Get('summary')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get payroll summary' })
  async getSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.payrollService.getPayrollSummary(user.companyId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    return { success: true, data: result };
  }
}
