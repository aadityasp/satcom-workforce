/**
 * Root Application Module
 *
 * Imports and configures all feature modules for the Satcom Workforce API.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { LeavesModule } from './leaves/leaves.module';
import { PresenceModule } from './presence/presence.module';
import { ChatModule } from './chat/chat.module';
import { AnomaliesModule } from './anomalies/anomalies.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { ProjectsModule } from './projects/projects.module';
import { LocationsModule } from './locations/locations.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayrollModule } from './payroll/payroll.module';
import { DocumentsModule } from './documents/documents.module';
import { TrainingModule } from './training/training.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduled tasks (anomaly detection, cleanup)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Global services
    EmailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    AttendanceModule,
    TimesheetsModule,
    LeavesModule,
    PresenceModule,
    ChatModule,
    AnomaliesModule,
    AdminModule,
    StorageModule,
    ProjectsModule,
    LocationsModule,
    ReportsModule,
    SchedulingModule,
    NotificationsModule,
    PayrollModule,
    DocumentsModule,
    TrainingModule,
    ExpensesModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
