/**
 * Reports Controller
 *
 * Exposes dashboard endpoints for Manager and HR roles.
 * Single endpoint with role-based response.
 */

import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * GET /reports/dashboard
   * Returns role-specific dashboard data:
   * - Manager: Team data (direct reports only)
   * - HR/SuperAdmin: Org-wide data
   */
  @Get('dashboard')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  async getDashboard(@Req() req: any) {
    const { id: userId, companyId, role } = req.user;

    if (role === UserRole.Manager) {
      return this.reportsService.getManagerDashboard(userId, companyId);
    }

    // HR and SuperAdmin get org-wide dashboard
    return this.reportsService.getHRDashboard(companyId);
  }

  /**
   * GET /reports/dashboard/manager
   * Explicit Manager endpoint (for clarity)
   */
  @Get('dashboard/manager')
  @Roles(UserRole.Manager)
  async getManagerDashboard(@Req() req: any) {
    const { id: userId, companyId } = req.user;
    return this.reportsService.getManagerDashboard(userId, companyId);
  }

  /**
   * GET /reports/dashboard/hr
   * Explicit HR/Admin endpoint (for clarity)
   */
  @Get('dashboard/hr')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  async getHRDashboard(@Req() req: any) {
    const { companyId } = req.user;
    return this.reportsService.getHRDashboard(companyId);
  }
}
