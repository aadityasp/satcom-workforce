/**
 * Users Service
 *
 * Handles user management business logic.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user with profile
   */
  async create(createUserDto: CreateUserDto, companyId: string, actorId: string) {
    // Check for existing email
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Check for existing employee code
    const existingCode = await this.prisma.employeeProfile.findUnique({
      where: { employeeCode: createUserDto.profile.employeeCode },
    });

    if (existingCode) {
      throw new ConflictException('Employee code already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user with profile
    const user = await this.prisma.user.create({
      data: {
        companyId,
        email: createUserDto.email.toLowerCase(),
        passwordHash,
        phone: createUserDto.phone,
        role: createUserDto.role || UserRole.Employee,
        profile: {
          create: {
            employeeCode: createUserDto.profile.employeeCode,
            firstName: createUserDto.profile.firstName,
            lastName: createUserDto.profile.lastName,
            designation: createUserDto.profile.designation,
            department: createUserDto.profile.department,
            timezone: createUserDto.profile.timezone || 'Asia/Kolkata',
            managerId: createUserDto.profile.managerId,
            joinDate: new Date(createUserDto.profile.joinDate),
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'UserCreated',
        entityType: 'User',
        entityId: user.id,
        after: { email: user.email, role: user.role },
      },
    });

    // Create initial leave balances
    await this.initializeLeaveBalances(user.id, companyId);

    return this.sanitizeUser(user);
  }

  /**
   * Find all users with pagination
   */
  async findAll(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      role?: UserRole;
      status?: string;
      search?: string;
    },
  ) {
    const { page = 1, limit = 20, role, status, search } = options;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.profile = { status };
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        { profile: { employeeCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.sanitizeUser),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing
    if (updateUserDto.email && updateUserDto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const before = { email: existing.email, role: existing.role, isActive: existing.isActive };

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email?.toLowerCase(),
        phone: updateUserDto.phone,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
      include: { profile: true },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: updateUserDto.role !== existing.role ? 'RoleChanged' : 'UserUpdated',
        entityType: 'User',
        entityId: id,
        before,
        after: { email: user.email, role: user.role, isActive: user.isActive },
      },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.prisma.employeeProfile.update({
      where: { userId },
      data: updateProfileDto,
    });

    return updated;
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string) {
    return this.findOne(userId);
  }

  /**
   * Initialize leave balances for new user
   */
  private async initializeLeaveBalances(userId: string, companyId: string) {
    const leaveTypes = await this.prisma.leaveTypeConfig.findMany({
      where: { companyId, isActive: true },
    });

    const currentYear = new Date().getFullYear();
    const balances = leaveTypes.map((lt) => ({
      userId,
      leaveTypeId: lt.id,
      year: currentYear,
      allocated: lt.defaultDays,
    }));

    await this.prisma.leaveBalance.createMany({
      data: balances,
    });
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
