# Phase 6: Chat - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time messaging between team members — 1:1 direct messages and group conversations. Messages deliver via WebSocket with read/delivery tracking. History is paginated. All roles (Employee, Manager, HR, Super Admin) have chat access within their company.

Voice notes, file attachments beyond images, and video calling are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User opted to skip discussion — Claude has full flexibility on all implementation choices:

**Conversation UI**
- Standard chat layout (messages flow bottom-to-top, newest at bottom)
- Conversation list sidebar with unread counts
- Message bubbles (sent right, received left)
- Timestamps on messages (relative for recent, absolute for older)
- Typing indicators for active conversations
- Online status shown in conversation headers

**Group Chat Behavior**
- Any user can create a group chat
- Creator can add/remove members and rename group
- Members can leave groups voluntarily
- Groups scoped to same company only
- No minimum/maximum member limits enforced

**Message Features**
- Text messages with basic formatting (links auto-detected)
- Image attachments via MinIO (reuse existing infrastructure)
- Edit own messages (within reasonable time window)
- Delete own messages (soft delete, shows "message deleted")
- No reactions in initial implementation

**Notification & Status**
- Read receipts: checkmarks (sent → delivered → read)
- Unread count badges on conversations
- Browser notifications for new messages (if permitted)
- Messages marked read when conversation opened

**Data Model**
- Conversation entity (type: direct/group)
- ConversationMember join table
- Message entity with sender, content, timestamps
- MessageStatus for delivery/read tracking per recipient

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches based on existing codebase patterns:
- Reuse Socket.IO gateway from Phase 5 for real-time delivery
- Follow existing API patterns (NestJS controllers, Prisma models)
- Match existing UI component library usage in web app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-chat*
*Context gathered: 2026-01-24*
