/**
 * Users Controller
 *
 * Handles HTTP endpoints for user management.
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user (SuperAdmin only)
   */
  @Post()
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.usersService.create(
      createUserDto,
      user.companyId,
      user.id,
    );
    return { success: true, data: result };
  }

  /**
   * Get all users (HR/SuperAdmin only)
   */
  @Get()
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.findAll(user.companyId, {
      page,
      limit,
      role,
      status,
      search,
    });
    return { success: true, ...result };
  }

  /**
   * Get current user
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: any) {
    const result = await this.usersService.getCurrentUser(user.id);
    return { success: true, data: result };
  }

  /**
   * Update current user profile
   */
  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const result = await this.usersService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return { success: true, data: result };
  }

  /**
   * Get user by ID
   * AUTH-1 fix: Verify requesting user belongs to the same company
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.usersService.findOne(id, user.companyId);
    return { success: true, data: result };
  }

  /**
   * Update user (SuperAdmin only)
   */
  @Patch(':id')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.usersService.update(id, updateUserDto, user.id);
    return { success: true, data: result };
  }
}
