/**
 * Prisma Service
 *
 * Extends PrismaClient to integrate with NestJS lifecycle.
 * Handles database connection on module init and cleanup on shutdown.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  /**
   * Connect to database when module initializes
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from database on application shutdown
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
