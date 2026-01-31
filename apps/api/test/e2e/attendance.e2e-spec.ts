/**
 * Attendance E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Attendance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUser: any;
  let testCompany: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Create test company and user
    testCompany = await prisma.company.create({
      data: { name: 'Test Company' },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'attendance-test@example.com',
        passwordHash: '$2b$10$TestHash',
        companyId: testCompany.id,
        role: UserRole.Employee,
        isActive: true,
      },
    });

    // Login to get auth token
    // Note: In real tests, you'd use a proper password hash
    authToken = 'test-token';
  });

  afterEach(async () => {
    await prisma.attendanceEvent.deleteMany();
    await prisma.attendanceDay.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.company.deleteMany({ where: { name: { contains: 'Test' } } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /attendance/check-in', () => {
    it('should check in successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workMode: 'Office',
          latitude: 40.7128,
          longitude: -74.0060,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event.type).toBe('CheckIn');
    });

    it('should prevent double check-in', async () => {
      // First check-in
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workMode: 'Office' });

      // Second check-in should fail
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workMode: 'Office' })
        .expect(400);

      expect(response.body.message).toContain('Already checked in');
    });
  });

  describe('POST /attendance/check-out', () => {
    it('should check out successfully', async () => {
      // First check in
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workMode: 'Office' });

      // Then check out
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event.type).toBe('CheckOut');
    });

    it('should require check-in before check-out', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Not checked in');
    });
  });

  describe('GET /attendance/today', () => {
    it('should get today\'s attendance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /attendance', () => {
    it('should get attendance history', async () => {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: lastWeek.toISOString(),
          endDate: today.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /attendance/break/start', () => {
    it('should start a break', async () => {
      // First check in
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workMode: 'Office' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'Break' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
