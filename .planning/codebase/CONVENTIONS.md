# Code Conventions

**Mapped:** 2026-01-24

## TypeScript

### Strict Mode

All packages use strict TypeScript:
- `strict: true` in tsconfig
- No implicit any
- Strict null checks

### Import Style

```typescript
// External dependencies first
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Internal imports second
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
```

### Type Exports

Shared types exported from `@satcom/shared`:

```typescript
// Import types
import { UserRole, WorkMode, AttendanceDay } from '@satcom/shared';

// Import theme
import { colors, typography } from '@satcom/shared/theme';
```

## NestJS Conventions

### Module Structure

Each module follows this pattern:

```typescript
// {feature}.module.ts
@Module({
  imports: [PrismaModule, /* other deps */],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService], // if needed by other modules
})
export class FeatureModule {}
```

### Controller Pattern

```typescript
// {feature}.controller.ts
@ApiTags('Feature')
@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all features' })
  @ApiResponse({ status: 200, description: 'Features retrieved' })
  async findAll() {
    const data = await this.featureService.findAll();
    return { success: true, data };
  }
}
```

### Response Format

Consistent wrapper for all responses:

```typescript
return {
  success: true,
  data: result,
};

// or for errors (handled by exception filters)
throw new BadRequestException('Error message');
```

### DTO Validation

```typescript
// create-feature.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FeatureType })
  @IsEnum(FeatureType)
  type: FeatureType;
}
```

### Guard Decorators

```typescript
// Public routes (no auth)
@Public()
@Post('login')

// Authenticated routes
@UseGuards(JwtAuthGuard)
@Get('profile')

// Role-restricted routes
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SuperAdmin)
@Get('admin-data')
```

### Custom Decorators

```typescript
// Get current user from request
@CurrentUser('id') userId: string
@CurrentUser() user: User
```

## React/Next.js Conventions

### Component Structure

```tsx
// Components use 'use client' when needed
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  onAction: () => void;
}

export function FeatureCard({ title, onAction }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg bg-white p-4 shadow"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <button onClick={onAction}>Action</button>
    </motion.div>
  );
}
```

### Styling Pattern

Using Tailwind with utility functions:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn('base-styles', condition && 'conditional-styles')} />
```

### State Management

**Zustand for client state:**

```typescript
// store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

**TanStack Query for server state:**

```typescript
// hooks/useAttendance.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAttendance() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get('/attendance/today'),
  });
}

export function useCheckIn() {
  return useMutation({
    mutationFn: (data: CheckInDto) => api.post('/attendance/check-in', data),
  });
}
```

## React Native/Expo Conventions

### Screen Structure

```tsx
// app/(tabs)/feature.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/src/store/auth';
import { colors, spacing } from '@satcom/shared/theme';

export default function FeatureScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.navy[900],
  },
});
```

### Secure Storage

```typescript
// For auth tokens on mobile
import * as SecureStore from 'expo-secure-store';

// Zustand persist with SecureStore
const storage = {
  getItem: async (name: string) => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};
```

## Prisma Conventions

### Model Naming

```prisma
// PascalCase for models
model AttendanceDay {
  // ...
}

// snake_case for table names
@@map("attendance_days")
```

### Relation Naming

```prisma
// Explicit relation names for clarity
user User @relation(fields: [userId], references: [id])
manager User? @relation("EmployeeManager", fields: [managerId], references: [id])
```

### Index Patterns

```prisma
// Common query patterns indexed
@@index([userId])
@@index([companyId])
@@index([date])
@@unique([userId, date])
```

## Documentation

### JSDoc for Services

```typescript
/**
 * Check in the user for the day
 *
 * @param userId - The user's ID
 * @param dto - Check-in data including work mode and optional location
 * @returns The created attendance event
 * @throws BadRequestException if already checked in
 */
async checkIn(userId: string, dto: CheckInDto): Promise<AttendanceEvent> {
  // ...
}
```

### Swagger Decorators

Every controller method should have:
- `@ApiOperation` - What it does
- `@ApiResponse` - Possible responses
- `@ApiBearerAuth` - If auth required

## Error Handling

### API Errors

```typescript
// Use NestJS exceptions
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Invalid token');
throw new ForbiddenException('Insufficient permissions');
```

### Client Error Handling

```typescript
// TanStack Query error handling
const { data, error, isLoading } = useQuery({...});

if (error) {
  return <ErrorMessage message={error.message} />;
}
```

## Git Conventions

### Commit Messages

```
type: short description

type can be:
- feat: new feature
- fix: bug fix
- docs: documentation
- chore: maintenance
- refactor: code restructure
- test: adding tests
```

### Branch Naming

```
feature/feature-name
fix/bug-description
docs/document-name
```
