# Phase 3: Timesheets & Projects - Research

**Researched:** 2026-01-24
**Domain:** Time tracking with file attachments, project/task CRUD
**Confidence:** HIGH

## Summary

Phase 3 builds timesheet functionality on an already-established codebase. The API scaffolding exists (NestJS `timesheets.service.ts`, `timesheets.controller.ts`), Prisma schema is complete (`TimesheetEntry`, `TimesheetAttachment`, `Project`, `Task`), and the frontend has patterns to follow (React hooks like `useAttendance`, modal components like `CheckInModal`, Tanstack Query via `api.ts` client).

The research confirms no new libraries are needed. The existing MinIO storage service supports presigned URLs for uploads. The frontend uses Framer Motion for animations, shadcn/ui component patterns, and Zustand for state. All patterns are established.

**Primary recommendation:** Extend existing patterns rather than introducing new approaches. The DTO needs minor updates (make `taskId` optional per CONTEXT.md), add attachment linking to timesheet entries, and build frontend components following the modal + hook pattern established in Phase 2.

## Standard Stack

### Core (Already in Codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.x | API framework | Already in use, provides modules/services/controllers |
| Prisma | 5.x | ORM | Already in use, schema already has Timesheet models |
| MinIO client (`minio`) | 7.x | S3-compatible storage | Already integrated in `storage.service.ts` |
| React | 18.x | UI framework | Already in use |
| Tanstack Query | 5.x | Server state | Used via api client pattern in hooks |
| Framer Motion | 10.x | Animations | Used in modals for snappy feel |
| Lucide React | 0.x | Icons | Consistent icon library |

### Supporting (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 2.x | Date formatting | Format time displays, date ranges |
| `class-validator` | 0.14.x | DTO validation | Validate API inputs |
| `@nestjs/swagger` | 7.x | API docs | Document new endpoints |
| Zustand | 4.x | Client state | If global timesheet state needed (likely not) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom time picker | react-datepicker | Complexity; custom aligns with Satcom branding |
| Direct MinIO upload | Presigned URL upload | Presigned URLs already implemented, more secure |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

Files to create/modify:

```
apps/api/src/
├── timesheets/
│   ├── timesheets.module.ts      # (exists)
│   ├── timesheets.service.ts     # Extend with attachment linking
│   ├── timesheets.controller.ts  # (exists, minimal changes)
│   └── dto/
│       ├── create-timesheet.dto.ts  # Make taskId optional
│       └── update-timesheet.dto.ts  # (exists)
├── projects/                     # NEW module for admin CRUD
│   ├── projects.module.ts
│   ├── projects.service.ts
│   ├── projects.controller.ts
│   └── dto/
│       ├── create-project.dto.ts
│       ├── update-project.dto.ts
│       ├── create-task.dto.ts
│       └── update-task.dto.ts

apps/web/src/
├── app/
│   └── timesheets/
│       └── page.tsx              # Replace placeholder with real UI
├── components/
│   └── timesheets/
│       ├── TimesheetEntryModal.tsx    # Two-step: project → task → form
│       ├── TimesheetHistoryTable.tsx  # Table with click-to-edit
│       ├── WeeklySummary.tsx          # Summary stats card
│       ├── TimePresetButtons.tsx      # Quick duration buttons
│       └── FileUpload.tsx             # Drag-drop attachment UI
├── hooks/
│   └── useTimesheets.ts          # CRUD operations, similar to useAttendance
└── lib/
    └── api.ts                    # (exists, add timesheet methods)
```

### Pattern 1: Service Layer with Validation

**What:** Business logic in service, controller is thin
**When to use:** All API operations
**Example:**
```typescript
// timesheets.service.ts pattern
async create(userId: string, dto: CreateTimesheetDto) {
  // 1. Validate task belongs to project (if taskId provided)
  // 2. Check daily total doesn't exceed 24h
  // 3. Create entry
  // 4. Link attachments if provided
  return this.prisma.timesheetEntry.create({ ... });
}
```

### Pattern 2: React Hook for API State

**What:** Custom hook encapsulates API calls, loading states, errors
**When to use:** Frontend data fetching
**Example:**
```typescript
// useTimesheets.ts pattern (follows useAttendance)
export function useTimesheets() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const createEntry = useCallback(async (data: CreateTimesheetDto) => {
    setIsLoading(true);
    const response = await api.post('/timesheets', data);
    // Handle response, update state
    setIsLoading(false);
  }, []);

  return { entries, isLoading, createEntry, ... };
}
```

### Pattern 3: Two-Step Modal Flow

**What:** Multi-step modal for complex forms
**When to use:** When form has dependent selections (project → task)
**Example:**
```typescript
// TimesheetEntryModal.tsx
const [step, setStep] = useState<'project' | 'form'>('project');

// Step 1: Select project (grid of project cards)
// Step 2: Entry form (task dropdown, time inputs, notes, attachments)
```

### Anti-Patterns to Avoid

- **Direct prisma calls in controllers:** Always go through service layer
- **Fetching all projects in one call:** Already using select to limit fields
- **Client-side 24h validation only:** Must validate server-side (already in service)
- **Uploading files through API body:** Use presigned URLs (already implemented)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to S3 | Custom upload endpoint | StorageService presigned URLs | Security, already implemented |
| Time duration calculation | Manual math | `date-fns` differenceInMinutes | Edge cases handled |
| Date range filtering | Custom SQL | Prisma date filters | Type-safe, injection-proof |
| Form validation | Manual checks | class-validator decorators | Consistent with codebase |

**Key insight:** The codebase already has solutions for file storage, validation, and API patterns. Reuse them.

## Common Pitfalls

### Pitfall 1: Task Required When User Decided Optional

