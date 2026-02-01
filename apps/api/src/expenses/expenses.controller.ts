/**
 * Expenses Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UserRole, ExpenseStatus, ExpenseCategory } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit expense' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('receipt'))
  async submitExpense(
    @CurrentUser() user: any,
    @UploadedFile() receipt: Express.Multer.File,
    @Body() dto: any,
  ) {
    const result = await this.expensesService.submitExpense(
      user.id,
      user.companyId,
      { ...dto, receiptFile: receipt },
    );
    return { success: true, data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get expenses' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExpenses(
    @CurrentUser() user: any,
    @Query('status') status?: ExpenseStatus,
    @Query('category') category?: ExpenseCategory,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.expensesService.getExpenses(user.companyId, {
      userId: user.role === UserRole.Employee ? user.id : userId,
      status,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Get('summary')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Get expense summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    const result = await this.expensesService.getSummary(user.companyId, start, end);
    return { success: true, data: result };
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get expense policies' })
  async getPolicies(@CurrentUser() user: any) {
    const result = await this.expensesService.getPolicies(user.companyId);
    return { success: true, data: result };
  }

  @Post('policies')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create expense policy' })
  async createPolicy(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    const result = await this.expensesService.createPolicy(
      user.companyId,
      user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  async getExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.expensesService.getExpenses(user.companyId, {
      userId: user.role === UserRole.Employee ? user.id : undefined,
    });
    const expense = result.data.find((e: any) => e.id === id);
    return { success: true, data: expense };
  }

  @Patch(':id/approve')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Approve expense' })
  async approveExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { notes?: string },
  ) {
    const result = await this.expensesService.approveExpense(
      id,
      user.companyId,
      user.id,
      dto.notes,
    );
    return { success: true, data: result };
  }

  @Patch(':id/reject')
  @Roles(UserRole.Manager, UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Reject expense' })
  async rejectExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { reason: string },
  ) {
    const result = await this.expensesService.rejectExpense(
      id,
      user.companyId,
      user.id,
      dto.reason,
    );
    return { success: true, data: result };
  }

  @Patch(':id/reimburse')
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Mark expense as reimbursed' })
  async reimburseExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { reimbursementMethod: string; reference?: string },
  ) {
    const result = await this.expensesService.markReimbursed(
      id,
      user.companyId,
      user.id,
      dto.reimbursementMethod,
      dto.reference,
    );
    return { success: true, data: result };
  }
}
