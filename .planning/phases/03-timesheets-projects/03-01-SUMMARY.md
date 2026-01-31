# Plan 03-01 Summary: Enhance Timesheets API

**Status:** Complete
**Date:** 2026-01-24

## Objective
Enhance the existing timesheets API to support optional task selection, file attachments, and same-day edit restriction.

## Deliverables

### Files Modified
- `apps/api/src/timesheets/dto/create-timesheet.dto.ts` - Added startTime, endTime, optional taskId, attachmentKeys
- `apps/api/src/timesheets/dto/update-timesheet.dto.ts` - Mirrored optional fields from CreateDto
- `apps/api/src/timesheets/timesheets.service.ts` - Enhanced CRUD with attachments and same-day restrictions
- `apps/api/src/timesheets/timesheets.controller.ts` - Added findOne and getAttachmentUrl endpoints
- `apps/api/src/timesheets/timesheets.module.ts` - Imported StorageModule

### Key Features
1. **Duration Calculation**: Minutes calculated from startTime/endTime using date-fns
2. **Optional Task**: taskId is now optional in CreateTimesheetDto
3. **File Attachments**: Supports attachmentKeys array linked to TimesheetAttachment model
4. **Same-Day Restriction**: Edit/delete blocked for non-today entries
5. **Attachment URLs**: GET /timesheets/attachment/:key returns presigned download URL with ownership verification
6. **Single Entry Fetch**: GET /timesheets/:id returns single entry with ownership check

## Technical Notes
- Integrated StorageService for presigned URL generation
- Added helper method `getFileTypeFromKey()` to determine MIME type from object key
- Attachments are cascade deleted when entry is deleted (via Prisma relation)
- Same-day check uses `isSameDay()` from date-fns

## Verification
- DTOs accept optional taskId and attachmentKeys
- Service calculates minutes from start/end times
- Attachments linked to entries in database
- Same-day restriction enforced for edit/delete
- API returns presigned download URLs for attachments

## Issues
None encountered.