**What goes wrong:** DTO marks taskId as required but CONTEXT.md says optional
**Why it happens:** Current DTO has `@IsUUID() taskId: string`
**How to avoid:** Update DTO to use `@IsOptional() @IsUUID() taskId?: string`
**Warning signs:** 400 errors when submitting entry without task

### Pitfall 2: 24h Validation Excludes Current Entry on Edit

**What goes wrong:** Edit fails because it counts the entry being edited
**Why it happens:** Query doesn't exclude current entry ID
**How to avoid:** Already handled in service with `id: { not: id }` - verify this pattern
**Warning signs:** Cannot update entry to same duration

### Pitfall 3: Attachment Orphans

**What goes wrong:** Files uploaded but entry creation fails, leaving orphan files
**Why it happens:** Upload happens before entry creation
**How to avoid:** Upload after entry creation, or use transaction
**Warning signs:** Files in MinIO with no database reference

### Pitfall 4: Same-Day Edit Restriction Timezone Issues

**What goes wrong:** User in different timezone can't edit "today's" entries
**Why it happens:** Server vs client timezone mismatch
**How to avoid:** Use user's timezone from profile (already in schema)
**Warning signs:** Edit fails near midnight

### Pitfall 5: Start/End Time Overlap

**What goes wrong:** User enters end time before start time
**Why it happens:** No client-side validation
**How to avoid:** Validate end > start, calculate duration automatically
**Warning signs:** Negative or huge durations

## Code Examples

### Create Timesheet Entry (API)

```typescript
// apps/api/src/timesheets/dto/create-timesheet.dto.ts
import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, Min, Max, IsArray } from 'class-validator';

export class CreateTimesheetDto {
  @IsDateString()
  date: string;  // ISO date string for "today"

  @IsUUID()
  projectId: string;

  @IsOptional()  // <-- CHANGED: was required
  @IsUUID()
  taskId?: string;

  @IsNumber()
  @Min(15)
  @Max(1440)
  minutes: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentKeys?: string[];  // Object keys from presigned upload
}
```

### Link Attachments After Upload

```typescript
// In timesheets.service.ts - after entry creation
if (dto.attachmentKeys?.length) {
  await this.prisma.timesheetAttachment.createMany({
    data: dto.attachmentKeys.map(key => ({
      timesheetEntryId: entry.id,
      fileName: key.split('/').pop() || 'file',
      fileUrl: key,  // Store object key, generate URL on fetch
      fileType: this.detectMimeType(key),
      fileSize: 0,  // Could get from MinIO stat
    })),
  });
}
```

### Two-Step Modal Structure

```typescript
// apps/web/src/components/timesheets/TimesheetEntryModal.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'project' | 'form';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimesheetDto) => Promise<void>;
  projects: Project[];
  editEntry?: TimesheetEntry;  // For edit mode
}

export function TimesheetEntryModal({ isOpen, onClose, onSubmit, projects, editEntry }: Props) {
  const [step, setStep] = useState<Step>(editEntry ? 'form' : 'project');
  const [selectedProject, setSelectedProject] = useState<Project | null>(editEntry?.project || null);

  // Step 1: Project selection grid
  // Step 2: Form with task dropdown, time pickers, notes, file upload

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setStep('form');
  };

  // ...
}
```

### Time Preset Buttons

```typescript
// apps/web/src/components/timesheets/TimePresetButtons.tsx
const presets = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

export function TimePresetButtons({ onSelect, selectedMinutes }: Props) {
  return (
    <div className="flex gap-2">
      {presets.map(p => (
        <button
          key={p.label}
          onClick={() => onSelect(p.minutes)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            selectedMinutes === p.minutes
              ? 'bg-blue-600 text-white'
              : 'bg-silver-100 text-silver-600 hover:bg-silver-200'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

### Presigned Upload Flow

```typescript
// Frontend upload flow
async function uploadFile(file: File): Promise<string> {
  // 1. Get presigned URL from API
  const { uploadUrl, objectKey } = await api.get<{ uploadUrl: string; objectKey: string }>(
    `/storage/upload-url?folder=timesheets&fileName=${file.name}&contentType=${file.type}`
  ).then(r => r.data!);

  // 2. Upload directly to MinIO
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // 3. Return object key to include in timesheet creation
  return objectKey;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| File upload through API | Presigned URL direct upload | Standard practice | Reduces API server load |
| Client-side validation only | Server-side with class-validator | Standard practice | Prevents bypass attacks |
| Modal per action | Multi-step single modal | UX pattern | Reduced context switching |

**Deprecated/outdated:** None identified - codebase is using current patterns.

## Open Questions

1. **File size limits?**
   - What we know: MinIO has no default limit, presigned URL expires in 15 min
   - What's unclear: Should there be a max file size?
   - Recommendation: Add 10MB limit client-side, document in DTO

2. **Allowed file types?**
   - What we know: Schema has `fileType` field
   - What's unclear: Should we restrict to images/PDFs only?
   - Recommendation: Allow common types (images, PDF, doc/docx, xls/xlsx), validate client-side

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/api/src/timesheets/` - existing service and controller
- Codebase analysis: `apps/api/prisma/schema.prisma` - TimesheetEntry, TimesheetAttachment, Project, Task models
- Codebase analysis: `apps/api/src/storage/storage.service.ts` - MinIO presigned URL implementation
- Codebase analysis: `apps/web/src/hooks/useAttendance.ts` - hook pattern to follow
- Codebase analysis: `apps/web/src/components/attendance/CheckInModal.tsx` - modal pattern to follow

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions: Two-step modal, optional task, start/end time pickers, presets

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Following established codebase patterns
- Pitfalls: MEDIUM - Based on common patterns, some timezone edge cases theoretical

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)
