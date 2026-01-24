'use client';

import { Conversation } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { formatRelative } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  // For direct chats, show the other person's info
  const otherMember = conversation.type === 'Direct'
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = conversation.name
    || (otherMember?.user.profile
      ? `${otherMember.user.profile.firstName} ${otherMember.user.profile.lastName}`
      : otherMember?.user.email)
    || 'Unknown';

  const initials = otherMember?.user.profile
    ? `${otherMember.user.profile.firstName?.[0] || ''}${otherMember.user.profile.lastName?.[0] || ''}`
    : conversation.name?.[0]?.toUpperCase() || '?';

  const avatarUrl = otherMember?.user.profile?.avatarUrl;

  const lastMessage = conversation.messages?.[0];
  const lastMessagePreview = lastMessage?.deletedAt
    ? 'Message deleted'
    : lastMessage?.content
    ? lastMessage.content.length > 40
      ? lastMessage.content.slice(0, 40) + '...'
      : lastMessage.content
    : 'No messages yet';

  const lastMessageTime = conversation.lastMessageAt
    ? formatRelative(new Date(conversation.lastMessageAt), new Date())
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-silver-50'
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-blue-600 font-medium">{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-navy-900 truncate">{displayName}</span>
          {conversation.unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-5 text-center">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-silver-500 truncate">{lastMessagePreview}</span>
          <span className="text-xs text-silver-400 flex-shrink-0">{lastMessageTime}</span>
        </div>
      </div>
    </button>
  );
}
