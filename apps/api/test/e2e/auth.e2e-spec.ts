/**
 * Authentication E2E Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create a test user
      const company = await prisma.company.create({
        data: { name: 'Test Company' },
      });

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: '$2b$10$YourHashedPasswordHere', // bcrypt hash of 'password'
          companyId: company.id,
          role: 'Employee',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject disabled accounts', async () => {
      const company = await prisma.company.create({
        data: { name: 'Test Company' },
      });

      await prisma.user.create({
        data: {
          email: 'disabled@example.com',
          passwordHash: '$2b$10$YourHashedPasswordHere',
          companyId: company.id,
          role: 'Employee',
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'disabled@example.com',
          password: 'password',
        })
        .expect(401);

      expect(response.body.message).toContain('disabled');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      // Create user and get refresh token
      const company = await prisma.company.create({
        data: { name: 'Test Company' },
      });

      const user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          passwordHash: 'hash',
          companyId: company.id,
          role: 'Employee',
          isActive: true,
        },
      });

      const refreshToken = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: 'test-token-hash',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'test-token-hash' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const company = await prisma.company.create({
        data: { name: 'Test Company' },
      });

      await prisma.user.create({
        data: {
          email: 'forgot@example.com',
          passwordHash: 'hash',
          companyId: company.id,
          role: 'Employee',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link has been sent');
    });
  });
});
