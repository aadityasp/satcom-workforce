/**
 * Scheduling E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { addDays, format } from 'date-fns';

describe('Scheduling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminToken: string;
  let testCompany: any;
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Create test company
    testCompany = await prisma.company.create({
      data: { name: 'Test Company' },
    });

    // Create test employee
    testUser = await prisma.user.create({
      data: {
        email: 'employee@example.com',
        passwordHash: '$2b$10$TestHash',
        companyId: testCompany.id,
        role: UserRole.Employee,
        isActive: true,
      },
    });

    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: '$2b$10$TestHash',
        companyId: testCompany.id,
        role: UserRole.SuperAdmin,
        isActive: true,
      },
    });

    authToken = 'employee-token';
    adminToken = 'admin-token';
  });

  afterEach(async () => {
    await prisma.shift.deleteMany();
    await prisma.shiftTemplate.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'example' } } });
    await prisma.company.deleteMany({ where: { name: { contains: 'Test' } } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /scheduling/shifts', () => {
    it('should create a shift (admin only)', async () => {
      const tomorrow = addDays(new Date(), 1);
      const startTime = new Date(tomorrow);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(17, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          workMode: 'Office',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser.id);
    });

    it('should reject shift creation by employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUser.id,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should detect shift conflicts', async () => {
      const tomorrow = addDays(new Date(), 1);
      const startTime = new Date(tomorrow);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(17, 0, 0, 0);

      // Create first shift
      await request(app.getHttpServer())
        .post('/api/v1/scheduling/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      // Try to create overlapping shift
      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(400);

      expect(response.body.message).toContain('conflicts');
    });
  });

  describe('GET /scheduling/shifts', () => {
    it('should get shifts for date range', async () => {
      const startDate = new Date();
      const endDate = addDays(startDate, 7);

      const response = await request(app.getHttpServer())
        .get('/api/v1/scheduling/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /scheduling/auto-schedule', () => {
    it('should generate AI-optimized schedule', async () => {
      const startDate = new Date();
      const endDate = addDays(startDate, 7);

      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/auto-schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          minStaffCount: 2,
          maxStaffCount: 5,
          shiftDuration: 480, // 8 hours
          breakDuration: 60,
          optimizeFor: 'balanced',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedule).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
    });
  });

  describe('POST /scheduling/swaps', () => {
    it('should request a shift swap', async () => {
      // Create a shift first
      const tomorrow = addDays(new Date(), 2);
      const shift = await prisma.shift.create({
        data: {
          userId: testUser.id,
          companyId: testCompany.id,
          startTime: tomorrow,
          endTime: addDays(tomorrow, 0.5),
          status: 'Scheduled',
        },
      });

      // Create another employee to swap with
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: 'hash',
          companyId: testCompany.id,
          role: UserRole.Employee,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/swaps')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shiftId: shift.id,
          requestedToUserId: otherUser.id,
          reason: 'Personal appointment',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Pending');
    });
  });

  describe('POST /scheduling/templates', () => {
    it('should create shift template', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/scheduling/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
          breakDuration: 60,
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Morning Shift');
    });
  });
});
