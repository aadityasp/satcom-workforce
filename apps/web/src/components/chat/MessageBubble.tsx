'use client';

import { format, formatRelative } from 'date-fns';
import { ChatMessage } from '@/store/chat';
import { MessageStatus } from './MessageStatus';
import { useAuthStore } from '@/store/auth';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  isGrouped?: boolean;
}

export function MessageBubble({ message, showAvatar = true, isGrouped = false }: MessageBubbleProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;

  const senderName = message.sender?.profile
    ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`
    : message.sender?.email || 'Unknown';

  const initials = message.sender?.profile
    ? `${message.sender.profile.firstName?.[0] || ''}${message.sender.profile.lastName?.[0] || ''}`
    : '?';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays < 7) {
      return formatRelative(date, now);
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  return (
    <div
      className={`flex gap-2 px-4 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      } ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            {message.sender?.profile?.avatarUrl ? (
              <img
                src={message.sender.profile.avatarUrl}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-blue-600 text-xs font-medium">{initials}</span>
            )}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (for group chats, not own messages) */}
        {!isOwn && !isGrouped && (
          <span className="text-xs text-silver-500 mb-0.5 ml-1">{senderName}</span>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-silver-100 text-navy-900 rounded-bl-md'
          } ${isDeleted ? 'italic opacity-60' : ''}`}
        >
          {isDeleted ? (
            <span className="text-sm">This message was deleted</span>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Meta: time, edited, status */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-xs text-silver-400">{formatTime(message.createdAt)}</span>
          {message.isEdited && (
            <span className="text-xs text-silver-400">(edited)</span>
          )}
          {isOwn && !isDeleted && <MessageStatus status={message.clientStatus} />}
        </div>
      </div>
    </div>
  );
}
