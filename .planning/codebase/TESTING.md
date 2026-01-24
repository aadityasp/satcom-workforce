# Testing

**Mapped:** 2026-01-24

## Overview

| Package | Framework | Coverage |
|---------|-----------|----------|
| API | Jest | Not measured |
| Web | Playwright | Not measured |
| Mobile | - | No tests |

## API Testing (`apps/api`)

### Framework

**Jest 29.7** with TypeScript support via `ts-jest`

### Configuration

```json
// package.json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

### Scripts

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Test File Pattern

```
src/
├── auth/
│   ├── auth.service.ts
│   └── auth.service.spec.ts    # Unit test
├── users/
│   ├── users.service.ts
│   └── users.service.spec.ts   # Unit test
```

### E2E Test Location

```
apps/api/test/
└── jest-e2e.json               # E2E config
```

### Current State

**No test files found in source directories.** The Jest config exists but tests haven't been written yet.

### Recommended Testing Approach

```typescript
// Example: auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.login({ email, password });

      // Assert
      expect(result.accessToken).toBeDefined();
    });
  });
});
```

## Web Testing (`apps/web`)

### Framework

**Playwright 1.41** for E2E tests

### Scripts

```bash
# Run Playwright tests
npm run test

# Run with UI mode
npm run test:ui
```

### Current State

Playwright is configured but no test files detected in `apps/web`.

### Recommended Test Structure

```
apps/web/
├── tests/
│   ├── login.spec.ts
│   ├── dashboard.spec.ts
│   └── admin/
│       └── users.spec.ts
├── playwright.config.ts
```

### Example Test

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('successful login redirects to dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email"]', 'admin@satcom.com');
  await page.fill('[data-testid="password"]', 'Password123!');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('invalid credentials show error', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email"]', 'wrong@example.com');
  await page.fill('[data-testid="password"]', 'wrong');
  await page.click('[data-testid="login-button"]');

  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```

## Mobile Testing (`apps/mobile`)

### Current State

No testing framework configured for mobile app.

### Recommended Approach

1. **Unit tests:** Jest + React Native Testing Library
2. **E2E tests:** Detox or Maestro

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native @types/jest
```

## Test Data

### Seed Data

The API has seed data for development:

```bash
# Seed the database
npm run db:seed
```

**Seed file:** `apps/api/prisma/seed.ts`

**Demo users:**

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | admin@satcom.com | Password123! |
| HR | hr@satcom.com | Password123! |
| Manager | manager@satcom.com | Password123! |
| Employee | john@satcom.com | Password123! |

### Test Database

For isolated testing, use a separate database:

```bash
DATABASE_URL="postgresql://satcom:satcom@localhost:5432/satcom_test" npm run test
```

## Coverage

### Current Coverage

Not measured - no tests exist.

### Coverage Goals (Recommended)

| Type | Target |
|------|--------|
| Unit tests (services) | 80% |
| Integration tests (controllers) | 70% |
| E2E tests (critical paths) | Key user journeys |

### Critical Paths to Test

1. **Authentication**
   - Login with valid/invalid credentials
   - Token refresh
   - Logout
   - Password reset

2. **Attendance**
   - Check-in (with/without geofence)
   - Check-out
   - Break start/end
   - Daily summary calculation

3. **Timesheets**
   - Create entry
   - Submit for approval
   - Approve/reject (manager)

4. **Leaves**
   - Submit request
   - View balance
   - Approve/reject (manager)

5. **RBAC**
   - Employee can only see own data
   - Manager sees team data
   - HR sees company data
   - SuperAdmin has full access

## Mocking

### Prisma Mocking

```typescript
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // ... other models
};
```

### API Mocking (Web/Mobile)

```typescript
// Using MSW (Mock Service Worker) - recommended
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({ accessToken: 'mock-token' }));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## CI/CD Testing

### Recommended Pipeline

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: satcom_test
      ports:
        - 5432:5432
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run db:migrate
    - run: npm run test
    - run: npm run test:e2e
```
