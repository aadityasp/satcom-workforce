/**
 * Locations Controller
 *
 * SuperAdmin-only endpoints for managing office locations (geofence centers).
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Locations (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all office locations (SuperAdmin only)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: { id: string; companyId: string },
    @Query('includeInactive') includeInactive?: string,
  ) {
    const result = await this.locationsService.findAll(
      user.companyId,
      includeInactive === 'true',
    );
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get office location by ID (SuperAdmin only)' })
  async findOne(
    @CurrentUser() user: { id: string; companyId: string },
    @Param('id') id: string,
  ) {
    const result = await this.locationsService.findOne(id, user.companyId);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create office location (SuperAdmin only)' })
  async create(
    @CurrentUser() user: { id: string; companyId: string },
    @Body() dto: CreateLocationDto,
  ) {
    const result = await this.locationsService.create(user.companyId, user.id, dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update office location (SuperAdmin only)' })
  async update(
    @CurrentUser() user: { id: string; companyId: string },
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const result = await this.locationsService.update(id, user.companyId, user.id, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate office location (SuperAdmin only)' })
  async remove(
    @CurrentUser() user: { id: string; companyId: string },
    @Param('id') id: string,
  ) {
    const result = await this.locationsService.remove(id, user.companyId, user.id);
    return { success: true, data: result };
  }
}
